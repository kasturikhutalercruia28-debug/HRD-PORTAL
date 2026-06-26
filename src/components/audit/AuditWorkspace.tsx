"use client";

import { useState, useCallback } from "react";
import { CheckCircle, ChevronDown } from "lucide-react";

type MonthlyScores = Record<string, number | null>;

type ExistingAudit = {
  id: string;
  adjustment: number;
  remarks: string;
  finalScore: number;
  finalPercentage: number;
  performanceCategory: string;
};

type DCMData = {
  dcmId: string;
  name: string;
  title: string;
  avenueId: string;
  avenueName: string;
  monthlyScores: MonthlyScores;
  monthsAvailable: number;
  quarterlyAvg: number;
  existingAudit: ExistingAudit | null;
};

type Avenue = { id: string; name: string };

type Props = {
  quarter: number;
  year: number;
  quarterMonths: number[];
  quarterMonthNames: string[];
  dcmData: DCMData[];
  avenues: Avenue[];
  totalDCMs: number;
  auditedCount: number;
};

type RowState = {
  adjustment: number;
  remarks: string;
  status: "pending" | "submitting" | "submitted" | "error";
  errorMsg?: string;
  finalScore?: number;
  finalPercentage?: number;
  performanceCategory?: string;
};

function getCategory(pct: number): string {
  if (pct >= 75) return "elite";
  if (pct >= 50) return "performing";
  return "underperforming";
}

function computeLive(quarterlyAvg: number, adjustment: number) {
  const finalScore = Math.min(Math.max(quarterlyAvg + adjustment, 0), 35);
  const finalPercentage = (finalScore / 35) * 100;
  const category = getCategory(finalPercentage);
  return { finalScore, finalPercentage, category };
}

