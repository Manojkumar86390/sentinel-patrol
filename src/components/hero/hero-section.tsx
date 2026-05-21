"use client";

import Link from "next/link";
import { SplineScene } from "@/components/ui/splite";
import { FiShield, FiArrowRight, FiRadio, FiAlertOctagon, FiMapPin } from "react-icons/fi";

export function HeroSection() {
  return (
    <section className="relative w-full min-h-screen bg-black overflow-hidden">
      {/* Background atmospheric glow on the left */}
      <div
        aria-hidden
        className="absolute inset-y-0 left-0 w-1/2 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 60% 70% at 30% 50%, rgba(43,127,255,0.18), transparent 60%)",
        }}
      />

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
