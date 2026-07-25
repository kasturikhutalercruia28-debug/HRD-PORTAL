"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, Check } from "lucide-react";
import { getGithubToken } from "@/lib/clientGithubToken";

interface Club {
  id: string;
  name: string;
}
interface Dcm {
  id: string;
  name: string;
  title: string;
  avenue: { id: string; name: string };
}
interface InstallationRecord {
  id: string;
  clubName: string;
  date: string;
  attendeeDcmIds: string[];
  createdAt: string;
}

export default function InstallationsPage() {
  const [clubs, setClubs] = useState<Club[]>([]);
  const [dcms, setDcms] = useState<Dcm[]>([]);
  const [records, setRecords] = useState<InstallationRecord[]>([]);
  const [clubName, setClubName] = useState("");
  const [date, setDate] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  async function loadAll() {
    setLoading(true);
    const [clubsRes, dcmsRes, recordsRes] = await Promise.all([
      fetch("/api/hrd/orientations/clubs"),
      fetch("/api/hrd/dcms"),
      fetch("/api/hrd/criteria/installations"),
    ]);
    setClubs(await clubsRes.json());
    setDcms((await dcmsRes.json()).dcms ?? []);
    setRecords(await recordsRes.json());
    setLoading(false);
  }

  useEffect(() => {
    loadAll();
  }, []);

  function toggleDcm(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess(false);
    if (!clubName || !date || selected.size === 0) {
      setError("Select a club, date, and at least one DCM.");
      return;
    }
    const token = getGithubToken();
    if (!token) {
      setError("Set up your GitHub token first from the DCM Criteria home page.");
      return;
    }
    setSaving(true);
    const res = await fetch("/api/hrd/criteria/installations", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-hrd-github-token": token },
      body: JSON.stringify({ clubName, date, attendeeDcmIds: Array.from(selected) }),
    });
    setSaving(false);
    if (res.ok) {
      setSuccess(true);
      setClubName("");
      setDate("");
      setSelected(new Set());
      loadAll();
    } else {
      const data = await res.json();
      setError(data.error ?? "Failed to save");
    }
  }

  const dcmsByAvenue = dcms.reduce<Record<string, Dcm[]>>((acc, d) => {
    (acc[d.avenue.name] ??= []).push(d);
    return acc;
  }, {});

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-3xl mx-auto space-y-6">
      <Link href="/hrd/criteria" className="inline-flex items-center gap-1.5 text-sm text-[#180F04]/50 hover:text-[#180F04] transition-colors">
        <ArrowLeft size={14} /> Back to Criteria
      </Link>

      <div>
        <h1 className="font-['Fraunces'] text-2xl font-bold text-[#180F04]">Installations</h1>
        <p className="text-[#180F04]/60 text-sm mt-1">Mark which DCMs attended a club's installation.</p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-black/5 p-5 space-y-4">
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-[#180F04] mb-1.5">Club</label>
            <select
              value={clubName}
              onChange={(e) => setClubName(e.target.value)}
              className="w-full border border-black/15 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:border-[#D4A017]"
            >
              <option value="">Select a club…</option>
              {clubs.map((c) => (
                <option key={c.id} value={c.name}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#180F04] mb-1.5">Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full border border-black/15 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:border-[#D4A017]"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-[#180F04] mb-2">
            DCMs Present ({selected.size} selected)
          </label>
          {loading ? (
            <p className="text-xs text-[#180F04]/40">Loading DCMs…</p>
          ) : (
            <div className="max-h-80 overflow-y-auto border border-black/10 rounded-lg divide-y divide-black/5">
              {Object.entries(dcmsByAvenue).map(([avenueName, list]) => (
                <div key={avenueName} className="p-3">
                  <p className="text-[10px] font-semibold text-[#180F04]/40 uppercase tracking-wide mb-1.5">
                    {avenueName}
                  </p>
                  <div className="grid sm:grid-cols-2 gap-1">
                    {list.map((d) => (
                      <label
                        key={d.id}
                        className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-[#FBF7EE] cursor-pointer text-sm"
                      >
                        <input
                          type="checkbox"
                          checked={selected.has(d.id)}
                          onChange={() => toggleDcm(d.id)}
                          className="w-4 h-4 rounded accent-[#D4A017]"
                        />
                        <span className="text-[#180F04]">{d.name}</span>
                        <span className="text-[#180F04]/40 text-xs">({d.title})</span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {error && <p className="text-red-500 text-xs">{error}</p>}
        {success && (
          <p className="text-emerald-600 text-xs flex items-center gap-1">
            <Check size={12} /> Saved — should show up immediately.
          </p>
        )}

        <button
          type="submit"
          disabled={saving}
          className="bg-[#D4A017] text-[#180F04] px-4 py-2 rounded-lg text-sm font-semibold hover:bg-[#b8860b] transition-colors disabled:opacity-50 flex items-center gap-2"
        >
          {saving && <Loader2 size={14} className="animate-spin" />}
          {saving ? "Saving…" : "Mark Attendance"}
        </button>
      </form>

      <div className="bg-white rounded-xl border border-black/5 overflow-hidden">
        <div className="px-5 py-3 border-b border-black/5">
          <p className="text-xs font-semibold text-[#180F04]">Past Records ({records.length})</p>
        </div>
        {records.length === 0 ? (
          <p className="px-5 py-6 text-xs text-[#180F04]/40 text-center">No installations recorded yet.</p>
        ) : (
          <div className="divide-y divide-black/5">
            {records.map((r) => (
              <div key={r.id} className="px-5 py-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-[#180F04]">{r.clubName}</p>
                  <p className="text-xs text-[#180F04]/40">{new Date(r.date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</p>
                </div>
                <span className="text-xs text-[#180F04]/50">{r.attendeeDcmIds.length} DCM{r.attendeeDcmIds.length !== 1 ? "s" : ""}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
