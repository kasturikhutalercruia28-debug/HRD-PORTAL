"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown, CheckCircle2, Circle, type LucideIcon, MessageCircleWarning } from "lucide-react";

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

  const attended = entries.filter((e) => e.attended).sort((a, b) => (a.date < b.date ? 1 : -1));
  const notAttended = entries.filter((e) => !e.attended).sort((a, b) => (a.date < b.date ? 1 : -1));

  const complaintHref = `/dcm/complaints/new?subject=${encodeURIComponent(
    `Attendance not marked — ${label}`
  )}&description=${encodeURIComponent(
    `I believe my attendance is missing or incorrect under "${label}". Details:\n\n`
  )}`;

  return (
    <div
      className={`relative rounded-2xl border overflow-hidden transition-all ${
        complete
          ? "bg-emerald-50/50 border-emerald-200/80"
          : "bg-white border-black/5 hover:border-[#D4A017]/40"
      } ${open ? "shadow-md" : "shadow-sm"}`}
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
              className={`text-[#180F04]/35 transition-transform duration-300 ${open ? "rotate-180" : ""}`}
            />
          </div>
        </div>
        <p className="text-xs font-medium text-[#180F04]/60 mb-1.5">{label}</p>
        <div className="flex items-end justify-between mb-2">
          <span
            className={`font-['Fraunces'] text-2xl font-semibold leading-none ${
              complete ? "text-emerald-600" : "text-[#180F04]"
            }`}
          >
            {done}
            <span className="text-xs font-sans font-medium text-[#180F04]/35"> / {target}</span>
          </span>
        </div>
        <div className="w-full h-1.5 bg-[#FBF7EE] rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-700 ${
              complete ? "bg-emerald-500" : "bg-[#D4A017]"
            }`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </button>

      <div
        className={`grid transition-all duration-300 ease-out ${
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        }`}
      >
        <div className="overflow-hidden">
          <div className="border-t border-black/5 px-4 py-3.5">
            {entries.length === 0 ? (
              <p className="text-xs text-[#180F04]/40 py-1">Nothing recorded yet.</p>
            ) : (
              <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
                {attended.length > 0 && (
                  <div className="space-y-1.5">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-600/80">
                      Marked for you · {attended.length}
                    </p>
                    {attended.map((e) => (
                      <div key={e.id} className="flex items-start gap-2 text-xs">
                        <CheckCircle2 size={13} className="text-emerald-500 shrink-0 mt-0.5" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[#180F04] font-medium">
                            {e.title}
                            {e.subtitle ? ` · ${e.subtitle}` : ""}
                          </p>
                          <p className="text-[#180F04]/35">{fmtDate(e.date)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {notAttended.length > 0 && (
                  <div className="space-y-1.5">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-[#180F04]/30">
                      Not marked for you · {notAttended.length}
                    </p>
                    {notAttended.map((e) => (
                      <div key={e.id} className="flex items-start gap-2 text-xs">
                        <Circle size={13} className="text-[#180F04]/20 shrink-0 mt-0.5" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[#180F04]/45">
                            {e.title}
                            {e.subtitle ? ` · ${e.subtitle}` : ""}
                          </p>
                          <p className="text-[#180F04]/30">{fmtDate(e.date)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <Link
              href={complaintHref}
              className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-[#D4A017] hover:text-[#b8860b] transition-colors"
            >
              <MessageCircleWarning size={13} />
              Attendance missing or wrong? Raise a complaint
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CriteriaGrid({ stats }: { stats: CriteriaStat[] }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
      {stats.map((s) => (
        <CriteriaTile key={s.key} stat={s} />
      ))}
    </div>
  );
}
