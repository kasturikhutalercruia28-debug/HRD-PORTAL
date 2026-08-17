import Link from "next/link";
import { Building2, Handshake, FolderKanban, ArrowRight } from "lucide-react";

const SECTIONS = [
  {
    href: "/hrd/criteria/installations",
    label: "Installations",
    desc: "Mark which DCMs attended a club's installation",
    icon: Building2,
  },
  {
    href: "/hrd/criteria/ocvs",
    label: "OCVs",
    desc: "Mark which DCMs attended a club's OCV",
    icon: Handshake,
  },
  {
    href: "/hrd/criteria/projects",
    label: "Projects",
    desc: "Add a project and assign Chair / Core Team / HoD",
    icon: FolderKanban,
  },
];

export default function CriteriaIndexPage() {
  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="font-['Fraunces'] text-2xl font-bold text-[#180F04]">DCM Criteria</h1>
        <p className="text-[#180F04]/60 text-sm mt-1">
          Track installations, OCVs, and project participation for each DCM's term criteria.
        </p>
      </div>

      <div className="grid gap-4">
        {SECTIONS.map(({ href, label, desc, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className="bg-white rounded-xl border border-black/5 p-5 flex items-center gap-4 hover:border-[#D4A017] transition-colors group"
          >
            <div className="w-10 h-10 rounded-lg bg-[#D4A017]/15 flex items-center justify-center flex-shrink-0">
              <Icon size={18} className="text-[#D4A017]" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-[#180F04]">{label}</p>
              <p className="text-xs text-[#180F04]/50 mt-0.5">{desc}</p>
            </div>
            <ArrowRight size={16} className="text-[#180F04]/20 group-hover:text-[#D4A017] transition-colors" />
          </Link>
        ))}
      </div>
    </div>
  );
}
