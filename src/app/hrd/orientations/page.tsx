"use client";
import { useEffect, useState } from "react";
import {
  ChevronDown, ChevronUp, Loader2, Check,
  Clock, CalendarCheck, CheckCircle2, XCircle, Award, Download, Search, X,
} from "lucide-react";
import { getEffectiveStage, type EffectiveStage } from "@/lib/orientationStage";

// ---------- Types ----------
type ReqType = "pres_sec" | "core_member" | "bod" | "everyone";
type TimePeriod = "morning" | "afternoon" | "evening";

interface Club { id: string; name: string; }

interface OrientationRequest {
  id: string;
  clubId: string;
  club: { id: string; name: string };
  orientationType: ReqType;
  status: string;
  expectedAttendance: number;
  preferredDate1: string; preferredTime1: TimePeriod;
  preferredDate2: string; preferredTime2: TimePeriod;
  preferredDate3: string; preferredTime3: TimePeriod;
  scheduledDate: string | null;
  scheduledTime: TimePeriod | null;
  rejectionReason: string | null;
  certificateGenerated: boolean;
  createdAt: string;
}

const STAGE_LABELS: Record<EffectiveStage, string> = {
  pres_sec: "Pres/Sec",
  core: "Core",
  bod: "BOD",
  everyone: "Everyone",
};
const STATUS_CONFIG: Record<string, { label: string; color: string; icon: typeof Clock }> = {
  requested: { label: "Pending Approval", color: "bg-amber-100 text-amber-700", icon: Clock },
  rejected: { label: "Rejected", color: "bg-red-100 text-red-700", icon: XCircle },
  scheduled: { label: "Scheduled", color: "bg-blue-100 text-blue-700", icon: CalendarCheck },
  conducted: { label: "Conducted", color: "bg-purple-100 text-purple-700", icon: CheckCircle2 },
  feedback_submitted: { label: "Feedback In", color: "bg-[#D4A017]/20 text-[#180F04]", icon: CheckCircle2 },
  certificate_generated: { label: "Certificate Issued", color: "bg-emerald-100 text-emerald-700", icon: Award },
};

function fmtDate(d: string | null) {
  return d ? new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—";
}


