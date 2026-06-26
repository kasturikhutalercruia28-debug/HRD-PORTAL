"use client";

import { useEffect, useState } from "react";
import { Calendar, AlertTriangle, Check, Loader2 } from "lucide-react";

const MONTH_NAMES = [
  { value: 1, label: "January" },
  { value: 2, label: "February" },
  { value: 3, label: "March" },
  { value: 4, label: "April" },
  { value: 5, label: "May" },
  { value: 6, label: "June" },
  { value: 7, label: "July" },
  { value: 8, label: "August" },
  { value: 9, label: "September" },
  { value: 10, label: "October" },
  { value: 11, label: "November" },
  { value: 12, label: "December" },
];

function getQuarterLabel(month: number): string {
  if (month >= 7 && month <= 9) return "Q1 (Jul–Sep)";
  if (month >= 10 && month <= 12) return "Q2 (Oct–Dec)";
  if (month >= 1 && month <= 3) return "Q3 (Jan–Mar)";
  return "Q4 (Apr–Jun)";
}

export default function ActiveMonthPage() {
  const [current, setCurrent] = useState<{ activeMonth: number; activeYear: number } | null>(
    null
  );
  const [month, setMonth] = useState(1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const fetchSettings = async () => {
    setLoading(true);
    const res = await fetch("/api/hrd/settings");
    const data = await res.json();
    if (data.settings) {
      setCurrent({ activeMonth: data.settings.activeMonth, activeYear: data.settings.activeYear });
      setMonth(data.settings.activeMonth);
      setYear(data.settings.activeYear);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess(false);

    if (!month || !year || year < 2020 || year > 2100) {
      setError("Enter a valid month and year (2020–2100).");
      return;
    }

    setSaving(true);
    const res = await fetch("/api/hrd/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ activeMonth: month, activeYear: year }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Failed to update settings.");
    } else {
      setCurrent({ activeMonth: month, activeYear: year });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    }
    setSaving(false);
  };

  const hasChanged =
    current && (current.activeMonth !== month || current.activeYear !== year);

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-2xl">
      <div>
        <h1 className="font-['Fraunces'] text-2xl font-bold text-[#0D0D0B]">Active Month</h1>
        <p className="text-[#0D0D0B]/50 text-sm mt-1 font-['Geist']">
          Controls which period DECs submit evaluations for
        </p>
      </div>

      {/* Current period card */}
      <div className="bg-[#0D0D0B] rounded-xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-[#AAFF47]/10 rounded-lg flex items-center justify-center">
            <Calendar size={18} className="text-[#AAFF47]" />
          </div>
          <div>
            <p className="text-white/40 text-xs uppercase tracking-wide font-['Geist']">
              Currently Active
            </p>
            <p className="text-white font-['Fraunces'] font-bold text-lg leading-tight">
              {loading ? (
                <span className="inline-block w-32 h-5 bg-white/10 rounded animate-pulse" />
              ) : current ? (
                `${MONTH_NAMES.find((m) => m.value === current.activeMonth)?.label} ${current.activeYear}`
              ) : (
                "Not set"
              )}
            </p>
          </div>
        </div>
        {current && !loading && (
          <div className="flex gap-4 mt-2">
            <div className="bg-white/5 rounded-lg px-3 py-2">
              <p className="text-white/30 text-xs font-['Geist']">Quarter</p>
              <p className="text-[#AAFF47] text-sm font-semibold font-['Geist']">
                {getQuarterLabel(current.activeMonth)}
              </p>
            </div>
            <div className="bg-white/5 rounded-lg px-3 py-2">
              <p className="text-white/30 text-xs font-['Geist']">Rotaract Year</p>
              <p className="text-[#AAFF47] text-sm font-semibold font-['Geist']">
                {current.activeMonth >= 7 ? current.activeYear : current.activeYear - 1}–
                {current.activeMonth >= 7 ? current.activeYear + 1 : current.activeYear}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Warning */}
      <div className="flex gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
        <AlertTriangle size={16} className="text-amber-500 flex-shrink-0 mt-0.5" />
        <p className="text-amber-700 text-sm font-['Geist']">
          Changing the active month will affect which period DECs can submit evaluations for.
          DECs will only see and submit evaluations for the active month/year. Existing
          evaluations for other periods are not affected.
        </p>
      </div>

      {/* Form */}
      <div className="bg-white rounded-xl border border-black/5 shadow-sm p-6">
        <h2 className="font-['Fraunces'] font-semibold text-[#0D0D0B] text-lg mb-5">
          Change Active Period
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#0D0D0B]/60 uppercase tracking-wide mb-1.5 font-['Geist']">
                Month
              </label>
              <select
                value={month}
                onChange={(e) => setMonth(Number(e.target.value))}
                className="w-full border border-black/10 rounded-lg px-3 py-2.5 text-sm font-['Geist'] text-[#0D0D0B] focus:outline-none focus:ring-2 focus:ring-[#AAFF47]/50 focus:border-[#AAFF47] bg-white"
              >
                {MONTH_NAMES.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#0D0D0B]/60 uppercase tracking-wide mb-1.5 font-['Geist']">
                Year
              </label>
              <input
                type="number"
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
                min={2020}
                max={2100}
                className="w-full border border-black/10 rounded-lg px-3 py-2.5 text-sm font-['Geist'] text-[#0D0D0B] focus:outline-none focus:ring-2 focus:ring-[#AAFF47]/50 focus:border-[#AAFF47]"
              />
            </div>
          </div>

          {/* Preview */}
          {!loading && (
            <div className="bg-[#F0EDE5] rounded-lg px-4 py-3">
              <p className="text-xs text-[#0D0D0B]/50 font-['Geist']">Preview</p>
              <p className="text-[#0D0D0B] font-semibold font-['Geist'] mt-0.5">
                {MONTH_NAMES.find((m) => m.value === month)?.label} {year}{" "}
                <span className="text-[#0D0D0B]/40 font-normal">
                  — {getQuarterLabel(month)}
                </span>
              </p>
            </div>
          )}

          {error && <p className="text-red-500 text-xs font-['Geist']">{error}</p>}

          {success && (
            <div className="flex items-center gap-2 text-emerald-600 text-sm font-['Geist']">
              <Check size={14} />
              Active period updated successfully.
            </div>
          )}

          <button
            type="submit"
            disabled={saving || !hasChanged}
            className="flex items-center gap-2 bg-[#0D0D0B] text-[#AAFF47] px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-[#0D0D0B]/80 transition-colors disabled:opacity-40 font-['Geist']"
          >
            {saving && <Loader2 size={14} className="animate-spin" />}
            {saving ? "Saving..." : "Update Active Period"}
          </button>
        </form>
      </div>
    </div>
  );
}
