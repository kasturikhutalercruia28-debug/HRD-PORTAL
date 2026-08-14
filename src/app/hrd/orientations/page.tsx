"use client";
import { useEffect, useState } from "react";
import {
  ChevronDown, ChevronUp, Loader2, Plus, Pencil, Trash2, X, Check,
  Clock, CalendarCheck, CheckCircle2, XCircle, Award, Download, Search,
} from "lucide-react";
import { getGithubToken } from "@/lib/clientGithubToken";

// ---------- Types ----------
type Stage = "pres_sec" | "core" | "bod" | "everyone";
type ReqType = "core_member" | "bod" | "everyone";
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
}

const REQ_TYPE_LABELS: Record<ReqType, string> = {
  core_member: "Core",
  bod: "BOD",
  everyone: "Everyone",
};
const STAGE_LABELS: Record<Stage, string> = {
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
function emptyMeeting(): MeetingLog {
  return { id: "", date: "", isRevertAwaited: false, mode: "online", meetingWith: "", takenBy: "", discussion: "" };
}


// ---------- Main Page ----------
export default function OrientationsOverviewPage() {
  const [clubs, setClubs] = useState<Club[]>([]);
  const [requests, setRequests] = useState<OrientationRequest[]>([]);
  const [progress, setProgress] = useState<ProgressEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "pending_pres_sec" | "pending_core" | "pending_bod" | "completed">("all");

  async function loadAll() {
    setLoading(true);
    const [clubsRes, reqRes, progRes] = await Promise.all([
      fetch("/api/hrd/orientations/clubs"),
      fetch("/api/hrd/orientations/requests"),
      fetch("/api/hrd/orientation-progress"),
    ]);
    setClubs(await clubsRes.json());
    setRequests(await reqRes.json());
    setProgress(await progRes.json());
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

  function computeCategory(clubId: string, clubName: string): "pending_pres_sec" | "pending_core" | "pending_bod" | "completed" {
    const presSec = progress.find((p) => p.clubName === clubName && p.stage === "pres_sec");
    const presSecDone = presSec?.status === "completed";
    const clubReqs = requests.filter((r) => r.clubId === clubId);
    const latestOf = (t: ReqType) => clubReqs.filter((r) => r.orientationType === t).sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))[0];
    const core = latestOf("core_member");
    const bod = latestOf("bod");
    const everyone = latestOf("everyone");
    const isDone = (r?: OrientationRequest) => !!r && ["conducted", "feedback_submitted", "certificate_generated"].includes(r.status);
    const hasActivity = (r?: OrientationRequest) => !!r; // any request at all, any status

    // Reflect actual furthest progress made — not strict gating. Gating only
    // controls what a club is ALLOWED to newly submit, not what's already happened.
    if (isDone(bod) || isDone(everyone)) return "completed";
    if (hasActivity(bod) || isDone(core)) return "pending_bod";
    if (hasActivity(core)) return "pending_core";
    if (presSecDone) return "pending_core";
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
    .filter((c) => filter === "all" || computeCategory(c.id, c.name) === filter);

  const categoryCounts = { pending_pres_sec: 0, pending_core: 0, pending_bod: 0, completed: 0 };
  clubs.forEach((c) => { categoryCounts[computeCategory(c.id, c.name)]++; });

  const pendingApprovals = requests.filter((r) => r.status === "requested");
  const upcomingScheduled = requests
    .filter((r) => r.status === "scheduled")
    .sort((a, b) => (a.scheduledDate ?? "") < (b.scheduledDate ?? "") ? -1 : 1);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-['Fraunces'] text-2xl font-bold text-[#180F04]">Orientations</h1>
          <p className="text-[#180F04]/60 text-sm mt-1">Every club, every stage — Pres/Sec, Core, BOD & Everyone — in one place.</p>
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
              <button key={r.id} onClick={() => setExpanded(r.clubId)} className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-[#FBF7EE]/40 text-left">
                <span className="text-xs text-[#180F04]">
                  <span className="font-semibold">{r.club.name}</span> requested {REQ_TYPE_LABELS[r.orientationType]} orientation
                </span>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">Needs Approval</span>
              </button>
            ))}
            {upcomingScheduled.map((r) => (
              <button key={r.id} onClick={() => setExpanded(r.clubId)} className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-[#FBF7EE]/40 text-left">
                <span className="text-xs text-[#180F04]">
                  <span className="font-semibold">{r.club.name}</span> — {REQ_TYPE_LABELS[r.orientationType]} scheduled {fmtDate(r.scheduledDate)}
                </span>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">{r.scheduledTime}</span>
              </button>
            ))}
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
            <ClubCard
              key={club.id}
              club={club}
              requests={requests.filter((r) => r.clubId === club.id)}
              progressEntry={progress.find((p) => p.clubName === club.name && p.stage === "pres_sec") ?? null}
              expanded={expanded === club.id}
              onToggle={() => setExpanded(expanded === club.id ? null : club.id)}
              reload={loadAll}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ---------- Club Card ----------
function ClubCard({
  club, requests, progressEntry, expanded, onToggle, reload,
}: {
  club: Club;
  requests: OrientationRequest[];
  progressEntry: ProgressEntry | null;
  expanded: boolean;
  onToggle: () => void;
  reload: () => void;
}) {
  const byType = (t: ReqType) => requests.filter((r) => r.orientationType === t).sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));

  return (
    <div className="bg-white rounded-xl border border-black/5 overflow-hidden">
      <button onClick={onToggle} className="w-full flex items-center justify-between px-5 py-3 hover:bg-[#FBF7EE]/40 transition-colors">
        <span className="font-semibold text-sm text-[#180F04]">{club.name}</span>
        <div className="flex items-center gap-1.5">
          <StageBadge label="Pres/Sec" status={progressEntry?.status} />
          <StageBadge label="Core" status={byType("core_member")[0]?.status} isRequest />
          <StageBadge label="BOD" status={byType("bod")[0]?.status} isRequest />
          <StageBadge label="Everyone" status={byType("everyone")[0]?.status} isRequest />
          {expanded ? <ChevronUp size={15} className="text-[#180F04]/40 ml-1" /> : <ChevronDown size={15} className="text-[#180F04]/40 ml-1" />}
        </div>
      </button>

      {expanded && (
        <div className="border-t border-black/5 divide-y divide-black/5">
          <PresSecSection clubName={club.name} entry={progressEntry} reload={reload} />
          <RequestSection label="Core" type="core_member" requests={byType("core_member")} club={club} reload={reload} />
          <RequestSection label="BOD" type="bod" requests={byType("bod")} club={club} reload={reload} />
          <RequestSection label="Everyone" type="everyone" requests={byType("everyone")} club={club} reload={reload} />
        </div>
      )}
    </div>
  );
}