// ---------- Main Page ----------
export default function OrientationsOverviewPage() {
  const [clubs, setClubs] = useState<Club[]>([]);
  const [requests, setRequests] = useState<OrientationRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "pending_pres_sec" | "pending_core" | "pending_bod" | "completed">("all");
  const [showSummary, setShowSummary] = useState(false);

  async function loadAll() {
    setLoading(true);
    const [clubsRes, reqRes] = await Promise.all([
      fetch("/api/hrd/orientations/clubs"),
      fetch("/api/hrd/orientations/requests"),
    ]);
    setClubs(await clubsRes.json());
    setRequests(await reqRes.json());
    setLoading(false);
  }

  useEffect(() => { loadAll(); }, []);

  async function handleExport() {
    setExporting(true);
    const res = await fetch("/api/hrd/orientation-progress/export");
    setExporting(false);
    if (!res.ok) { alert("Export failed"); return; }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "orientation-progress-tracking.xlsx";
    a.click();
    URL.revokeObjectURL(url);
  }

  function computeCategory(clubId: string): "pending_pres_sec" | "pending_core" | "pending_bod" | "completed" {
    const clubReqs = requests.filter((r) => r.clubId === clubId);
    const latestOf = (stage: EffectiveStage) =>
      clubReqs.filter((r) => getEffectiveStage(r) === stage).sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))[0];
    const presSec = latestOf("pres_sec");
    const core = latestOf("core");
    const bod = latestOf("bod");
    const everyone = latestOf("everyone");
    const isDone = (r?: OrientationRequest) => !!r && ["conducted", "feedback_submitted", "certificate_generated"].includes(r.status);
    const hasActivity = (r?: OrientationRequest) => !!r;

    // Reflect actual furthest progress made — not strict gating. Gating only
    // controls what a club is ALLOWED to newly submit, not what's already happened.
    if (isDone(bod) || isDone(everyone)) return "completed";
    if (hasActivity(bod) || isDone(core)) return "pending_bod";
    if (hasActivity(core)) return "pending_core";
    if (isDone(presSec)) return "pending_core";
    return "pending_pres_sec";
  }

  const FILTER_LABELS: Record<string, string> = {
    all: "All Clubs",
    pending_pres_sec: "Pending Pres/Sec",
    pending_core: "Ready for Core",
    pending_bod: "Ready for BOD",
    completed: "Completed",
  };

  const visibleClubs = clubs
    .filter((c) => c.name.toLowerCase().includes(search.trim().toLowerCase()))
    .filter((c) => filter === "all" || computeCategory(c.id) === filter);

  const categoryCounts = { pending_pres_sec: 0, pending_core: 0, pending_bod: 0, completed: 0 };
  clubs.forEach((c) => { categoryCounts[computeCategory(c.id)]++; });

  const pendingApprovals = requests.filter((r) => r.status === "requested");
  const upcomingScheduled = requests
    .filter((r) => r.status === "scheduled")
    .sort((a, b) => (a.scheduledDate ?? "") < (b.scheduledDate ?? "") ? -1 : 1);

  const DONE = ["conducted", "feedback_submitted", "certificate_generated"];
  const doneCountByStage = (stage: EffectiveStage) =>
    new Set(requests.filter((r) => getEffectiveStage(r) === stage && DONE.includes(r.status)).map((r) => r.clubId)).size;
  const doneCounts = {
    pres_sec: doneCountByStage("pres_sec"),
    core: doneCountByStage("core"),
    bod: doneCountByStage("bod"),
    everyone: doneCountByStage("everyone"),
  };
  const totalDone = doneCounts.pres_sec + doneCounts.core + doneCounts.bod + doneCounts.everyone;

  function goToClub(clubId: string) {
    setFilter("all");
    setSearch("");
    setExpanded(clubId);
    setTimeout(() => {
      document.getElementById(`club-${clubId}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-['Fraunces'] text-2xl font-bold text-[#180F04]">Orientations</h1>
        </div>
        <div className="flex gap-2">
          <a href="/hrd/orientations/requests/new" className="flex items-center gap-1.5 bg-[#D4A017] text-[#180F04] px-3 py-2 rounded-lg text-xs font-semibold hover:bg-[#b8860b] transition-colors">
            + Add Past Orientation
          </a>
          <button onClick={handleExport} disabled={exporting} className="flex items-center gap-1.5 border border-black/15 text-[#180F04] px-3 py-2 rounded-lg text-xs font-semibold hover:bg-black/5 transition-colors disabled:opacity-50">
            {exporting ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
            Download Excel
          </button>
        </div>
      </div>

      {!loading && (
        <button
          onClick={() => setShowSummary(true)}
          className="w-full bg-gradient-to-r from-[#180F04] to-[#2a1a08] rounded-xl p-4 flex items-center justify-between text-left hover:opacity-95 transition-opacity"
        >
          <div>
            <p className="text-[10px] text-[#D4A017]/70 font-semibold uppercase tracking-wide">Total Orientations Done</p>
            <p className="text-3xl font-bold text-[#D4A017]">{totalDone}</p>
          </div>
          <span className="text-xs text-white/50">View breakdown →</span>
        </button>
      )}

      {!loading && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {([
            ["pending_pres_sec", "Pending Pres/Sec", "text-amber-600"],
            ["pending_core", "Ready for Core", "text-blue-600"],
            ["pending_bod", "Ready for BOD", "text-purple-600"],
            ["completed", "Completed", "text-emerald-600"],
          ] as const).map(([key, label, color]) => (
            <button key={key} onClick={() => setFilter(key)} className="bg-white rounded-xl border border-black/5 p-3 text-left hover:border-[#D4A017] transition-colors">
              <p className={`text-2xl font-bold ${color}`}>{categoryCounts[key]}</p>
              <p className="text-[10px] text-[#180F04]/50 font-medium">{label}</p>
            </button>
          ))}
        </div>
      )}

      {!loading && (pendingApprovals.length > 0 || upcomingScheduled.length > 0) && (
        <div className="bg-white rounded-xl border border-amber-200 overflow-hidden">
          <div className="px-4 py-2.5 bg-amber-50 border-b border-amber-100">
            <p className="text-xs font-semibold text-amber-800">Needs Your Attention</p>
          </div>
          <div className="divide-y divide-black/5">
            {pendingApprovals.map((r) => (
              <button key={r.id} onClick={() => goToClub(r.clubId)} className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-[#FBF7EE]/40 text-left">
                <span className="text-xs text-[#180F04]">
                  <span className="font-semibold">{r.club.name}</span> requested {STAGE_LABELS[getEffectiveStage(r)]} orientation
                </span>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">Needs Approval</span>
              </button>
            ))}
            {upcomingScheduled.map((r) => (
              <button key={r.id} onClick={() => goToClub(r.clubId)} className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-[#FBF7EE]/40 text-left">
                <span className="text-xs text-[#180F04]">
                  <span className="font-semibold">{r.club.name}</span> — {STAGE_LABELS[getEffectiveStage(r)]} scheduled {fmtDate(r.scheduledDate)}
                </span>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">{r.scheduledTime}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {showSummary && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm">
            <div className="flex items-center justify-between px-6 py-4 border-b border-black/5">
              <h2 className="font-['Fraunces'] font-bold text-[#180F04] text-lg">Orientations Breakdown</h2>
              <button onClick={() => setShowSummary(false)} className="text-[#180F04]/30 hover:text-[#180F04]"><X size={18} /></button>
            </div>
            <div className="px-6 py-5 space-y-3">
              {([
                ["Pres/Sec Done", doneCounts.pres_sec, "text-amber-600"],
                ["Core Done", doneCounts.core, "text-blue-600"],
                ["BOD Done", doneCounts.bod, "text-purple-600"],
                ["Everyone Done", doneCounts.everyone, "text-emerald-600"],
              ] as const).map(([label, count, color]) => (
                <div key={label} className="flex items-center justify-between py-1.5 border-b border-black/5 last:border-none">
                  <span className="text-sm text-[#180F04]">{label}</span>
                  <span className={`text-lg font-bold ${color}`}>{count}</span>
                </div>
              ))}
              <div className="flex items-center justify-between pt-2">
                <span className="text-sm font-semibold text-[#180F04]">Total</span>
                <span className="text-xl font-bold text-[#180F04]">{totalDone}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#180F04]/30" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search club by name…"
          className="w-full border border-black/10 rounded-lg pl-9 pr-3 py-2 text-sm bg-white focus:outline-none focus:border-[#D4A017]"
        />
      </div>

      <div className="flex gap-2 flex-wrap">
        {(["all", "pending_pres_sec", "pending_core", "pending_bod", "completed"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
              filter === f ? "bg-[#180F04] text-[#D4A017]" : "bg-white border border-black/10 text-[#180F04]/60 hover:bg-[#FBF7EE]"
            }`}
          >
            {FILTER_LABELS[f]}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 size={22} className="animate-spin text-[#180F04]/30" /></div>
      ) : visibleClubs.length === 0 ? (
        <div className="bg-white rounded-xl border border-black/5 px-5 py-10 text-center text-sm text-[#180F04]/40">
          No clubs match this search/filter.
        </div>
      ) : (
        <div className="space-y-3">
          {visibleClubs.map((club) => (
            <div id={`club-${club.id}`} key={club.id}>
              <ClubCard
                club={club}
                requests={requests.filter((r) => r.clubId === club.id)}
                expanded={expanded === club.id}
                onToggle={() => setExpanded(expanded === club.id ? null : club.id)}
                reload={loadAll}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------- Club Card ----------
function ClubCard({
  club, requests, expanded, onToggle, reload,
}: {
  club: Club;
  requests: OrientationRequest[];
  expanded: boolean;
  onToggle: () => void;
  reload: () => void;
}) {
  const byStage = (s: EffectiveStage) => requests.filter((r) => getEffectiveStage(r) === s).sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  const presSec = byStage("pres_sec");
  const core = byStage("core");
  const bod = byStage("bod");
  const everyone = byStage("everyone");

  return (
    <div className="bg-white rounded-xl border border-black/5 overflow-hidden">
      <button onClick={onToggle} className="w-full flex items-center justify-between px-5 py-3 hover:bg-[#FBF7EE]/40 transition-colors">
        <span className="font-semibold text-sm text-[#180F04]">{club.name}</span>
        <div className="flex items-center gap-1.5">
          <StageBadge label="Pres/Sec" status={presSec[0]?.status} />
          <StageBadge label="Core" status={core[0]?.status} />
          <StageBadge label="BOD" status={bod[0]?.status} />
          <StageBadge label="Everyone" status={everyone[0]?.status} />
          {expanded ? <ChevronUp size={15} className="text-[#180F04]/40 ml-1" /> : <ChevronDown size={15} className="text-[#180F04]/40 ml-1" />}
        </div>
      </button>

      {expanded && (
        <div className="border-t border-black/5 divide-y divide-black/5">
          <RequestSection label="Pres/Sec" stage="pres_sec" requests={presSec} reload={reload} />
          <RequestSection label="Core" stage="core" requests={core} reload={reload} />
          <RequestSection label="BOD" stage="bod" requests={bod} reload={reload} />
          <RequestSection label="Everyone" stage="everyone" requests={everyone} reload={reload} />
        </div>
      )}
    </div>
  );
}

function StageBadge({ label, status }: { label: string; status?: string }) {
  if (!status) {
    return <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-black/5 text-[#180F04]/30">{label}</span>;
  }
  const cfg = STATUS_CONFIG[status];
  if (!cfg) return null;
  return <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${cfg.color}`}>{label}</span>;
}

// ---------- Request Section (Pres/Sec, Core, BOD, Everyone — approve/schedule/conduct) ----------
function RequestSection({ label, stage, requests, reload }: { label: string; stage: EffectiveStage; requests: OrientationRequest[]; reload: () => void }) {
  const latest = requests[0];
  const canCertify = stage === "bod" || stage === "everyone";
  const [busy, setBusy] = useState(false);
  const [showSchedule, setShowSchedule] = useState(false);
  const [chosenDate, setChosenDate] = useState("");
  const [chosenTime, setChosenTime] = useState<TimePeriod>("morning");
  const [rejectReason, setRejectReason] = useState("");
  const [showReject, setShowReject] = useState(false);

  async function act(action: string, extra: Record<string, unknown> = {}) {
    if (!latest) return;
    setBusy(true);
    await fetch(`/api/hrd/orientations/requests/${latest.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, ...extra }),
    });
    setBusy(false);
    setShowSchedule(false);
    setShowReject(false);
    reload();
  }

  return (
    <div className="px-5 py-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-[#180F04]">{label}</span>
        {latest && (() => {
          const cfg = STATUS_CONFIG[latest.status];
          if (!cfg) return null;
          const Icon = cfg.icon;
          return (
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1 ${cfg.color}`}>
              <Icon size={9} /> {cfg.label}
            </span>
          );
        })()}
      </div>

      {!latest ? (
        <p className="text-xs text-[#180F04]/30">Not requested by club yet</p>
      ) : (
        <div className="space-y-2">
          <p className="text-xs text-[#180F04]/50">
            Attendance: {latest.expectedAttendance} · Requested {fmtDate(latest.createdAt)}{" "}
            <a href={`/hrd/orientations/requests/${latest.id}`} className="text-[#D4A017] underline">View full details</a>
          </p>

          {latest.status === "requested" && !showSchedule && !showReject && (
            <div className="flex gap-2">
              <button onClick={() => setShowSchedule(true)} className="text-xs bg-[#D4A017] text-[#180F04] px-3 py-1.5 rounded-md font-semibold">Approve & Schedule</button>
              <button onClick={() => setShowReject(true)} className="text-xs border border-black/15 text-[#180F04] px-3 py-1.5 rounded-md">Reject</button>
            </div>
          )}

          {showSchedule && (
            <div className="bg-[#FBF7EE] rounded-lg p-3 space-y-2">
              <p className="text-xs font-medium text-[#180F04]">Pick a preferred slot or set a custom one:</p>
              {[1, 2, 3].map((n) => {
                const d = latest[`preferredDate${n}` as keyof OrientationRequest] as string;
                const t = latest[`preferredTime${n}` as keyof OrientationRequest] as TimePeriod;
                return (
                  <button key={n} onClick={() => { setChosenDate(d.slice(0, 10)); setChosenTime(t); }}
                    className={`w-full text-left text-xs border rounded-md px-2 py-1.5 ${chosenDate === d.slice(0,10) && chosenTime === t ? "border-[#D4A017] bg-white" : "border-black/10 bg-white"}`}>
                    Preference {n}: {fmtDate(d)} — {t}
                  </button>
                );
              })}
              <div className="grid grid-cols-2 gap-2">
                <input type="date" value={chosenDate} onChange={(e) => setChosenDate(e.target.value)} className="border border-black/15 rounded px-2 py-1 text-xs" />
                <select value={chosenTime} onChange={(e) => setChosenTime(e.target.value as TimePeriod)} className="border border-black/15 rounded px-2 py-1 text-xs bg-white">
                  <option value="morning">Morning</option>
                  <option value="afternoon">Afternoon</option>
                  <option value="evening">Evening</option>
                </select>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setShowSchedule(false)} className="flex-1 border border-black/15 rounded-md py-1.5 text-xs text-[#180F04]/60">Cancel</button>
                <button onClick={() => act("approve", { scheduledDate: chosenDate, scheduledTime: chosenTime })} disabled={busy || !chosenDate} className="flex-1 bg-[#180F04] text-[#D4A017] rounded-md py-1.5 text-xs font-semibold flex items-center justify-center gap-1.5">
                  {busy && <Loader2 size={12} className="animate-spin" />} Confirm
                </button>
              </div>
            </div>
          )}

          {showReject && (
            <div className="bg-[#FBF7EE] rounded-lg p-3 space-y-2">
              <textarea placeholder="Reason (optional)" value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} rows={2} className="w-full border border-black/15 rounded px-2 py-1 text-xs resize-none" />
              <div className="flex gap-2">
                <button onClick={() => setShowReject(false)} className="flex-1 border border-black/15 rounded-md py-1.5 text-xs text-[#180F04]/60">Cancel</button>
                <button onClick={() => act("reject", { rejectionReason: rejectReason })} disabled={busy} className="flex-1 bg-red-600 text-white rounded-md py-1.5 text-xs font-semibold">Confirm Reject</button>
              </div>
            </div>
          )}

          {latest.status === "scheduled" && (
            <div className="flex items-center gap-2">
              <p className="text-xs text-[#180F04]/60">Scheduled: {fmtDate(latest.scheduledDate)} ({latest.scheduledTime})</p>
              <button onClick={() => act("mark_conducted")} disabled={busy} className="text-xs bg-[#D4A017] text-[#180F04] px-3 py-1 rounded-md font-semibold flex items-center gap-1">
                {busy && <Loader2 size={11} className="animate-spin" />} Mark Conducted
              </button>
            </div>
          )}

          {(latest.status === "conducted" || latest.status === "feedback_submitted" || latest.status === "certificate_generated") && (
            canCertify ? (
              <button onClick={() => act("toggle_certificate")} disabled={busy} className={`text-xs px-3 py-1 rounded-md font-semibold flex items-center gap-1 ${latest.certificateGenerated ? "bg-emerald-100 text-emerald-700" : "border border-black/15 text-[#180F04]"}`}>
                {busy && <Loader2 size={11} className="animate-spin" />}
                {latest.certificateGenerated ? <><Check size={11} /> Certificate Issued</> : "Generate Certificate"}
              </button>
            ) : (
              <p className="text-xs text-[#180F04]/40">Conducted — certificate is issued after BOD orientation completes.</p>
            )
          )}

          {latest.status === "rejected" && (
            <p className="text-xs text-red-500">Rejected{latest.rejectionReason ? `: ${latest.rejectionReason}` : ""}</p>
          )}
        </div>
      )}
    </div>
  );
}
