"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import { signOut, useSession } from "next-auth/react";
import {
  LayoutDashboard,
  PlusCircle,
  BookOpen,
  MessageCircleWarning,
  ClipboardList,
  Settings,
  Menu,
  X,
  LogOut,
  ChevronRight,
} from "lucide-react";
import Footer from "@/components/Footer";
import NotificationBell from "@/components/NotificationBell";

const NAV_LINKS = [
  { href: "/club/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/club/request/new", label: "New Request", icon: PlusCircle },
  { href: "/club/resources", label: "Resources", icon: BookOpen },
  { href: "/club/complaints", label: "Complaints", icon: MessageCircleWarning },
  { href: "/club/feedback", label: "Feedback", icon: ClipboardList },
  { href: "/club/settings", label: "Settings", icon: Settings },
];

export default function ClubLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      <div className="px-4 py-4 border-b border-white/10">
        <div className="bg-white rounded-xl px-3 py-2 mb-3 inline-block shadow-md">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="Rotaract District 3141" className="h-7 w-auto" />
        </div>
        <p className="text-white/35 text-[10px] font-['Geist'] uppercase tracking-widest">Club Portal</p>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {NAV_LINKS.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            onClick={() => setSidebarOpen(false)}
            className={`
              flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-['Geist'] transition-colors
              ${
                isActive(href)
                  ? "bg-[#AAFF47]/10 text-[#AAFF47] font-medium"
                  : "text-white/60 hover:text-white hover:bg-white/5"
              }
            `}
          >
            <Icon size={16} className={isActive(href) ? "text-[#AAFF47]" : "text-white/40"} />
            {label}
            {isActive(href) && <ChevronRight size={14} className="ml-auto text-[#AAFF47]/60" />}
          </Link>
        ))}
      </nav>

      <div className="border-t border-white/10 px-4 py-4">
        {session?.user && (
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-[#AAFF47]/20 flex items-center justify-center flex-shrink-0">
              <span className="text-[#AAFF47] text-xs font-bold font-['Geist']">
                {session.user.name?.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-medium font-['Geist'] truncate">
                {session.user.name}
              </p>
              <span className="inline-block text-[10px] font-bold px-1.5 py-0.5 rounded font-['Geist'] bg-[#AAFF47] text-[#0D0D0B]">
                CLUB
              </span>
            </div>
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="text-white/30 hover:text-red-400 transition-colors"
              title="Sign out"
            >
              <LogOut size={15} />
            </button>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-[#F0EDE5] font-['Geist']">
      <aside className="hidden lg:flex flex-col w-60 bg-[#0D0D0B] flex-shrink-0">
        <SidebarContent />
      </aside>

      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={`
          fixed top-0 left-0 h-full w-60 bg-[#0D0D0B] z-50 transform transition-transform duration-200
          lg:hidden
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
        `}
      >
        <SidebarContent />
      </aside>

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="lg:hidden flex items-center gap-3 px-4 py-3 bg-[#0D0D0B] border-b border-white/10">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="text-white/70 hover:text-white"
          >
            {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          <span className="font-['Fraunces'] font-bold text-[#AAFF47] text-lg">Orientations</span>
          <div className="ml-auto">
            <NotificationBell />
          </div>
        </header>

        <main className="flex-1 overflow-y-auto flex flex-col text-[#0D0D0B]">
          <div className="flex-1">{children}</div>
          <Footer />
        </main>
      </div>
    </div>
  );
}
