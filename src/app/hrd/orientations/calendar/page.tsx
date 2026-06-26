"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Plus, X, Loader2, Lock } from "lucide-react";

interface BlockedDate {
  id: string;
  date: string;
  timePeriod: "morning" | "afternoon" | "evening";
  label?: string;
  isManual: boolean;
}

const TIME_PERIODS: { value: "morning" | "afternoon" | "evening"; label: string }[] = [
  { value: "morning", label: "Morning" },
  { value: "afternoon", label: "Afternoon" },
  { value: "evening", label: "Evening" },
];

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export default function HRDCalendarPage() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [blocked, setBlocked] = useState<BlockedDate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showBlockForm, setShowBlockForm] = useState(false);
  const [blockForm, setBlockForm] = useState({ date: "", timePeriod: "morning" as BlockedDate["timePeriod"], label: "" });
  const [saving, setSaving] = useState(false);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  async function fetchBlocked(y: number, m: number) {
    setLoading(true);
    const res = await fetch(`/api/hrd/orientations/calendar?year=${y}&month=${m}`);
    if (res.ok) setBlocked(await res.json());
    setLoading(false);
  }

  useEffect(() => { fetchBlocked(year, month); }, [year, month]);

  function prevMonth() {
    if (month === 1) { setYear(y => y - 1); setMonth(12); }
    else setMonth(m => m - 1);
    setSelectedDay(null);
  }

  function nextMonth() {
    if (month === 12) { setYear(y => y + 1); setMonth(1); }
    else setMonth(m => m + 1);
    setSelectedDay(null);
  }

  async function handleBlock(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    await fetch("/api/hrd/orientations/calendar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(blockForm),
    });
    setSaving(false);
    setShowBlockForm(false);
    setBlockForm({ date: "", timePeriod: "morning", label: "" });
    fetchBlocked(year, month);
  }

  async function handleUnblock(id: string) {
    await fetch(`/api/hrd/orientations/calendar/${id}`, { method: "DELETE" });
    fetchBlocked(year, month);
  }

  const daysInMonth = new Date(year, month, 0).getDate();
  const firstDay = new Date(year, month - 1, 1).getDay();

  function getBlockedForDay(day: number) {
    const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return blocked.filter((b) => b.date.startsWith(dateStr));
  }

  const selectedDayBlocked = selectedDay ? getBlockedForDay(selectedDay) : [];
  const today = new Date();

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-['Fraunces'] text-2xl font-bold text-[#0D0D0B]">Calendar</h1>
          <p className="text-[#0D0D0B]/60 text-sm mt-1 font-['Geist']">
            Blocked orientation dates
          </p>
        </div>
        <button
          onClick={() => setShowBlockForm(!showBlockForm)}
          className="flex items-center gap-2 px-4 py-2 bg-[#0D0D0B] text-[#AAFF47] rounded-lg text-sm font-semibold font-['Geist'] hover:bg-[#0D0D0B]/80 transition-colors"
        >
          <Plus size={14} />
          Block Date
        </button>
      </div>

      {showBlockForm && (
        <form
          onSubmit={handleBlock}
          className="bg-white rounded-xl border border-black/5 shadow-sm p-5 space-y-4"
        >
          <h2 className="font-['Fraunces'] font-semibold text-[#0D0D0B]">Block a Date</h2>
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <label className="block text-xs text-[#0D0D0B]/50 mb-1 font-['Geist']">Date</label>
              <input
                required
                type="date"
                value={blockForm.date}
                onChange={(e) => setBlockForm({ ...blockForm, date: e.target.value })}
                className="w-full border border-black/10 rounded-lg px-3 py-2 text-sm font-['Geist'] focus:outline-none focus:ring-2 focus:ring-[#AAFF47]"
              />
            </div>
            <div>
              <label className="block text-xs text-[#0D0D0B]/50 mb-1 font-['Geist']">Time Period</label>
              <select
                value={blockForm.timePeriod}
                onChange={(e) => setBlockForm({ ...blockForm, timePeriod: e.target.value as BlockedDate["timePeriod"] })}
                className="w-full border border-black/10 rounded-lg px-3 py-2 text-sm font-['Geist'] focus:outline-none focus:ring-2 focus:ring-[#AAFF47]"
              >
                {TIME_PERIODS.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-[#0D0D0B]/50 mb-1 font-['Geist']">Label (optional)</label>
              <input
                value={blockForm.label}
                onChange={(e) => setBlockForm({ ...blockForm, label: e.target.value })}
                className="w-full border border-black/10 rounded-lg px-3 py-2 text-sm font-['Geist'] focus:outline-none focus:ring-2 focus:ring-[#AAFF47]"
                placeholder="e.g. District event"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 bg-[#0D0D0B] text-[#AAFF47] rounded-lg text-sm font-semibold font-['Geist'] disabled:opacity-50"
            >
              {saving && <Loader2 size={13} className="animate-spin" />}
              Block
            </button>
            <button
              type="button"
              onClick={() => setShowBlockForm(false)}
              className="px-4 py-2 bg-black/5 text-[#0D0D0B] rounded-lg text-sm font-['Geist']"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Month navigator */}
      <div className="bg-white rounded-xl border border-black/5 shadow-sm p-5">
        <div className="flex items-center justify-between mb-5">
          <button onClick={prevMonth} className="p-1.5 rounded-lg hover:bg-black/5 transition-colors">
            <ChevronLeft size={18} />
          </button>
          <h2 className="font-['Fraunces'] font-bold text-[#0D0D0B] text-lg">
            {MONTH_NAMES[month - 1]} {year}
          </h2>
          <button onClick={nextMonth} className="p-1.5 rounded-lg hover:bg-black/5 transition-colors">
            <ChevronRight size={18} />
          </button>
        </div>

        {/* Day labels */}
        <div className="grid grid-cols-7 mb-2">
          {DAY_LABELS.map((d) => (
            <div key={d} className="text-center text-xs text-[#0D0D0B]/30 font-['Geist'] py-1">
              {d}
            </div>
          ))}
        </div>

        {/* Days grid */}
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: firstDay }).map((_, i) => <div key={`empty-${i}`} />)}
          {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
            const dayBlocked = getBlockedForDay(day);
            const isToday =
              today.getFullYear() === year &&
              today.getMonth() + 1 === month &&
              today.getDate() === day;
            const isSelected = selectedDay === day;
            return (
              <button
                key={day}
                onClick={() => setSelectedDay(isSelected ? null : day)}
                className={`
                  relative aspect-square rounded-lg flex flex-col items-center justify-center text-sm font-['Geist'] transition-colors
                  ${isSelected ? "bg-[#0D0D0B] text-[#AAFF47]" : isToday ? "bg-[#AAFF47]/20 text-[#0D0D0B]" : "hover:bg-black/5 text-[#0D0D0B]"}
                  ${dayBlocked.length > 0 ? "font-bold" : ""}
                `}
              >
                {day}
                {dayBlocked.length > 0 && (
                  <div className="flex gap-0.5 mt-0.5">
                    {dayBlocked.slice(0, 3).map((_, i) => (
                      <div
                        key={i}
                        className={`w-1 h-1 rounded-full ${isSelected ? "bg-[#AAFF47]" : "bg-red-400"}`}
                      />
                    ))}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected day detail */}
      {selectedDay !== null && (
        <div className="bg-white rounded-xl border border-black/5 shadow-sm p-5 space-y-3">
          <h2 className="font-['Fraunces'] font-semibold text-[#0D0D0B] text-sm">
            {MONTH_NAMES[month - 1]} {selectedDay}, {year}
          </h2>
          {loading ? (
            <Loader2 size={16} className="animate-spin text-[#0D0D0B]/30" />
          ) : selectedDayBlocked.length === 0 ? (
            <p className="text-[#0D0D0B]/40 text-sm font-['Geist']">No blocked slots.</p>
          ) : (
            <div className="space-y-2">
              {selectedDayBlocked.map((b) => (
                <div
                  key={b.id}
                  className="flex items-center justify-between gap-3 px-4 py-3 bg-red-50 rounded-xl"
                >
                  <div className="flex items-center gap-2">
                    <Lock size={13} className="text-red-400" />
                    <div>
                      <p className="text-sm font-semibold text-[#0D0D0B] font-['Geist'] capitalize">
                        {b.timePeriod}
                      </p>
                      {b.label && (
                        <p className="text-xs text-[#0D0D0B]/50 font-['Geist']">{b.label}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-['Geist'] text-[#0D0D0B]/40">
                      {b.isManual ? "Manual" : "Booked"}
                    </span>
                    {b.isManual && (
                      <button
                        onClick={() => handleUnblock(b.id)}
                        className="text-[#0D0D0B]/30 hover:text-red-500 transition-colors"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
