"use client";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Bell, Download, Share, X } from "lucide-react";

type BIPEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

const SNOOZE_KEY = "sync-pwa-snooze";
const SNOOZE_MS = 7 * 24 * 60 * 60 * 1000;

function b64ToUint8(b64: string) {
  const pad = "=".repeat((4 - (b64.length % 4)) % 4);
  const raw = atob((b64 + pad).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

export default function PwaSetup() {
  const { status } = useSession();
  const [installEvt, setInstallEvt] = useState<BIPEvent | null>(null);
  const [standalone, setStandalone] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [pushState, setPushState] = useState<"unknown" | "unsupported" | "off" | "on" | "denied">("unknown");
  const [snoozed, setSnoozed] = useState(true);
  const [showIosHelp, setShowIosHelp] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    try {
      const t = Number(localStorage.getItem(SNOOZE_KEY) || 0);
      setSnoozed(Date.now() - t < SNOOZE_MS);
    } catch { setSnoozed(false); }

    const ua = navigator.userAgent;
    setIsIos(/iPad|iPhone|iPod/.test(ua) || (ua.includes("Mac") && "ontouchend" in document));
    setStandalone(
      window.matchMedia("(display-mode: standalone)").matches ||
        (navigator as unknown as { standalone?: boolean }).standalone === true
    );

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }

    const onBip = (e: Event) => { e.preventDefault(); setInstallEvt(e as BIPEvent); };
    const onInstalled = () => { setInstallEvt(null); setStandalone(true); };
    window.addEventListener("beforeinstallprompt", onBip);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBip);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  useEffect(() => {
    if (status !== "authenticated") return;
    if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
      setPushState("unsupported");
      return;
    }
    if (Notification.permission === "denied") { setPushState("denied"); return; }
    navigator.serviceWorker.ready
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => {
        if (sub && Notification.permission === "granted") {
          // refresh server record silently (covers re-login on same device)
          fetch("/api/push/subscribe", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(sub.toJSON()),
          }).catch(() => {});
          setPushState("on");
        } else setPushState("off");
      })
      .catch(() => setPushState("unsupported"));
  }, [status]);

  function snooze() {
    try { localStorage.setItem(SNOOZE_KEY, String(Date.now())); } catch {}
    setSnoozed(true);
  }

  async function install() {
    if (!installEvt) return;
    await installEvt.prompt();
    await installEvt.userChoice.catch(() => {});
    setInstallEvt(null);
  }

  async function enablePush() {
    setBusy(true);
    try {
      const perm = await Notification.requestPermission();
      if (perm !== "granted") { setPushState(perm === "denied" ? "denied" : "off"); return; }
      const { key } = await fetch("/api/push/key").then((r) => r.json());
      if (!key) { alert("Notifications abhi server pe set nahi hain (VAPID keys missing)."); return; }
      const reg = await navigator.serviceWorker.ready;
      const sub =
        (await reg.pushManager.getSubscription()) ??
        (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64ToUint8(key) }));
      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sub.toJSON()),
      });
      setPushState(res.ok ? "on" : "off");
    } catch {
      setPushState("off");
    } finally {
      setBusy(false);
    }
  }

  if (status !== "authenticated") return null;

  const btn = "text-xs font-semibold px-3 py-1.5 rounded-lg bg-[#D4A017] text-[#180F04] hover:bg-[#b8860b] transition-colors inline-flex items-center gap-1.5 disabled:opacity-50";
  let content: React.ReactNode = null;

  if (!standalone && installEvt && !snoozed) {
    content = (
      <>
        <p className="text-sm flex-1">SYNC ko app ki tarah install karo — home screen se seedha khulega.</p>
        <button onClick={install} className={btn}><Download size={13} /> Install</button>
      </>
    );
  } else if (!standalone && isIos && !snoozed) {
    content = showIosHelp ? (
      <p className="text-sm flex-1 leading-relaxed">
        Safari me neeche <Share size={13} className="inline -mt-0.5" /> <b>Share</b> dabao → <b>Add to Home Screen</b> → <b>Add</b>.
        Phir home screen wale SYNC icon se kholo.
      </p>
    ) : (
      <>
        <p className="text-sm flex-1">iPhone pe SYNC install karke notifications paao.</p>
        <button onClick={() => setShowIosHelp(true)} className={btn}>Kaise?</button>
      </>
    );
  } else if (pushState === "off") {
    content = (
      <>
        <p className="text-sm flex-1">Naye updates ke notifications is device pe chahiye?</p>
        <button onClick={enablePush} disabled={busy} className={btn}><Bell size={13} /> Enable</button>
      </>
    );
  }

  if (!content) return null;
  const dismissible = pushState !== "off" || installEvt || isIos;

  return (
    <div className="fixed bottom-3 left-3 right-3 sm:left-auto sm:right-4 sm:max-w-sm z-[60] bg-[#180F04] text-white rounded-xl shadow-lg border border-[#D4A017]/30 px-4 py-3 flex items-center gap-3">
      {content}
      {dismissible && (
        <button onClick={snooze} className="text-white/40 hover:text-white" aria-label="Dismiss"><X size={15} /></button>
      )}
    </div>
  );
}
