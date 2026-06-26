import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { ExternalLink, FileText, Youtube, HardDrive, File } from "lucide-react";

const TYPE_ICON: Record<string, React.ElementType> = {
  pdf: FileText,
  doc: FileText,
  drive: HardDrive,
  youtube: Youtube,
};

const TYPE_LABEL: Record<string, string> = {
  pdf: "PDF",
  doc: "Document",
  drive: "Google Drive",
  youtube: "YouTube",
  other: "Link",
};

export default async function ClubResourcesPage() {
  const session = await auth();
  const user = session?.user as { role?: string } | undefined;

  if (!session || user?.role !== "CLUB") {
    redirect("/login");
  }

  const resources = await prisma.resource.findMany({
    where: { isActive: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div>
        <h1 className="font-['Fraunces'] text-2xl font-bold text-[#0D0D0B]">Resources</h1>
        <p className="text-[#0D0D0B]/60 text-sm mt-1 font-['Geist']">
          Orientation materials and references
        </p>
      </div>

      {resources.length === 0 ? (
        <div className="bg-white rounded-xl border border-black/5 p-12 text-center">
          <p className="text-[#0D0D0B]/40 font-['Geist'] text-sm">
            No resources available yet.
          </p>
        </div>
      ) : (
        <div className="grid gap-3">
          {resources.map((r) => {
            const Icon = TYPE_ICON[r.type] ?? File;
            return (
              <a
                key={r.id}
                href={r.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-4 bg-white rounded-xl border border-black/5 shadow-sm px-5 py-4 hover:border-[#AAFF47]/50 hover:shadow-md transition-all group"
              >
                <div className="w-10 h-10 bg-[#AAFF47]/10 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Icon size={18} className="text-[#0D0D0B]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm text-[#0D0D0B] font-['Geist'] truncate">
                    {r.title}
                  </p>
                  {r.description && (
                    <p className="text-[#0D0D0B]/50 text-xs font-['Geist'] mt-0.5 truncate">
                      {r.description}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-xs bg-[#F0EDE5] text-[#0D0D0B]/60 px-2 py-0.5 rounded font-['Geist']">
                    {TYPE_LABEL[r.type] ?? r.type}
                  </span>
                  <ExternalLink
                    size={14}
                    className="text-[#0D0D0B]/20 group-hover:text-[#0D0D0B]/60 transition-colors"
                  />
                </div>
              </a>
            );
          })}
        </div>
      )}
    </div>
  );
}
