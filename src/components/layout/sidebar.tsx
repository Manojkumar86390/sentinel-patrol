"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  FiGrid, FiActivity, FiRadio, FiCpu,
  FiFileText, FiSettings, FiLogOut, FiShield, FiCheckSquare, FiAlertOctagon,
} from "react-icons/fi";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/dashboard",  label: "Dashboard",        icon: FiGrid },
  { href: "/logs",       label: "Patrol Logs",      icon: FiActivity },
  { href: "/live",       label: "Live Status",      icon: FiRadio },
  { href: "/devices",    label: "Devices",          icon: FiCpu },
  { href: "/reports",    label: "Reports",          icon: FiFileText },
  { href: "/attendance", label: "Attendance",       icon: FiCheckSquare },
  { href: "/alerts",     label: "Emergency Alerts", icon: FiAlertOctagon },
  { href: "/settings",   label: "Settings",         icon: FiSettings },
] as const;

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [alertCount, setAlertCount] = useState(0);

  // Poll the unack count so the badge updates without a full page reload.
  useEffect(() => {
    let cancelled = false;
    async function tick() {
      try {
        const res  = await fetch("/api/emergency-alerts?unack=1");
        const json = await res.json();
        if (!cancelled && json.ok) setAlertCount(json.total);
      } catch { /* ignore */ }
    }
    tick();
    const id = setInterval(tick, 5000);
    return () => { cancelled = true; clearInterval(id); };
  }, []);

  async function handleLogout() {
    await fetch("/api/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <aside className="hidden md:flex md:fixed md:inset-y-0 md:left-0 md:z-30 md:w-64 flex-col border-r border-white/[0.06] bg-[var(--color-surface)]/80 backdrop-blur-xl">
      <div className="flex items-center gap-3 px-6 py-5 border-b border-white/[0.06]">
        <div className="grid h-9 w-9 place-items-center rounded-lg bg-[var(--color-primary)]/15 text-[var(--color-primary)] ring-1 ring-[var(--color-primary)]/30">
          <FiShield className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm font-semibold text-white leading-tight">Sentinel</p>
          <p className="text-[10px] uppercase tracking-[0.18em] text-[var(--color-muted)]">Patrol Ops</p>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname?.startsWith(href + "/");
          const showBadge = href === "/alerts" && alertCount > 0;
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors",
                active
                  ? "bg-[var(--color-primary)]/10 text-white ring-1 ring-[var(--color-primary)]/30"
                  : "text-[var(--color-muted)] hover:text-white hover:bg-white/[0.04]"
              )}
            >
              <Icon className={cn("h-[18px] w-[18px] transition-colors",
                active ? "text-[var(--color-primary)]" : "text-[var(--color-muted)] group-hover:text-white",
                showBadge && "text-[var(--color-danger)] animate-pulse")} />
              <span className="font-medium">{label}</span>
              {showBadge && (
                <span className="ml-auto inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-[var(--color-danger)] text-white text-[10px] font-bold animate-pulse">
                  {alertCount}
                </span>
              )}
              {!showBadge && active && (
                <span className="ml-auto h-1.5 w-1.5 rounded-full bg-[var(--color-primary)] shadow-[0_0_8px_var(--color-primary)]" />
              )}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-white/[0.06] p-3">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-[var(--color-muted)] hover:text-[var(--color-danger)] hover:bg-[var(--color-danger)]/10 transition-colors"
        >
          <FiLogOut className="h-[18px] w-[18px]" />
          <span className="font-medium">Logout</span>
        </button>
      </div>
    </aside>
  );
}
