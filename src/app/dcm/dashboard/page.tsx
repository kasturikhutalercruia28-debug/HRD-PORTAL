export const dynamic = 'force-dynamic';

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import Link from "next/link";
import { MessageCircleWarning, ClipboardList } from "lucide-react";

export default async function DcmDashboardPage() {
  const session = await auth();
  const userId = session?.user?.id;

  const [complaintCount, openForms] = await Promise.all([
    prisma.complaint.count({ where: { submittedBy: userId } }),
    prisma.eventFeedbackForm.count({ where: { isActive: true } }),
  ]);

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <h1 className="font-['Fraunces'] text-2xl font-bold text-[#180F04] mb-6">
        Welcome, {session?.user?.name}
      </h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
    </div>
  );
}
