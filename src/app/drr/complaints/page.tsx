import { prisma } from "@/lib/db";
import Link from "next/link";
import { Download } from "lucide-react";

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-700",
  in_progress: "bg-blue-100 text-blue-700",
  resolved: "bg-green-100 text-green-700",
  closed: "bg-gray-100 text-gray-600",
};

export default async function DrrComplaintsPage({
  searchParams,
}: {
  searchParams: { status?: string };
}) {
  const where = searchParams.status ? { status: searchParams.status as never } : undefined;
  const complaints = await prisma.complaint.findMany({
    where,
    include: {
      submitter: { select: { name: true, role: true } },
      history: { orderBy: { createdAt: "desc" }, take: 1 },
    },
    orderBy: { createdAt: "desc" },
  });

  const statuses = ["pending", "in_progress", "resolved", "closed"];

  return (
    <div className="max-w-5xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-['Fraunces'] text-2xl font-bold text-[#0D0D0B]">Complaints</h1>
        <div className="flex gap-2">
          <a href="/api/export/complaints?format=csv" className="flex items-center gap-1.5 text-xs border border-black/15 text-[#0D0D0B] px-3 py-1.5 rounded-lg hover:bg-black/5 transition-colors">
            CSV
          </a>
          <a href="/api/export/complaints?format=xlsx" className="flex items-center gap-1.5 text-xs bg-[#AAFF47] text-[#0D0D0B] px-3 py-1.5 rounded-lg hover:bg-[#99ee36] transition-colors font-semibold">
            Excel
          </a>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap mb-5">
        <Link href="/drr/complaints" className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${!searchParams.status ? "bg-[#0D0D0B] text-white border-[#0D0D0B]" : "border-black/15 text-[#0D0D0B] hover:bg-black/5"}`}>All</Link>
        {statuses.map((s) => (
          <Link key={s} href={`/drr/complaints?status=${s}`} className={`text-xs px-3 py-1.5 rounded-full border transition-colors capitalize ${searchParams.status === s ? "bg-[#0D0D0B] text-white border-[#0D0D0B]" : "border-black/15 text-[#0D0D0B] hover:bg-black/5"}`}>
            {s.replace("_", " ")}
          </Link>
        ))}
      </div>

      {complaints.length === 0 ? (
        <div className="bg-white rounded-xl border border-black/5 p-12 text-center text-[#0D0D0B]/40 text-sm">No complaints</div>
      ) : (
        <div className="space-y-3">
          {complaints.map((c) => (
            <Link key={c.id} href={`/drr/complaints/${c.id}`}
              className="flex items-start justify-between gap-4 bg-white rounded-xl border border-black/5 p-4 hover:border-[#AAFF47] transition-colors">
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm text-[#0D0D0B] truncate">{c.subject}</p>
                <p className="text-xs text-[#0D0D0B]/50 mt-0.5">{c.submitter.name} · {c.submitter.role}</p>
                {c.history[0]?.remark && (
                  <p className="text-xs text-[#0D0D0B]/40 mt-0.5 line-clamp-1">Last remark: {c.history[0].remark}</p>
                )}
              </div>
              <div className="flex flex-col items-end gap-1 shrink-0">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[c.status]}`}>
                  {c.status.replace("_", " ")}
                </span>
                <span className="text-[10px] text-[#0D0D0B]/40">
                  {new Date(c.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
