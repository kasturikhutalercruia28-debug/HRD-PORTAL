import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { LayoutDashboard, MessageCircleWarning, ClipboardList, Settings, LogOut } from "lucide-react";
import Footer from "@/components/Footer";
import NotificationBell from "@/components/NotificationBell";
import SidebarLogo from "@/components/SidebarLogo";

const NAV_LINKS = [
  { href: "/dcm/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dcm/complaints", label: "Complaints", icon: MessageCircleWarning },
  { href: "/dcm/feedback", label: "Feedback", icon: ClipboardList },
  { href: "/dcm/settings", label: "Settings", icon: Settings },
];

export default async function DcmLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session || session.user?.role !== "DCM") redirect("/login");

  return (
    <div className="min-h-screen bg-[#F0EDE5] flex font-['Geist']">
      {/* Sidebar */}
      <aside className="w-56 bg-[#0D0D0B] flex flex-col shrink-0">
        <SidebarLogo portal="DCM" />
        <nav className="flex-1 px-3 py-4 space-y-1">
          {NAV_LINKS.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors text-sm"
            >
              <Icon size={16} />
              {label}
            </Link>
          ))}
        </nav>
        <div className="px-3 pb-4">
          <Link
            href="/api/auth/signout"
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-colors text-sm w-full"
          >
            <LogOut size={16} />
            Sign out
          </Link>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-h-screen">
        <header className="h-14 bg-white border-b border-black/5 px-6 flex items-center justify-between shrink-0">
          <div />
          <div className="flex items-center gap-3">
            <NotificationBell />
            <span className="text-sm text-[#0D0D0B]/60">{session.user?.name}</span>
          </div>
        </header>
        <main className="flex-1 p-6 text-[#0D0D0B]">{children}</main>
        <Footer />
      </div>
    </div>
  );
}