function StageBadge({ label, status, isRequest }: { label: string; status?: string; isRequest?: boolean }) {
  if (!status) {
    return <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-black/5 text-[#180F04]/30">{label}</span>;
  }
  const cfg = isRequest ? STATUS_CONFIG[status] : status === "completed"
    ? { label: "Completed", color: "bg-emerald-100 text-emerald-700", icon: CheckCircle2 }
    : { label: "In Progress", color: "bg-amber-100 text-amber-700", icon: Clock };
  if (!cfg) return null;
  return <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${cfg.color}`}>{label}</span>;
}

// ---------- Pres/Sec Section (call-log tracking) ----------
function PresSecSection({ clubName, entry, reload }: { clubName: string; entry: ProgressEntry | null; reload: () => void }) {
  const [showForm, setShowForm] = useState(false);
  const [meetings, setMeetings] = useState<MeetingLog[]>(entry?.meetings.length ? entry.meetings.map(m => ({...m, date: m.date ? m.date.slice(0,10) : ""})) : [emptyMeeting()]);
  const [status, setStatus] = useState<"in_progress" | "completed">(entry?.status ?? "in_progress");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [deleting, setDeleting] = useState(false);

  function updateMeeting(idx: number, field: keyof MeetingLog, val: string | boolean) {
    setMeetings((prev) => { const next = [...prev]; next[idx] = { ...next[idx], [field]: val }; return next; });
  }

  async function handleSave() {
    setError("");
    const token = getGithubToken();
    if (!token) { setError("Set up your GitHub token first (below)."); return; }
    setSaving(true);
    const payload = {
      clubName, stage: "pres_sec", status,
      meetings: meetings
        .filter((m) => m.date)
        .map((m) => ({ ...m, date: m.date || null, isRevertAwaited: false, meetingWith: "", takenBy: "", discussion: "" })),
    };
    const url = entry ? `/api/hrd/orientation-progress/${entry.id}` : "/api/hrd/orientation-progress";
    const res = await fetch(url, {
      method: entry ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json", "x-hrd-github-token": token },
      body: JSON.stringify(payload),
    });
    setSaving(false);
    if (res.ok) { setShowForm(false); reload(); }
    else { const d = await res.json(); setError(d.error ?? "Failed to save"); }
  }

  async function handleDelete() {
    if (!entry) return;
    const token = getGithubToken();
    if (!token) { alert("Set up your GitHub token first."); return; }
    if (!confirm("Delete Pres/Sec record?")) return;
    setDeleting(true);
    const res = await fetch(`/api/hrd/orientation-progress/${entry.id}`, { method: "DELETE", headers: { "x-hrd-github-token": token } });
    setDeleting(false);
    if (res.ok) reload(); else alert("Failed to delete");
  }

  return (
    <div className="px-5 py-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-[#180F04]">Pres/Sec</span>
        <div className="flex items-center gap-1">
          {entry && <Pencil size={13} className="text-[#180F04]/40 hover:text-[#D4A017] cursor-pointer" onClick={() => setShowForm(true)} />}
          {!entry && (
            <button onClick={() => setShowForm(true)} className="text-xs text-[#D4A017] font-semibold flex items-center gap-1">
              <Plus size={12} /> Log a meeting
            </button>
          )}
          {entry && (
            <button onClick={handleDelete} disabled={deleting} className="text-[#180F04]/40 hover:text-red-500">
              {deleting ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
            </button>
          )}
        </div>
      </div>

      {entry && !showForm && (
        <div className="space-y-1.5">
          {entry.meetings.length === 0 ? (
            <p className="text-xs text-[#180F04]/30">No meetings logged</p>
          ) : entry.meetings.map((m, i) => (
            <div key={m.id || i} className="text-xs text-[#180F04]/60 bg-[#FBF7EE] rounded-lg p-2">
              <p className="font-medium text-[#180F04]">
                Meeting {i + 1}: {fmtDate(m.date)} [{m.mode}]
              </p>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <div className="space-y-3 bg-[#FBF7EE] rounded-lg p-3">
          <div className="flex gap-2">
            {(["in_progress", "completed"] as const).map((s) => (
              <button key={s} type="button" onClick={() => setStatus(s)}
                className={`px-3 py-1 rounded-md text-xs font-semibold border ${status === s ? "bg-[#180F04] text-[#D4A017] border-[#180F04]" : "border-black/15 text-[#180F04] bg-white"}`}>
                {s === "in_progress" ? "In Progress" : "Completed"}
              </button>
            ))}
          </div>
          {meetings.map((m, i) => (
            <div key={i} className="border border-black/10 rounded-lg p-2.5 space-y-1.5 relative bg-white">
              {meetings.length > 1 && (
                <button onClick={() => setMeetings((prev) => prev.filter((_, idx) => idx !== i))} className="absolute top-1.5 right-1.5 text-[#180F04]/30 hover:text-red-500">
                  <X size={12} />
                </button>
              )}
              <div className="grid grid-cols-2 gap-1.5">
                <input type="date" value={m.date ?? ""} onChange={(e) => updateMeeting(i, "date", e.target.value)} className="border border-black/15 rounded px-2 py-1 text-xs" />
                <select value={m.mode ?? "online"} onChange={(e) => updateMeeting(i, "mode", e.target.value)} className="border border-black/15 rounded px-2 py-1 text-xs bg-white">
                  <option value="online">Online</option>
                  <option value="offline">Offline</option>
                </select>
              </div>
            </div>
          ))}
          <button onClick={() => setMeetings((prev) => [...prev, emptyMeeting()])} className="text-xs text-[#D4A017] font-semibold flex items-center gap-1">
            <Plus size={11} /> Add another meeting
          </button>
          {error && <p className="text-red-500 text-xs">{error}</p>}
          <div className="flex gap-2">
            <button onClick={() => setShowForm(false)} className="flex-1 border border-black/15 rounded-md py-1.5 text-xs text-[#180F04]/60">Cancel</button>
            <button onClick={handleSave} disabled={saving} className="flex-1 bg-[#180F04] text-[#D4A017] rounded-md py-1.5 text-xs font-semibold flex items-center justify-center gap-1.5">
              {saving && <Loader2 size={12} className="animate-spin" />} Save
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------- Request Section (Core/BOD/Everyone — approve/schedule/conduct) ----------
function RequestSection({ label, type, requests, club, reload }: { label: string; type: ReqType; requests: OrientationRequest[]; club: Club; reload: () => void }) {
  const latest = requests[0];
  const canCertify = type === "bod" || type === "everyone";
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
