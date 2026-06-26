import { prisma } from "@/lib/db";
import Link from "next/link";
import { Plus, Eye, Edit } from "lucide-react";

export default async function HrdFeedbackPage() {
  const forms = await prisma.eventFeedbackForm.findMany({
    include: { _count: { select: { submissions: true, questions: true } } },
    orderBy: { eventDate: "desc" },
  });

  return (
    <div className="max-w-5xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-['Fraunces'] text-2xl font-bold text-[#0D0D0B]">Feedback Forms</h1>
        <Link
          href="/hrd/feedback/new"
          className="flex items-center gap-2 bg-[#AAFF47] text-[#0D0D0B] px-4 py-2 rounded-lg text-sm font-semibold hover:bg-[#99ee36] transition-colors"
        >
          <Plus size={16} /> New Form
        </Link>
      </div>

      {forms.length === 0 ? (
        <div className="bg-white rounded-xl border border-black/5 p-12 text-center text-[#0D0D0B]/40 text-sm">
          No feedback forms yet
        </div>
      ) : (
        <div className="space-y-3">
          {forms.map((form) => (
            <div key={form.id} className="bg-white rounded-xl border border-black/5 p-4 flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-semibold text-sm text-[#0D0D0B]">{form.eventName}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${form.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                    {form.isActive ? "Active" : "Inactive"}
                  </span>
                </div>
                <p className="text-xs text-[#0D0D0B]/50 mt-0.5">
                  Event: {new Date(form.eventDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })} ·{" "}
                  {form._count.questions} questions · {form._count.submissions} submissions
                </p>
              </div>
              <div className="flex gap-2 shrink-0">
                <Link
                  href={`/hrd/feedback/${form.id}`}
                  className="flex items-center gap-1.5 text-xs border border-black/15 text-[#0D0D0B] px-3 py-1.5 rounded-lg hover:bg-black/5 transition-colors"
                >
                  <Edit size={12} /> Manage
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
