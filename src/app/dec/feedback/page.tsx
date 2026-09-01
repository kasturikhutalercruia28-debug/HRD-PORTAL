export const dynamic = 'force-dynamic';

import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import Link from "next/link";
import { ClipboardCheck, ArrowRight } from "lucide-react";

export default async function DecFeedbackPage() {
  const session = await auth();
  const user = session?.user as { role?: string; avenueId?: string } | undefined;
  if (!user || user.role !== "DEC") {
    redirect("/login");
  }

  const forms = user.avenueId
    ? await prisma.eventFeedbackForm.findMany({
        where: { avenueId: user.avenueId },
        include: { _count: { select: { submissions: true } } },
        orderBy: { eventDate: "desc" },
      })
    : [];

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <h1 className="font-['Fraunces'] text-2xl font-bold text-[#180F04] mb-1">Feedback</h1>
      <p className="text-sm text-[#180F04]/50 mb-6">Feedback forms and results for your avenue's events.</p>

      {forms.length === 0 ? (
        <div className="bg-white rounded-xl border border-black/5 px-5 py-10 text-center text-sm text-[#180F04]/40">
          No avenue-specific feedback forms yet.
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-black/5 divide-y divide-black/5">
          {forms.map((f) => (
            <Link
              key={f.id}
              href={`/dec/feedback/${f.id}/responses`}
              className="flex items-center justify-between px-5 py-4 hover:bg-[#FBF7EE]/40 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-[#D4A017]/15 flex items-center justify-center flex-shrink-0">
                  <ClipboardCheck size={16} className="text-[#D4A017]" />
                </div>
                <div>
                  <p className="text-sm font-medium text-[#180F04]">{f.eventName}</p>
                  <p className="text-xs text-[#180F04]/40">
                    {new Date(f.eventDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })} · {f._count.submissions} response{f._count.submissions !== 1 ? "s" : ""}
                  </p>
                </div>
              </div>
              <ArrowRight size={15} className="text-[#180F04]/20" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
