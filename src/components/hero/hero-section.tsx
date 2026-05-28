"use client";

import Link from "next/link";
import { SplineScene } from "@/components/ui/splite";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { FiShield, FiArrowRight, FiRadio, FiAlertOctagon, FiMapPin, FiPlayCircle } from "react-icons/fi";

export function HeroSection() {
  return (
    <section className="relative w-full min-h-screen bg-black overflow-hidden">
      {/* Floating top-right utility cluster: theme toggle.
          Fixed within the hero so it doesn't jump around as the page scrolls. */}
      <div className="absolute top-6 right-6 z-30 flex items-center gap-2">
        <ThemeToggle />
      </div>

      {/* Background atmospheric glow on the left */}
      <div
        aria-hidden
        className="absolute inset-y-0 left-0 w-1/2 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 60% 70% at 30% 50%, rgba(43,127,255,0.18), transparent 60%)",
        }}
      />

      {/* Decorative animated radar sweep on the right side of the hero.
          Positioned absolute, well behind the text, and behind any other
          floating elements. Pointer-events-none so it never blocks clicks.
          A few static "ping" rings provide depth around the rotating sweep. */}
      <div
        aria-hidden
        className="absolute pointer-events-none hidden lg:block"
        style={{
          top: "20%",
          right: "-100px",
          width: "560px",
          height: "560px",
          opacity: 0.35,
        }}
      >
        {/* Static concentric rings */}
        <div className="absolute inset-0 rounded-full border border-[var(--color-primary)]/20" />
        <div className="absolute rounded-full border border-[var(--color-primary)]/15"
             style={{ inset: "12%" }} />
        <div className="absolute rounded-full border border-[var(--color-primary)]/10"
             style={{ inset: "24%" }} />
        <div className="absolute rounded-full border border-[var(--color-primary)]/10"
             style={{ inset: "36%" }} />

        {/* Cross-hair lines through the center */}
        <div className="absolute top-1/2 left-0 right-0 h-px bg-[var(--color-primary)]/10" />
        <div className="absolute left-1/2 top-0 bottom-0 w-px bg-[var(--color-primary)]/10" />

        {/* Rotating sweep wedge (the radar arm) */}
        <div className="radar-sweep" />

        {/* Outward pinging rings — appear at random checkpoints */}
        <div className="radar-ping" />
        <div className="radar-ping delay-1" />
        <div className="radar-ping delay-2" />

        {/* A few static "detected" dots scattered around */}
        <div className="absolute h-2 w-2 rounded-full bg-[var(--color-success)] shadow-[0_0_8px_var(--color-success)]"
             style={{ top: "30%", left: "55%" }} />
        <div className="absolute h-2 w-2 rounded-full bg-[var(--color-success)] shadow-[0_0_8px_var(--color-success)]"
             style={{ top: "65%", left: "40%" }} />
        <div className="absolute h-1.5 w-1.5 rounded-full bg-yellow-400 shadow-[0_0_6px_#facc15]"
             style={{ top: "45%", left: "70%" }} />
      </div>

      <div className="relative z-10 mx-auto max-w-7xl px-6 lg:px-10 pt-28 pb-16">
        <div className="flex flex-col lg:flex-row items-center gap-8">
          {/* Left: text content */}
          <div className="flex-1 w-full max-w-xl">
            {/* IoT + BLE + ESP32 Powered pill */}
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[var(--color-primary)]/30 bg-[var(--color-primary)]/10 text-[var(--color-primary)] text-xs font-medium">
              <span className="relative inline-block h-1.5 w-1.5">
                <span className="absolute inset-0 rounded-full bg-[var(--color-success)] pulse-dot" />
                <span className="absolute inset-0 rounded-full bg-[var(--color-success)]" />
              </span>
              IoT + BLE + ESP32 Powered
            </div>

            {/* Title */}
            <h1 className="mt-7 text-5xl md:text-6xl lg:text-7xl font-bold leading-[1.05] tracking-tight">
              <span className="block text-white">Smart Security</span>
              <span className="block mt-2 bg-clip-text text-transparent bg-gradient-to-r from-[var(--color-primary)] via-cyan-400 to-emerald-400">
                Patrol System
              </span>
            </h1>

            {/* Description */}
            <p className="mt-7 text-base md:text-lg text-neutral-400 leading-relaxed max-w-lg">
              Real-time patrol monitoring using BLE technology and
              ESP32 devices. Track guard checkpoints, verify patrol
              compliance, and ensure complete facility security.
            </p>

            {/* CTAs */}
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-2 px-6 py-3.5 rounded-full bg-[var(--color-primary)] text-white text-sm font-semibold hover:bg-[var(--color-primary)]/90 transition-colors shadow-[0_8px_24px_-8px_rgba(43,127,255,0.6)]"
              >
                <FiShield className="h-4 w-4" />
                Access Dashboard
                <FiArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/live?demo=1"
                className="inline-flex items-center gap-2 px-6 py-3.5 rounded-full border border-[var(--color-primary)]/40 text-[var(--color-primary)] text-sm font-semibold hover:bg-[var(--color-primary)]/10 transition-colors"
              >
                <FiPlayCircle className="h-4 w-4" />
                See Demo
              </Link>
              <a
                href="#features"
                className="inline-flex items-center px-6 py-3.5 rounded-full border border-white/10 text-white text-sm font-semibold hover:bg-white/[0.04] transition-colors"
              >
                Learn More
              </a>
            </div>

            {/* Capabilities */}
            <div className="mt-12 pt-8 border-t border-white/[0.06]">
              <dl className="grid grid-cols-3 gap-6 max-w-xl">
                <Capability icon={FiRadio}        label="BLE Scanning"     hint="continuous detect" />
                <Capability icon={FiAlertOctagon} label="Emergency Alerts" hint="instant Telegram" />
                <Capability icon={FiMapPin}       label="Live Tracking"    hint="map + heartbeat" />
              </dl>
            </div>
          </div>

          {/* Right: 3D robot scene */}
          <div className="flex-1 relative w-full h-[440px] lg:h-[640px]">
            <SplineScene
              scene="https://prod.spline.design/kZDDjO5HuC9GJUM2/scene.splinecode"
              className="w-full h-full"
            />
          </div>
        </div>
      </div>

      {/* Bottom fade into next section */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[var(--color-bg)] to-transparent pointer-events-none" />
    </section>
  );
}

function Capability({
  icon: Icon, label, hint,
}: { icon: React.ComponentType<{ className?: string }>; label: string; hint: string }) {
  return (
    <div>
      <dt className="flex items-center gap-2">
        <span className="grid h-9 w-9 place-items-center rounded-md bg-[var(--color-primary)]/10 text-[var(--color-primary)] ring-1 ring-[var(--color-primary)]/30">
          <Icon className="h-4 w-4" />
        </span>
        <span className="text-base font-semibold text-white">{label}</span>
      </dt>
      <dd className="mt-1.5 text-xs text-neutral-500 ml-11">{hint}</dd>
    </div>
  );
}
