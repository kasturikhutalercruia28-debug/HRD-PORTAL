"use client";
import { useEffect, useState } from "react";
import { Download, Plus, Loader2, Pencil, Trash2, X, ChevronDown, ChevronUp } from "lucide-react";
import { getGithubToken } from "@/lib/clientGithubToken";

type Stage = "pres_sec" | "core" | "bod" | "everyone";

interface MeetingLog {
  id: string;
  date: string | null;
  isRevertAwaited: boolean;
  mode: "online" | "offline" | null;
  meetingWith: string;
  takenBy: string;
  discussion: string;
}

interface ProgressEntry {
  id: string;
  clubName: string;
  stage: Stage;
  status: "in_progress" | "completed";
  meetings: MeetingLog[];
  createdAt: string;
  updatedAt: string;
}

interface Club {
  id: string;
  name: string;
}

const STAGE_LABELS: Record<Stage, string> = {
  pres_sec: "Pres/Sec",
  core: "Core",
  bod: "BOD",
  everyone: "Everyone",
};
const STAGE_ORDER: Stage[] = ["pres_sec", "core", "bod", "everyone"];

function emptyMeeting(): MeetingLog {
  return { id: "", date: "", isRevertAwaited: false, mode: "online", meetingWith: "", takenBy: "", discussion: "" };
}

