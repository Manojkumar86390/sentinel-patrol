"use client";

import { Badge, PulseDot } from "@/components/ui/badge";
import { FiBell, FiSearch } from "react-icons/fi";

interface TopbarProps {
  title: string;
  subtitle?: string;
}

export function Topbar({ title, subtitle }: TopbarProps) {
  return (
    <header className="sticky top-0 z-20 border-b border-white/[0.06] bg-[var(--color-bg)]/80 backdrop-blur-xl">
      <div className="flex items-center gap-4 px-4 sm:px-8 h-16">
        <div className="min-w-0">
          <h1 className="text-lg font-semibold tracking-tight text-white truncate">{title}</h1>
          {subtitle && <p className="text-xs text-[var(--color-muted)] truncate">{subtitle}</p>}
        </div>

        <Badge variant="success" className="ml-2">
          <PulseDot className="text-[var(--color-success)]" />
          Live
        </Badge>

        <div className="ml-auto hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-md border border-white/10 bg-white/[0.02] text-xs text-[var(--color-muted)] min-w-[260px]">
          <FiSearch className="h-3.5 w-3.5" />
          <input
            type="search"
            placeholder="Search guards, devices, checkpoints…"
            className="bg-transparent w-full outline-none placeholder:text-[var(--color-muted)]"
          />
          <kbd className="hidden md:inline-flex items-center px-1.5 py-0.5 rounded border border-white/10 text-[10px] text-[var(--color-muted)] mono">⌘K</kbd>
        </div>

        <button
          aria-label="Notifications"
          className="relative grid place-items-center h-9 w-9 rounded-md border border-white/10 text-[var(--color-muted)] hover:text-white hover:bg-white/[0.04] transition-colors"
        >
          <FiBell className="h-4 w-4" />
          <span className="absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-[var(--color-danger)]" />
        </button>

        <div className="flex items-center gap-2 pl-3 border-l border-white/10">
          <div className="h-8 w-8 rounded-full bg-gradient-to-br from-[var(--color-primary)] to-purple-500 grid place-items-center text-xs font-semibold text-white">AD</div>
          <div className="hidden sm:block leading-tight">
            <p className="text-sm font-medium text-white">Admin</p>
            <p className="text-[10px] text-[var(--color-muted)]">Security Ops</p>
          </div>
        </div>
      </div>
    </header>
  );
}