function CategoryBadge({ category }: { category: string }) {
  const cls =
    category === "elite"
      ? "bg-[#AAFF47]/20 text-[#0D0D0B] border-[#AAFF47]/40"
      : category === "performing"
      ? "bg-amber-100 text-amber-800 border-amber-200"
      : "bg-red-100 text-red-700 border-red-200";
  return (
    <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded border font-['Geist'] tracking-wide ${cls}`}>
      {category}
    </span>
  );
}

export default function AuditWorkspace({
  quarter,
  year,
  quarterMonths,
  quarterMonthNames,
  dcmData,
  avenues,
  totalDCMs,
  auditedCount: initialAuditedCount,
}: Props) {
  const initRows = useCallback((): Record<string, RowState> => {
    const map: Record<string, RowState> = {};
    dcmData.forEach((dcm) => {
      if (dcm.existingAudit) {
        map[dcm.dcmId] = {
          adjustment: dcm.existingAudit.adjustment,
          remarks: dcm.existingAudit.remarks,
          status: "submitted",
          finalScore: dcm.existingAudit.finalScore,
          finalPercentage: dcm.existingAudit.finalPercentage,
          performanceCategory: dcm.existingAudit.performanceCategory,
        };
      } else {
        map[dcm.dcmId] = { adjustment: 0, remarks: "", status: "pending" };
      }
    });
    return map;
  }, [dcmData]);

  const [rows, setRows] = useState<Record<string, RowState>>(initRows);
  const [avenueFilter, setAvenueFilter] = useState<string>("all");
  const [auditedCount, setAuditedCount] = useState(initialAuditedCount);

  const filteredDCMs =
    avenueFilter === "all"
      ? dcmData
      : dcmData.filter((d) => d.avenueId === avenueFilter);

  const updateRow = (dcmId: string, patch: Partial<RowState>) => {
    setRows((prev) => ({ ...prev, [dcmId]: { ...prev[dcmId], ...patch } }));
  };

  const handleSubmit = async (dcm: DCMData) => {
    const row = rows[dcm.dcmId];
    if (!row.remarks.trim()) {
      updateRow(dcm.dcmId, { errorMsg: "Remarks are required." });
      return;
    }

    updateRow(dcm.dcmId, { status: "submitting", errorMsg: undefined });

    try {
      const res = await fetch("/api/audit/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dcmId: dcm.dcmId,
          quarter,
          year,
          adjustment: row.adjustment,
          remarks: row.remarks.trim(),
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        updateRow(dcm.dcmId, {
          status: "error",
          errorMsg: data.error ?? "Submission failed.",
        });
        return;
      }

      const data = await res.json();
      const wasNewSubmit = rows[dcm.dcmId].status !== "submitted";
      updateRow(dcm.dcmId, {
        status: "submitted",
        finalScore: data.finalScore,
        finalPercentage: data.finalPercentage,
        performanceCategory: data.performanceCategory,
        errorMsg: undefined,
      });
      if (wasNewSubmit) setAuditedCount((c) => c + 1);
    } catch {
      updateRow(dcm.dcmId, { status: "error", errorMsg: "Network error. Try again." });
    }
  };

  const progressPct = totalDCMs > 0 ? Math.round((auditedCount / totalDCMs) * 100) : 0;

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-[#F0EDE5]">
      {/* Header */}
      <div className="bg-white border-b border-black/5 px-6 py-4 flex-shrink-0">
        <div className="flex items-center justify-between gap-4 mb-3">
          <h1 className="font-['Fraunces'] text-xl font-bold text-[#0D0D0B]">
            Q{quarter} {year} Audit
          </h1>
          <span className="text-sm text-[#0D0D0B]/60 font-['Geist']">
            {quarterMonthNames.join(", ")}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex-1 h-2 bg-black/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-[#AAFF47] rounded-full transition-all"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <span className="text-sm font-semibold text-[#0D0D0B] font-['Geist'] flex-shrink-0">
            {auditedCount}/{totalDCMs} DCMs audited
          </span>
        </div>
      </div>

      {/* Filter bar */}
      <div className="bg-white border-b border-black/5 px-6 py-3 flex-shrink-0 flex items-center gap-3">
        <span className="text-xs text-[#0D0D0B]/50 font-['Geist'] uppercase tracking-wide">
          Avenue
        </span>
        <div className="relative">
          <select
            value={avenueFilter}
            onChange={(e) => setAvenueFilter(e.target.value)}
            className="appearance-none bg-[#F0EDE5] border border-black/10 rounded-lg px-3 py-1.5 pr-7 text-sm font-['Geist'] text-[#0D0D0B] focus:outline-none focus:ring-2 focus:ring-[#AAFF47]/50"
          >
            <option value="all">All Avenues</option>
            {avenues.map((av) => (
              <option key={av.id} value={av.id}>
                {av.name}
              </option>
            ))}
          </select>
          <ChevronDown size={13} className="absolute right-2 top-1/2 -translate-y-1/2 text-[#0D0D0B]/40 pointer-events-none" />
        </div>
        <span className="text-xs text-[#0D0D0B]/40 font-['Geist'] ml-auto">
          {filteredDCMs.length} DCMs shown
        </span>
      </div>

      {/* Scrollable table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full text-sm font-['Geist'] min-w-[1100px]">
          <thead className="sticky top-0 z-10">
            <tr className="bg-[#0D0D0B] text-white/60">
              <th className="text-left px-4 py-3 text-xs uppercase tracking-wide font-medium whitespace-nowrap">
                Name
              </th>
              <th className="text-left px-3 py-3 text-xs uppercase tracking-wide font-medium whitespace-nowrap">
                Avenue
              </th>
              {quarterMonthNames.map((name, i) => (
                <th key={i} className="text-center px-3 py-3 text-xs uppercase tracking-wide font-medium whitespace-nowrap">
                  {name.slice(0, 3)}
                </th>
              ))}
              <th className="text-center px-3 py-3 text-xs uppercase tracking-wide font-medium whitespace-nowrap">
                Q Avg
              </th>
              <th className="text-center px-3 py-3 text-xs uppercase tracking-wide font-medium whitespace-nowrap">
                Adj
              </th>
              <th className="text-left px-3 py-3 text-xs uppercase tracking-wide font-medium">
                Remarks
              </th>
              <th className="text-center px-3 py-3 text-xs uppercase tracking-wide font-medium whitespace-nowrap">
                Live Score
              </th>
              <th className="text-center px-3 py-3 text-xs uppercase tracking-wide font-medium whitespace-nowrap">
                Action
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredDCMs.map((dcm, idx) => {
              const row = rows[dcm.dcmId];
              const isSubmitted = row.status === "submitted";
              const isSubmitting = row.status === "submitting";
              const live = computeLive(dcm.quarterlyAvg, row.adjustment);

              return (
                <tr
                  key={dcm.dcmId}
                  className={`border-b border-black/5 transition-colors ${
                    isSubmitted
                      ? "bg-[#AAFF47]/5"
                      : idx % 2 === 0
                      ? "bg-white"
                      : "bg-[#F0EDE5]/30"
                  } hover:bg-[#AAFF47]/5`}
                >
                  {/* Name + title */}
                  <td className="px-4 py-3 whitespace-nowrap">
                    <p className="font-semibold text-[#0D0D0B] text-sm">{dcm.name}</p>
                    <p className="text-[#0D0D0B]/40 text-xs">{dcm.title}</p>
                  </td>

                  {/* Avenue */}
                  <td className="px-3 py-3 whitespace-nowrap">
                    <span className="text-xs text-[#0D0D0B]/60 bg-black/5 px-2 py-0.5 rounded">
                      {dcm.avenueName}
                    </span>
                  </td>

                  {/* Monthly scores */}
                  {quarterMonths.map((month) => {
                    const score = dcm.monthlyScores[String(month)];
                    return (
                      <td key={month} className="px-3 py-3 text-center whitespace-nowrap">
                        {score !== null && score !== undefined ? (
                          <span className="font-semibold text-[#0D0D0B]">{score}</span>
                        ) : (
                          <span className="text-[#0D0D0B]/25">—</span>
                        )}
                      </td>
                    );
                  })}

                  {/* Q Avg */}
                  <td className="px-3 py-3 text-center whitespace-nowrap">
                    <span className="font-semibold text-[#0D0D0B]">
                      {dcm.monthsAvailable > 0 ? dcm.quarterlyAvg.toFixed(1) : "—"}
                    </span>
                    {dcm.monthsAvailable < 3 && dcm.monthsAvailable > 0 && (
                      <span className="ml-1 text-[9px] text-amber-600 bg-amber-100 px-1 py-0.5 rounded">
                        {dcm.monthsAvailable}/3
                      </span>
                    )}
                  </td>

                  {/* Adjustment */}
                  <td className="px-3 py-3 text-center whitespace-nowrap">
                    {isSubmitted ? (
                      <span className="font-semibold text-[#0D0D0B]">
                        {row.adjustment > 0 ? "+" : ""}{row.adjustment}
                      </span>
                    ) : (
                      <div className="flex items-center justify-center gap-0.5">
                        {[-2, -1, 0, 1, 2].map((adj) => (
                          <button
                            key={adj}
                            onClick={() => updateRow(dcm.dcmId, { adjustment: adj })}
                            disabled={isSubmitting}
                            className={`w-7 h-7 rounded text-xs font-bold transition-colors ${
                              row.adjustment === adj
                                ? "bg-[#0D0D0B] text-[#AAFF47]"
                                : "bg-black/5 text-[#0D0D0B]/60 hover:bg-black/10"
                            }`}
                          >
                            {adj > 0 ? `+${adj}` : adj}
                          </button>
                        ))}
                      </div>
                    )}
                  </td>

                  {/* Remarks */}
                  <td className="px-3 py-3 min-w-[180px]">
                    {isSubmitted ? (
                      <p className="text-[#0D0D0B]/60 text-xs italic line-clamp-2">
                        {row.remarks}
                      </p>
                    ) : (
                      <div>
                        <textarea
                          value={row.remarks}
                          onChange={(e) =>
                            updateRow(dcm.dcmId, { remarks: e.target.value, errorMsg: undefined })
                          }
                          disabled={isSubmitting}
                          placeholder="Required..."
                          rows={2}
                          className={`w-full text-xs px-2 py-1.5 border rounded resize-none font-['Geist'] text-[#0D0D0B] placeholder-[#0D0D0B]/25 focus:outline-none focus:ring-2 focus:ring-[#AAFF47]/50 transition-colors ${
                            row.errorMsg
                              ? "border-red-300 bg-red-50"
                              : "border-black/10 bg-white"
                          }`}
                        />
                        {row.errorMsg && (
                          <p className="text-[10px] text-red-500 mt-0.5">{row.errorMsg}</p>
                        )}
                      </div>
                    )}
                  </td>

                  {/* Live score */}
                  <td className="px-3 py-3 text-center whitespace-nowrap">
                    {dcm.monthsAvailable > 0 ? (
                      <div className="space-y-0.5">
                        {isSubmitted && row.finalScore !== undefined ? (
                          <>
                            <p className="font-bold text-[#0D0D0B] text-sm">
                              {row.finalScore.toFixed(1)}
                            </p>
                            <p className="text-xs text-[#0D0D0B]/50">
                              {row.finalPercentage?.toFixed(1)}%
                            </p>
                            <CategoryBadge category={row.performanceCategory ?? ""} />
                          </>
                        ) : (
                          <>
                            <p className="font-bold text-[#0D0D0B] text-sm">
                              {live.finalScore.toFixed(1)}
                            </p>
                            <p className="text-xs text-[#0D0D0B]/50">
                              {live.finalPercentage.toFixed(1)}%
                            </p>
                            <CategoryBadge category={live.category} />
                          </>
                        )}
                      </div>
                    ) : (
                      <span className="text-[#0D0D0B]/25 text-xs">No data</span>
                    )}
                  </td>

                  {/* Action */}
                  <td className="px-3 py-3 text-center whitespace-nowrap">
                    {isSubmitted ? (
                      <CheckCircle size={18} className="text-[#AAFF47] mx-auto" />
                    ) : (
                      <button
                        onClick={() => handleSubmit(dcm)}
                        disabled={isSubmitting || dcm.monthsAvailable === 0}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                          isSubmitting || dcm.monthsAvailable === 0
                            ? "bg-black/10 text-[#0D0D0B]/30 cursor-not-allowed"
                            : "bg-[#0D0D0B] text-[#AAFF47] hover:bg-[#0D0D0B]/80"
                        }`}
                      >
                        {isSubmitting ? "Saving..." : "Submit"}
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}

            {filteredDCMs.length === 0 && (
              <tr>
                <td
                  colSpan={6 + quarterMonths.length}
                  className="px-6 py-12 text-center text-[#0D0D0B]/40 font-['Geist']"
                >
                  No DCMs found for this filter.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
