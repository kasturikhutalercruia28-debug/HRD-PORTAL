export const dynamic = 'force-dynamic';

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import Link from "next/link";
import {
  MessageCircleWarning,
  ClipboardList,
  Award,
} from "lucide-react";
import { getAllCriteriaData, computeDcmProgress } from "@/lib/criteria";
import CriteriaGrid, { type CriteriaEntry, type CriteriaStat } from "./CriteriaGrid";

type Stat = { done: number; target: number };

const CRITERIA_META = [
  { key: "installations", label: "Installations Attended" },
  { key: "ocvs", label: "OCVs Attended" },
  { key: "chairProjects", label: "Projects Chaired" },
  { key: "coreProjects", label: "Core Team Projects" },
  { key: "hodProjects", label: "HoD Projects" },
] as const;

function RadialProgress({ percent }: { percent: number }) {
  const size = 84;
  const stroke = 8;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percent / 100) * circumference;
  const complete = percent >= 100;

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#FBF7EE"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={complete ? "#10b981" : "#D4A017"}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-700 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-lg font-bold text-[#180F04] leading-none">{percent}%</span>
        <span className="text-[9px] text-[#180F04]/40 mt-0.5">overall</span>
      </div>
    </div>
  );
}

export default async function DcmDashboardPage() {
  const session = await auth();
  const userId = session?.user?.id;
  const dcmRecordId = (session?.user as { dcmRecordId?: string } | undefined)?.dcmRecordId;

  const [complaintCount, openForms] = await Promise.all([
    prisma.complaint.count({ where: { submittedBy: userId } }),
    prisma.eventFeedbackForm.count({ where: { isActive: true } }),
  ]);

  // Default to all-zero progress so the card is ALWAYS shown — even before
  // a dcmRecordId is linked, or if the GitHub data fetch fails.
  const emptyData: Awaited<ReturnType<typeof getAllCriteriaData>> = {
    installations: [],
    ocvs: [],
    projects: [],
  };
  const emptyProgress = computeDcmProgress("__none__", emptyData);
  let progress: ReturnType<typeof computeDcmProgress> = emptyProgress;
  let criteriaData: Awaited<ReturnType<typeof getAllCriteriaData>> = emptyData;
  if (dcmRecordId) {
    try {
      criteriaData = await getAllCriteriaData();
      progress = computeDcmProgress(dcmRecordId, criteriaData);
    } catch {
      progress = emptyProgress; // DB fetch failed unexpectedly — show zeros, not nothing
    }
  }

  const dcmId = dcmRecordId ?? "__none__";

  // Per-entry breakdown so a DCM can expand a tile and see exactly which
  // installation/OCV/project counted towards them, and which didn't — the
  // same source records HRD uses, just filtered/marked for this DCM.
  const entriesByKey: Record<(typeof CRITERIA_META)[number]["key"], CriteriaEntry[]> = {
    installations: criteriaData.installations.map((r) => ({
      id: r.id,
      title: r.clubName,
      date: r.date,
      attended: r.attendeeDcmIds.includes(dcmId),
    })),
    ocvs: criteriaData.ocvs.map((r) => ({
      id: r.id,
      title: r.clubName,
      date: r.date,
      attended: r.attendeeDcmIds.includes(dcmId),
    })),
    chairProjects: criteriaData.projects.map((p) => ({
      id: p.id,
      title: p.name,
      subtitle: p.avenue,
      date: p.date,
      attended: p.chairDcmIds.includes(dcmId),
    })),
    coreProjects: criteriaData.projects.map((p) => ({
      id: p.id,
      title: p.name,
      subtitle: p.avenue,
      date: p.date,
      attended: p.coreDcmIds.includes(dcmId),
    })),
    hodProjects: criteriaData.projects.map((p) => ({
      id: p.id,
      title: p.name,
      subtitle: p.avenue,
      date: p.date,
      attended: p.hodDcmIds.includes(dcmId),
    })),
  };

  const stats: CriteriaStat[] = CRITERIA_META.map((m) => ({
    ...m,
    ...(progress[m.key as keyof typeof progress] as Stat),
    entries: entriesByKey[m.key],
  }));
  const overallPct = Math.round(
    stats.reduce((sum, s) => sum + Math.min(100, (s.done / s.target) * 100), 0) / stats.length
  );
  const completedCount = stats.filter((s) => s.done >= s.target).length;

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <h1 className="font-['Fraunces'] text-2xl font-bold text-[#180F04] mb-1">
        Welcome, {session?.user?.name}
      </h1>
      <p className="text-sm text-[#180F04]/45 mb-6">Here's where your term stands right now.</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <Link
          href="/dcm/complaints"
          className="bg-white rounded-2xl p-6 border border-black/5 shadow-sm hover:border-[#D4A017] hover:shadow-md transition-all group"
        >
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-[#D4A017]/20 flex items-center justify-center group-hover:bg-[#D4A017]/30 transition-colors">
              <MessageCircleWarning size={20} className="text-[#180F04]" />
            </div>
            <div>
              <p className="text-sm text-[#180F04]/50">My Complaints</p>
              <p className="font-['Fraunces'] text-2xl font-semibold text-[#180F04]">{complaintCount}</p>
            </div>
          </div>
        </Link>
        <Link
          href="/dcm/feedback"
          className="bg-white rounded-2xl p-6 border border-black/5 shadow-sm hover:border-[#D4A017] hover:shadow-md transition-all group"
        >
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-[#D4A017]/20 flex items-center justify-center group-hover:bg-[#D4A017]/30 transition-colors">
              <ClipboardList size={20} className="text-[#180F04]" />
            </div>
            <div>
              <p className="text-sm text-[#180F04]/50">Open Feedback Forms</p>
              <p className="font-['Fraunces'] text-2xl font-semibold text-[#180F04]">{openForms}</p>
            </div>
          </div>
        </Link>
      </div>

      <div className="bg-white rounded-2xl p-6 border border-black/5 shadow-sm">
        <div className="flex items-center justify-between mb-5 flex-wrap gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-[#D4A017]/15 flex items-center justify-center">
              <Award size={17} className="text-[#D4A017]" />
            </div>
            <div>
              <h2 className="font-['Fraunces'] font-bold text-[#180F04] text-lg leading-tight">
                Term Criteria Progress
              </h2>
              <p className="text-xs text-[#180F04]/40">
                {completedCount} of {stats.length} criteria completed
              </p>
            </div>
          </div>
          <RadialProgress percent={overallPct} />
        </div>

        <CriteriaGrid stats={stats} />

        <p className="text-[10px] text-[#180F04]/40 mt-4">
          Tap a card to see exactly which ones counted. Council & DRR-Pres-Sec meeting attendance and
          quarterly district projects aren't tracked here yet.
        </p>
      </div>
    </div>
  );
}

