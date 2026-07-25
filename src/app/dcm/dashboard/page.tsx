export const dynamic = 'force-dynamic';

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import Link from "next/link";
import { MessageCircleWarning, ClipboardList, Award } from "lucide-react";
import { getAllCriteriaData, computeDcmProgress } from "@/lib/criteria";

function ProgressBar({ label, done, target }: { label: string; done: number; target: number }) {
  const pct = Math.min(100, Math.round((done / target) * 100));
  const complete = done >= target;
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-medium text-[#180F04]">{label}</span>
        <span className={`text-xs font-semibold ${complete ? "text-emerald-600" : "text-[#180F04]/50"}`}>
          {done} / {target}
        </span>
      </div>
      <div className="w-full h-2 bg-[#FBF7EE] rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${complete ? "bg-emerald-500" : "bg-[#D4A017]"}`}
          style={{ width: `${pct}%` }}
        />
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
  const emptyProgress = computeDcmProgress("__none__", { installations: [], ocvs: [], projects: [] });
  let progress: ReturnType<typeof computeDcmProgress> = emptyProgress;
  if (dcmRecordId) {
    try {
      const data = await getAllCriteriaData();
      progress = computeDcmProgress(dcmRecordId, data);
    } catch {
      progress = emptyProgress; // GitHub token/config missing or unreachable — show zeros, not nothing
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <h1 className="font-['Fraunces'] text-2xl font-bold text-[#180F04] mb-6">
        Welcome, {session?.user?.name}
      </h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <Link
          href="/dcm/complaints"
          className="bg-white rounded-xl p-6 border border-black/5 hover:border-[#D4A017] transition-colors group"
        >
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-[#D4A017]/20 flex items-center justify-center group-hover:bg-[#D4A017]/30 transition-colors">
              <MessageCircleWarning size={20} className="text-[#180F04]" />
            </div>
            <div>
              <p className="text-sm text-[#180F04]/50">My Complaints</p>
              <p className="text-2xl font-bold text-[#180F04]">{complaintCount}</p>
            </div>
          </div>
        </Link>
        <Link
          href="/dcm/feedback"
          className="bg-white rounded-xl p-6 border border-black/5 hover:border-[#D4A017] transition-colors group"
        >
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-[#D4A017]/20 flex items-center justify-center group-hover:bg-[#D4A017]/30 transition-colors">
              <ClipboardList size={20} className="text-[#180F04]" />
            </div>
            <div>
              <p className="text-sm text-[#180F04]/50">Open Feedback Forms</p>
              <p className="text-2xl font-bold text-[#180F04]">{openForms}</p>
            </div>
          </div>
        </Link>
      </div>

      <div className="bg-white rounded-xl p-6 border border-black/5">
        <div className="flex items-center gap-2 mb-4">
          <Award size={18} className="text-[#D4A017]" />
          <h2 className="font-semibold text-[#180F04]">Term Criteria Progress</h2>
        </div>
        <div className="space-y-4">
          <ProgressBar label="Installations Attended" done={progress.installations.done} target={progress.installations.target} />
          <ProgressBar label="OCVs Attended" done={progress.ocvs.done} target={progress.ocvs.target} />
          <ProgressBar label="Projects Chaired" done={progress.chairProjects.done} target={progress.chairProjects.target} />
          <ProgressBar label="Core Team Projects" done={progress.coreProjects.done} target={progress.coreProjects.target} />
          <ProgressBar label="HoD Projects" done={progress.hodProjects.done} target={progress.hodProjects.target} />
        </div>
        <p className="text-[10px] text-[#180F04]/40 mt-4">
          Council & DRR-Pres-Sec meeting attendance and quarterly district projects aren't tracked here yet.
        </p>
      </div>
    </div>
  );
}
