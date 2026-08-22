export const dynamic = 'force-dynamic';

import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { hasDrrAccess } from "@/lib/access";
import { getAllCriteriaData, computeDcmProgress } from "@/lib/criteria";

function pct(done: number, target: number) {
  return Math.min(100, Math.round((done / target) * 100));
}

export default async function DrrDcmCriteriaPage() {
  const session = await auth();
  if (!session || !hasDrrAccess(session.user as { role?: string; email?: string })) {
    redirect("/login");
  }

  const [dcms, criteriaData] = await Promise.all([
    prisma.dcm.findMany({
      where: { isActive: true },
      include: { avenue: { select: { id: true, name: true } } },
      orderBy: [{ avenue: { name: "asc" } }, { name: "asc" }],
    }),
    getAllCriteriaData(),
  ]);

  const rows = dcms.map((dcm) => {
    const progress = computeDcmProgress(dcm.id, criteriaData);
    const metrics = [progress.installations, progress.ocvs, progress.chairProjects, progress.coreProjects, progress.hodProjects];
    const completedCount = metrics.filter((m) => m.done >= m.target).length;
    const overallPct = Math.round((completedCount / metrics.length) * 100);
    return { dcm, progress, completedCount, overallPct };
  });

  const byAvenue = rows.reduce<Record<string, typeof rows>>((acc, r) => {
    (acc[r.dcm.avenue.name] ??= []).push(r);
    return acc;
  }, {});

  const districtAvg = rows.length > 0 ? Math.round(rows.reduce((s, r) => s + r.overallPct, 0) / rows.length) : 0;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="font-['Fraunces'] text-2xl font-bold text-[#180F04]">DCM Criteria — District Overview</h1>
        <p className="text-[#180F04]/60 text-sm mt-1">
          Installations, OCVs, and project participation across every avenue.
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white rounded-xl border border-black/5 p-3">
          <p className="text-2xl font-bold text-[#180F04]">{rows.length}</p>
          <p className="text-[10px] text-[#180F04]/50 font-medium">Active DCMs</p>
        </div>
        <div className="bg-white rounded-xl border border-black/5 p-3">
          <p className="text-2xl font-bold text-emerald-600">{rows.filter((r) => r.overallPct === 100).length}</p>
          <p className="text-[10px] text-[#180F04]/50 font-medium">Fully Complete</p>
        </div>
        <div className="bg-white rounded-xl border border-black/5 p-3">
          <p className="text-2xl font-bold text-amber-600">{rows.filter((r) => r.overallPct === 0).length}</p>
          <p className="text-[10px] text-[#180F04]/50 font-medium">Not Started</p>
        </div>
        <div className="bg-white rounded-xl border border-black/5 p-3">
          <p className="text-2xl font-bold text-[#D4A017]">{districtAvg}%</p>
          <p className="text-[10px] text-[#180F04]/50 font-medium">District Average</p>
        </div>
      </div>

      {Object.entries(byAvenue).map(([avenueName, avenueRows]) => (
        <div key={avenueName} className="bg-white rounded-xl border border-black/5 overflow-hidden">
          <div className="px-4 py-2.5 bg-[#FBF7EE] border-b border-black/5">
            <p className="text-xs font-semibold text-[#180F04]">{avenueName}</p>
          </div>
          <div className="divide-y divide-black/5">
            {avenueRows.map(({ dcm, progress, overallPct }) => (
              <div key={dcm.id} className="px-4 py-3">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="text-sm font-medium text-[#180F04]">{dcm.name}</p>
                    <p className="text-[10px] text-[#180F04]/40">{dcm.title}</p>
                  </div>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                    overallPct === 100 ? "bg-emerald-100 text-emerald-700" : overallPct === 0 ? "bg-black/5 text-[#180F04]/40" : "bg-amber-100 text-amber-700"
                  }`}>
                    {overallPct}%
                  </span>
                </div>
                <div className="grid grid-cols-5 gap-2">
                  {([
                    ["Install", progress.installations],
                    ["OCV", progress.ocvs],
                    ["Chair", progress.chairProjects],
                    ["Core", progress.coreProjects],
                    ["HoD", progress.hodProjects],
                  ] as const).map(([label, m]) => (
                    <div key={label}>
                      <p className="text-[9px] text-[#180F04]/40 font-medium">{label}</p>
                      <p className="text-xs font-semibold text-[#180F04]">{m.done}/{m.target}</p>
                      <div className="w-full h-1 bg-[#FBF7EE] rounded-full overflow-hidden mt-0.5">
                        <div
                          className={`h-full rounded-full ${m.done >= m.target ? "bg-emerald-500" : "bg-[#D4A017]"}`}
                          style={{ width: `${pct(m.done, m.target)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {rows.length === 0 && (
        <div className="bg-white rounded-xl border border-black/5 px-5 py-10 text-center text-sm text-[#180F04]/40">
          No active DCMs found.
        </div>
      )}
    </div>
  );
}
