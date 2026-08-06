"use client";

import { useState } from "react";
import { ChevronDown, CheckCircle2, XCircle, type LucideIcon } from "lucide-react";

export interface CriteriaEntry {
  id: string;
  title: string;
  subtitle?: string;
  date: string; // ISO date, may be empty
  attended: boolean;
}

export interface CriteriaStat {
  key: string;
  label: string;
  icon: LucideIcon;
  done: number;
  target: number;
  entries: CriteriaEntry[];
}

function fmtDate(d: string) {
  if (!d) return "—";
  const parsed = new Date(d);
  if (isNaN(parsed.getTime())) return "—";
  return parsed.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function CriteriaTile({ stat }: { stat: CriteriaStat }) {
  const [open, setOpen] = useState(false);
  const { label, done, target, icon: Icon, entries } = stat;
  const pct = Math.min(100, Math.round((done / target) * 100));
  const complete = done >= target;

  // Newest first so recent activity is easy to spot.
  const sorted = [...entries].sort((a, b) => (a.date < b.date ? 1 : -1));

  return (
    <div
      className={`relative rounded-xl border transition-colors ${
        complete ? "bg-emerald-50/60 border-emerald-200" : "bg-[#FBF7EE]/60 border-black/5"
      }`}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full text-left p-4"
        aria-expanded={open}
      >
        <div className="flex items-start justify-between mb-3">
          <div
            className={`w-9 h-9 rounded-lg flex items-center justify-center ${
              complete ? "bg-emerald-500/15" : "bg-[#D4A017]/15"
            }`}
          >
            <Icon size={17} className={complete ? "text-emerald-600" : "text-[#D4A017]"} />
          </div>
          <div className="flex items-center gap-1.5">
            {complete && <CheckCircle2 size={18} className="text-emerald-500" />}
            <ChevronDown
              size={16}
              className={`text-[#180F04]/40 transition-transform ${open ? "rotate-180" : ""}`}
            />
          </div>
        </div>
        <p className="text-xs font-medium text-[#180F04]/70 mb-1.5">{label}</p>
        <div className="flex items-end justify-between mb-2">
          <span className={`text-xl font-bold ${complete ? "text-emerald-600" : "text-[#180F04]"}`}>
            {done}
            <span className="text-xs font-medium text-[#180F04]/40"> / {target}</span>
          </span>
        </div>
        <div className="w-full h-1.5 bg-white rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-700 ${
              complete ? "bg-emerald-500" : "bg-[#D4A017]"
            }`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </button>

      {open && (
        <div className="border-t border-black/5 px-4 py-3">
          {sorted.length === 0 ? (
            <p className="text-xs text-[#180F04]/40 py-1">Nothing recorded yet.</p>
          ) : (
            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {sorted.map((e) => (
                <div key={e.id} className="flex items-start gap-2 text-xs">
                  {e.attended ? (
                    <CheckCircle2 size={14} className="text-emerald-500 shrink-0 mt-0.5" />
                  ) : (
                    <XCircle size={14} className="text-[#180F04]/25 shrink-0 mt-0.5" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p
                      className={`truncate ${
                        e.attended ? "text-[#180F04] font-medium" : "text-[#180F04]/40"
                      }`}
                    >
                      {e.title}
                      {e.subtitle ? ` · ${e.subtitle}` : ""}
                    </p>
                    <p className="text-[#180F04]/35">{fmtDate(e.date)}</p>
                  </div>
                  {!e.attended && (
                    <span className="text-[#180F04]/30 shrink-0">not marked</span>
                  )}
                </div>
              ))}
            </div>
          )}
          <p className="text-[10px] text-[#180F04]/35 mt-2.5">
            See something marked wrong? Raise it via Complaints.
          </p>
        </div>
      )}
    </div>
  );
}

export default function CriteriaGrid({ stats }: { stats: CriteriaStat[] }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {stats.map((s) => (
        <CriteriaTile key={s.key} stat={s} />
      ))}
    </div>
  );
}