export default function OrientationProgressPage() {
  const [entries, setEntries] = useState<ProgressEntry[]>([]);
  const [clubs, setClubs] = useState<Club[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [expandedClub, setExpandedClub] = useState<string | null>(null);

  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formClub, setFormClub] = useState("");
  const [formStage, setFormStage] = useState<Stage>("pres_sec");
  const [formStatus, setFormStatus] = useState<"in_progress" | "completed">("in_progress");
  const [formMeetings, setFormMeetings] = useState<MeetingLog[]>([emptyMeeting()]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function loadAll() {
    setLoading(true);
    const [entriesRes, clubsRes] = await Promise.all([
      fetch("/api/hrd/orientation-progress"),
      fetch("/api/hrd/orientations/clubs"),
    ]);
    setEntries(await entriesRes.json());
    setClubs(await clubsRes.json());
    setLoading(false);
  }

  useEffect(() => {
    loadAll();
  }, []);

  function openAddModal() {
    setEditingId(null);
    setFormClub("");
    setFormStage("pres_sec");
    setFormStatus("in_progress");
    setFormMeetings([emptyMeeting()]);
    setError("");
    setShowModal(true);
  }

  function openEditModal(e: ProgressEntry) {
    setEditingId(e.id);
    setFormClub(e.clubName);
    setFormStage(e.stage);
    setFormStatus(e.status);
    setFormMeetings(e.meetings.length > 0 ? e.meetings.map((m) => ({ ...m, date: m.date ? m.date.slice(0, 10) : "" })) : [emptyMeeting()]);
    setError("");
    setShowModal(true);
  }

  function updateMeeting(idx: number, field: keyof MeetingLog, val: string | boolean) {
    setFormMeetings((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: val };
      return next;
    });
  }

  function addMeetingRow() {
    setFormMeetings((prev) => [...prev, emptyMeeting()]);
  }

  function removeMeetingRow(idx: number) {
    setFormMeetings((prev) => prev.filter((_, i) => i !== idx));
  }

  async function handleSave() {
    setError("");
    if (!formClub.trim()) {
      setError("Select a club.");
      return;
    }
    const token = getGithubToken();
    if (!token) {
      setError("Set up your GitHub token first from the DCM Criteria home page.");
      return;
    }
    setSaving(true);
    const payload = {
      clubName: formClub.trim(),
      stage: formStage,
      status: formStatus,
      meetings: formMeetings
        .filter((m) => m.isRevertAwaited || m.date || m.meetingWith || m.takenBy || m.discussion)
        .map((m) => ({ ...m, date: m.isRevertAwaited ? null : m.date || null })),
    };
    const url = editingId ? `/api/hrd/orientation-progress/${editingId}` : "/api/hrd/orientation-progress";
    const res = await fetch(url, {
      method: editingId ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json", "x-hrd-github-token": token },
      body: JSON.stringify(payload),
    });
    setSaving(false);
    if (res.ok) {
      setShowModal(false);
      loadAll();
    } else {
      const d = await res.json();
      setError(d.error ?? "Failed to save");
    }
  }

  async function handleDelete(id: string) {
    const token = getGithubToken();
    if (!token) {
      alert("Set up your GitHub token first from the DCM Criteria home page.");
      return;
    }
    if (!confirm("Delete this record?")) return;
    setDeletingId(id);
    const res = await fetch(`/api/hrd/orientation-progress/${id}`, {
      method: "DELETE",
      headers: { "x-hrd-github-token": token },
    });
    setDeletingId(null);
    if (res.ok) loadAll();
    else {
      const d = await res.json();
      alert(d.error ?? "Failed to delete");
    }
  }

  async function handleExport() {
    setExporting(true);
    const res = await fetch("/api/hrd/orientation-progress/export");
    setExporting(false);
    if (!res.ok) {
      alert("Export failed");
      return;
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "orientation-progress-tracking.xlsx";
    a.click();
    URL.revokeObjectURL(url);
  }

  const byClub = entries.reduce<Record<string, ProgressEntry[]>>((acc, e) => {
    (acc[e.clubName] ??= []).push(e);
    return acc;
  }, {});
  Object.values(byClub).forEach((list) => list.sort((a, b) => STAGE_ORDER.indexOf(a.stage) - STAGE_ORDER.indexOf(b.stage)));

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-['Fraunces'] text-2xl font-bold text-[#180F04]">Orientation Progress Tracking</h1>
          <p className="text-[#180F04]/60 text-sm mt-1">Log Pres/Sec, Core, BOD & Everyone orientation calls per club.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={openAddModal} className="flex items-center gap-1.5 bg-[#D4A017] text-[#180F04] px-3 py-2 rounded-lg text-xs font-semibold hover:bg-[#b8860b] transition-colors">
            <Plus size={13} /> Add Past Record
          </button>
          <button onClick={handleExport} disabled={exporting} className="flex items-center gap-1.5 border border-black/15 text-[#180F04] px-3 py-2 rounded-lg text-xs font-semibold hover:bg-black/5 transition-colors disabled:opacity-50">
            {exporting ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
            Download Excel
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 size={22} className="animate-spin text-[#180F04]/30" /></div>
      ) : Object.keys(byClub).length === 0 ? (
        <div className="bg-white rounded-xl border border-black/5 px-5 py-10 text-center text-sm text-[#180F04]/40">
          No records yet. Click "Add Past Record" to log a club's orientation call.
        </div>
      ) : (
        <div className="space-y-3">
          {Object.entries(byClub).map(([clubName, list]) => (
            <div key={clubName} className="bg-white rounded-xl border border-black/5 overflow-hidden">
              <button
                onClick={() => setExpandedClub(expandedClub === clubName ? null : clubName)}
                className="w-full flex items-center justify-between px-5 py-3 hover:bg-[#FBF7EE]/40 transition-colors"
              >
                <span className="font-semibold text-sm text-[#180F04]">{clubName}</span>
                <div className="flex items-center gap-2">
                  {STAGE_ORDER.map((s) => {
                    const e = list.find((x) => x.stage === s);
                    if (!e) return null;
                    return (
                      <span key={s} className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${e.status === "completed" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                        {STAGE_LABELS[s]}
                      </span>
                    );
                  })}
                  {expandedClub === clubName ? <ChevronUp size={15} className="text-[#180F04]/40" /> : <ChevronDown size={15} className="text-[#180F04]/40" />}
                </div>
              </button>
              {expandedClub === clubName && (
                <div className="border-t border-black/5 divide-y divide-black/5">
                  {list.map((e) => (
                    <div key={e.id} className="px-5 py-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${e.status === "completed" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                          {STAGE_LABELS[e.stage]} · {e.status === "completed" ? "Completed" : "In Progress"}
                        </span>
                        <div className="flex items-center gap-1">
                          <button onClick={() => openEditModal(e)} className="p-1 text-[#180F04]/40 hover:text-[#D4A017]"><Pencil size={13} /></button>
                          <button onClick={() => handleDelete(e.id)} disabled={deletingId === e.id} className="p-1 text-[#180F04]/40 hover:text-red-500">
                            {deletingId === e.id ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                          </button>
                        </div>
                      </div>
                      {e.meetings.length === 0 ? (
                        <p className="text-xs text-[#180F04]/30">No meetings logged</p>
                      ) : (
                        <div className="space-y-1.5">
                          {e.meetings.map((m, i) => (
                            <div key={m.id || i} className="text-xs text-[#180F04]/60 bg-[#FBF7EE] rounded-lg p-2">
                              <p className="font-medium text-[#180F04]">
                                Meeting {i + 1}: {m.isRevertAwaited ? "Revert Awaited" : `${m.date ? new Date(m.date).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : "TBD"} [${m.mode}]`}
                              </p>
                              {!m.isRevertAwaited && (m.meetingWith || m.takenBy) && (
                                <p>With: {m.meetingWith || "—"} · Taken by: {m.takenBy || "—"}</p>
                              )}
                              {!m.isRevertAwaited && m.discussion && <p className="mt-0.5">{m.discussion}</p>}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg my-8">
            <div className="flex items-center justify-between px-6 py-4 border-b border-black/5">
              <h2 className="font-['Fraunces'] font-bold text-[#180F04] text-lg">{editingId ? "Edit Record" : "Add Past Record"}</h2>
              <button onClick={() => setShowModal(false)} className="text-[#180F04]/30 hover:text-[#180F04]"><X size={18} /></button>
            </div>
            <div className="px-6 py-5 space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#180F04] mb-1.5">Club</label>
                  <input
                    list="progress-clubs-list"
                    value={formClub}
                    onChange={(e) => setFormClub(e.target.value)}
                    placeholder="Type club name…"
                    className="w-full border border-black/15 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:border-[#D4A017]"
                  />
                  <datalist id="progress-clubs-list">
                    {clubs.map((c) => <option key={c.id} value={c.name} />)}
                  </datalist>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#180F04] mb-1.5">Stage</label>
                  <select value={formStage} onChange={(e) => setFormStage(e.target.value as Stage)} className="w-full border border-black/15 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:border-[#D4A017]">
                    {STAGE_ORDER.map((s) => <option key={s} value={s}>{STAGE_LABELS[s]}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#180F04] mb-1.5">Overall Status</label>
                <div className="flex gap-2">
                  {(["in_progress", "completed"] as const).map((s) => (
                    <button key={s} type="button" onClick={() => setFormStatus(s)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold border ${formStatus === s ? "bg-[#180F04] text-[#D4A017] border-[#180F04]" : "border-black/15 text-[#180F04]"}`}>
                      {s === "in_progress" ? "In Progress" : "Completed"}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <label className="block text-xs font-semibold text-[#180F04]">Meetings</label>
                {formMeetings.map((m, i) => (
                  <div key={i} className="border border-black/10 rounded-lg p-3 space-y-2 relative">
                    {formMeetings.length > 1 && (
                      <button onClick={() => removeMeetingRow(i)} className="absolute top-2 right-2 text-[#180F04]/30 hover:text-red-500">
                        <X size={13} />
                      </button>
                    )}
                    <label className="flex items-center gap-2 text-xs">
                      <input type="checkbox" checked={m.isRevertAwaited} onChange={(e) => updateMeeting(i, "isRevertAwaited", e.target.checked)} className="accent-[#D4A017]" />
                      Revert Awaited (no date yet)
                    </label>
                    {!m.isRevertAwaited && (
                      <>
                        <div className="grid grid-cols-2 gap-2">
                          <input type="date" value={m.date ?? ""} onChange={(e) => updateMeeting(i, "date", e.target.value)} className="border border-black/15 rounded-md px-2 py-1.5 text-xs" />
                          <select value={m.mode ?? "online"} onChange={(e) => updateMeeting(i, "mode", e.target.value)} className="border border-black/15 rounded-md px-2 py-1.5 text-xs bg-white">
                            <option value="online">Online</option>
                            <option value="offline">Offline</option>
                          </select>
                        </div>
                        <input placeholder="Meeting with (e.g. PresSec and IPP)" value={m.meetingWith} onChange={(e) => updateMeeting(i, "meetingWith", e.target.value)} className="w-full border border-black/15 rounded-md px-2 py-1.5 text-xs" />
                        <input placeholder="Meeting taken by (e.g. Rtr. Malcolm Vakharia)" value={m.takenBy} onChange={(e) => updateMeeting(i, "takenBy", e.target.value)} className="w-full border border-black/15 rounded-md px-2 py-1.5 text-xs" />
                        <textarea placeholder="Discussion notes" value={m.discussion} onChange={(e) => updateMeeting(i, "discussion", e.target.value)} rows={2} className="w-full border border-black/15 rounded-md px-2 py-1.5 text-xs resize-none" />
                      </>
                    )}
                  </div>
                ))}
                <button onClick={addMeetingRow} className="text-xs text-[#D4A017] font-semibold flex items-center gap-1">
                  <Plus size={12} /> Add another meeting
                </button>
              </div>

              {error && <p className="text-red-500 text-xs">{error}</p>}
            </div>
            <div className="flex gap-3 px-6 py-4 border-t border-black/5">
              <button onClick={() => setShowModal(false)} className="flex-1 border border-black/15 rounded-lg py-2.5 text-sm text-[#180F04]/60 hover:bg-black/5">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="flex-1 bg-[#180F04] text-[#D4A017] rounded-lg py-2.5 text-sm font-semibold hover:bg-[#180F04]/80 disabled:opacity-50 flex items-center justify-center gap-2">
                {saving && <Loader2 size={14} className="animate-spin" />}
                {saving ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
