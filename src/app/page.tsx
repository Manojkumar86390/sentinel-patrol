import { HeroSection } from "@/components/hero/hero-section";
import { SectionWithMockup } from "@/components/ui/section-with-mockup";
import {
  DashboardMockup,
} from "@/components/hero/mockups";
import { HeroAnimation } from "@/components/hero/hero-animation";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Footer } from "@/components/layout/footer";
import Link from "next/link";
import {
  FiActivity,
  FiAlertTriangle,
  FiCheck,
  FiCheckSquare,
  FiCode,
  FiCpu,
  FiDatabase,
  FiEyeOff,
  FiFile,
  FiFileText,
  FiMapPin,
  FiPhone,
  FiRadio,
  FiServer,
  FiShield,
  FiX,
  FiZap,
} from "react-icons/fi";

const FEATURES = [
  { icon: FiRadio,    title: "Live BLE Detection",   body: "ESP32 nodes continuously scan for guard wristbands and stream verified scans to the dashboard." },
  { icon: FiActivity, title: "Real-time Logs",       body: "Every checkpoint visit is timestamped, RSSI-tagged, and color-coded — verified, late, or missed." },
  { icon: FiCpu,      title: "Device Health",        body: "Heartbeat monitoring per ESP32 with online/offline pulses and last-seen timestamps." },
  { icon: FiFileText, title: "Reports & Exports",    body: "Daily and weekly reports exportable to CSV / Excel — filter by guard, date range, or checkpoint." },
  { icon: FiShield,   title: "Role-based Access",    body: "Admin authentication and session management for security supervisors and management." },
  { icon: FiZap,      title: "Sub-second Refresh",   body: "Auto-polling every 10–15 seconds; ready to upgrade to WebSockets for full push delivery." },
];

const TECH_STACK = [
  { Icon: FiCode,     label: "Frontend",  value: "Next.js 16 · React 19 · Tailwind v4" },
  { Icon: FiServer,   label: "Backend",   value: "PHP 8 / Python Flask · REST API" },
  { Icon: FiDatabase, label: "Database",  value: "MySQL 8.0 with PDO" },
  { Icon: FiCpu,      label: "Hardware",  value: "ESP32 · BLE 4.2 · Arduino" },
];

export default function LandingPage() {
  return (
    <main className="bg-[var(--color-bg)]">
      <HeroSection />

      {/* Features grid */}
      <section id="features" className="relative py-24 px-6 lg:px-10">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-2xl">
            <Badge variant="info" className="mb-4">Capabilities</Badge>
            <h2 className="text-3xl md:text-4xl font-semibold tracking-tight text-white">
              Built for the security control room.
            </h2>
            <p className="mt-3 text-[var(--color-muted)]">
              Everything supervisors need to verify patrol coverage — without leaving the dashboard.
            </p>
          </div>

          <div className="mt-12 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {FEATURES.map(({ icon: Icon, title, body }) => (
              <Card key={title} className="p-6 hover:border-[var(--color-primary)]/30 transition-colors group">
                <div className="grid h-10 w-10 place-items-center rounded-lg bg-[var(--color-primary)]/10 text-[var(--color-primary)] ring-1 ring-[var(--color-primary)]/20 group-hover:scale-110 transition-transform">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-base font-semibold text-white">{title}</h3>
                <p className="mt-2 text-sm text-[var(--color-muted)] leading-relaxed">{body}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Dashboard preview */}
      <SectionWithMockup
        title={<>Operations,<br />at a single glance.</>}
        description={
          <>
            Every patrol scan, device heartbeat, and missed checkpoint surfaces in one
            unified dashboard. Live stats, trends, and alerts — no tab-switching, no refresh button.
          </>
        }
        primary={<DashboardMockup />}
      />

      {/* Hardware section (reversed) */}
      <SectionWithMockup
        reverseLayout
        title={<>ESP32 nodes,<br />invisible by design.</>}
        description={
          <>
            One small device per checkpoint. WiFi-connected, BLE-scanning, and silently watching for
            guard wristbands. Sub-100ms detection, RSSI-tagged for proximity verification.
            Flash the firmware once and forget it.
          </>
        }
        primary={<HeroAnimation />}
      />

      {/* About section */}
      <section id="about" className="relative py-20 md:py-28 px-6 lg:px-10 border-t border-white/[0.04]">
        <div className="mx-auto max-w-5xl">
          <div className="text-center mb-12">
            <Badge variant="info" className="mb-4">About</Badge>
            <h2 className="text-3xl md:text-5xl font-semibold tracking-tight text-white">
              About the project
            </h2>
            <p className="mt-4 text-base text-[var(--color-muted)] max-w-2xl mx-auto leading-relaxed">
              A college project from IIITDM Kurnool that uses small wireless tags
              and ESP32 microcontrollers to verify whether security guards are
              actually patrolling the spots they&rsquo;re supposed to.
            </p>
          </div>

          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] divide-y divide-white/[0.04]">

            {/* How it works */}
            <div className="p-6 md:p-8">
              <div className="flex items-start gap-3 mb-5">
                <div className="grid h-9 w-9 place-items-center rounded-lg bg-[var(--color-primary)]/10 text-[var(--color-primary)] ring-1 ring-[var(--color-primary)]/20 shrink-0">
                  <FiActivity className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">How it works</h3>
                  <p className="text-xs text-[var(--color-muted)] mt-0.5">
                    Five stages, every patrol round
                  </p>
                </div>
              </div>

              <ol className="space-y-3 ml-12">
                {[
                  ["1", "Each guard carries a small BLE wristband (HC-05). It continuously broadcasts its MAC address over Bluetooth Low Energy."],
                  ["2", "An ESP32 is mounted at each checkpoint (Main Gate, Hostel, ECE Block, Sports). It runs a custom firmware that scans for nearby BLE devices every few seconds."],
                  ["3", "When a guard&rsquo;s tag is detected, the ESP32 immediately sends an HTTP POST to the website with the tag&rsquo;s MAC and the scanner&rsquo;s own ID."],
                  ["4", "The server matches the scanner ID against its registered location and saves a Verified patrol event. The dashboard updates within seconds."],
                  ["5", "If something goes wrong, the guard presses one of 4 emergency buttons wired to the ESP32 (Accident / Fire / Bleeding / Fight). An instant Telegram alert reaches the supervisor group, and the alert appears on the dashboard for acknowledgment."],
                ].map(([n, txt]) => (
                  <li key={n} className="flex gap-3 text-sm text-[var(--color-muted)] leading-relaxed">
                    <span className="grid h-5 w-5 place-items-center rounded-full bg-white/[0.04] text-[10px] mono text-white shrink-0 mt-0.5">
                      {n}
                    </span>
                    <span dangerouslySetInnerHTML={{ __html: txt }} />
                  </li>
                ))}
              </ol>
            </div>

            {/* What it stores */}
            <div className="p-6 md:p-8">
              <div className="flex items-start gap-3 mb-5">
                <div className="grid h-9 w-9 place-items-center rounded-lg bg-purple-500/10 text-purple-400 ring-1 ring-purple-500/20 shrink-0">
                  <FiDatabase className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">What it stores</h3>
                  <p className="text-xs text-[var(--color-muted)] mt-0.5">
                    Plain JSON files, no database needed
                  </p>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-3 ml-0 md:ml-12">
                {[
                  { name: "Patrol events",     desc: "Every BLE scan with timestamp, MAC, scanner, location, status" },
                  { name: "Emergency alerts",  desc: "Every button press with type, location, Telegram delivery status" },
                  { name: "BLE devices",       desc: "Registered guard tags — MAC + name + optional guard name" },
                  { name: "ESP32 scanners",    desc: "Registered scanners — ESP ID + checkpoint location" },
                  { name: "Attendance matrix", desc: "Computed live — 30-day rolling day/night shift presence" },
                  { name: "Config",            desc: "Thresholds for offline detection, polling intervals, session timeout" },
                ].map((t) => (
                  <div key={t.name} className="rounded-md bg-white/[0.02] border border-white/[0.04] px-3 py-2.5">
                    <p className="text-sm font-medium text-white">{t.name}</p>
                    <p className="text-xs text-[var(--color-muted)] mt-0.5 leading-relaxed">{t.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Tech stack */}
            <div className="p-6 md:p-8">
              <div className="flex items-start gap-3 mb-5">
                <div className="grid h-9 w-9 place-items-center rounded-lg bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/20 shrink-0">
                  <FiCode className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">Tech stack</h3>
                  <p className="text-xs text-[var(--color-muted)] mt-0.5">
                    Everything used to build this
                  </p>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 ml-0 md:ml-12">
                {[
                  { label: "Hardware",      value: "ESP32 Dev Module, HC-05 BLE, push buttons" },
                  { label: "Firmware",      value: "Arduino + FreeRTOS dual-core" },
                  { label: "Web framework", value: "Next.js 16, React 19, TypeScript" },
                  { label: "Styling",       value: "Tailwind v4, custom dark theme" },
                  { label: "Storage",       value: "JSON files (atomic writes)" },
                  { label: "Map",           value: "Leaflet + OpenStreetMap satellite" },
                  { label: "Auth",          value: "HMAC-signed cookie" },
                  { label: "Notifications", value: "Telegram Bot API" },
                  { label: "Hosting",       value: "Runs on a single laptop (LAN)" },
                ].map((t) => (
                  <div key={t.label} className="text-sm">
                    <p className="text-[10px] uppercase tracking-[0.14em] text-[var(--color-muted)]">{t.label}</p>
                    <p className="text-white font-medium mt-0.5">{t.value}</p>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* Tech stack strip */}
      <section id="tech" className="relative py-20 px-6 lg:px-10 border-t border-white/[0.04]">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-2xl">
            <Badge variant="info" className="mb-4">Tech Stack</Badge>
            <h2 className="text-3xl md:text-4xl font-semibold tracking-tight text-white">
              Modern stack, classroom-friendly.
            </h2>
            <p className="mt-3 text-[var(--color-muted)]">
              Familiar tools that any college lab can deploy — no exotic dependencies.
            </p>
          </div>

          <div className="mt-10 grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {TECH_STACK.map(({ Icon, label, value }) => (
              <Card key={label} className="p-5">
                <Icon className="h-5 w-5 text-[var(--color-primary)]" />
                <p className="mt-3 text-[10px] uppercase tracking-[0.16em] text-[var(--color-muted)]">
                  {label}
                </p>
                <p className="mt-1 text-sm text-white font-medium">{value}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Manual vs Sentinel */}
      <section id="comparison" className="relative py-24 px-6 lg:px-10 border-t border-white/[0.04]">
        <div className="mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <Badge variant="info" className="mb-4">Why automate</Badge>
            <h2 className="text-3xl md:text-5xl font-semibold tracking-tight text-white">
              Manual rounds vs Sentinel.
            </h2>
            <p className="mt-4 text-base text-[var(--color-muted)] max-w-2xl mx-auto leading-relaxed">
              Most campuses still log security patrols with pen and paper. Here&rsquo;s what changes
              when verification is automated.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-4 lg:gap-6">
            {/* Manual column */}
            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] overflow-hidden">
              <div className="border-b border-white/[0.06] bg-[var(--color-danger)]/[0.04] px-6 py-4">
                <div className="flex items-center gap-3">
                  <div className="grid h-9 w-9 place-items-center rounded-md bg-[var(--color-danger)]/15 text-[var(--color-danger)] ring-1 ring-[var(--color-danger)]/30">
                    <FiX className="h-4 w-4" strokeWidth={3} />
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.16em] text-[var(--color-muted)]">The old way</p>
                    <h3 className="text-lg font-semibold text-white">Manual logs</h3>
                  </div>
                </div>
              </div>

              <ul className="p-6 space-y-4">
                {[
                  { label: "Verification",  detail: "Guard signs a logbook — easy to forge or fill in later",          icon: FiAlertTriangle },
                  { label: "Real-time view", detail: "Supervisor has no idea who is where until the next day",          icon: FiEyeOff        },
                  { label: "Emergency reach",detail: "Phone calls or running to the security office — minutes lost",    icon: FiPhone         },
                  { label: "Attendance",     detail: "Manual tally at month-end, prone to disputes and errors",         icon: FiFileText      },
                  { label: "Coverage proof", detail: "Cannot prove a specific point was patrolled at a specific time",  icon: FiMapPin        },
                  { label: "Audit trail",    detail: "Paper records lost, damaged, or rewritten after the fact",        icon: FiFile          },
                ].map((row) => (
                  <li key={row.label} className="flex items-start gap-3">
                    <row.icon className="h-4 w-4 text-[var(--color-danger)]/70 shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-white/90">{row.label}</p>
                      <p className="text-xs text-[var(--color-muted)] mt-0.5 leading-relaxed">{row.detail}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            {/* Sentinel column */}
            <div className="rounded-2xl border border-[var(--color-primary)]/30 bg-[var(--color-primary)]/[0.04] overflow-hidden relative">
              <div aria-hidden className="absolute -top-20 -right-20 h-48 w-48 rounded-full bg-[var(--color-primary)]/15 blur-3xl" />

              <div className="relative border-b border-white/[0.06] bg-[var(--color-success)]/[0.05] px-6 py-4">
                <div className="flex items-center gap-3">
                  <div className="grid h-9 w-9 place-items-center rounded-md bg-[var(--color-success)]/15 text-[var(--color-success)] ring-1 ring-[var(--color-success)]/30">
                    <FiCheck className="h-4 w-4" strokeWidth={3} />
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.16em] text-[var(--color-muted)]">With Sentinel</p>
                    <h3 className="text-lg font-semibold text-white">Automated patrol</h3>
                  </div>
                </div>
              </div>

              <ul className="relative p-6 space-y-4">
                {[
                  { label: "Verification",   detail: "BLE wristband + ESP32 scanner — physical presence cannot be faked",  icon: FiShield  },
                  { label: "Real-time view",  detail: "Live dashboard updates in under a second from every checkpoint",     icon: FiActivity },
                  { label: "Emergency reach", detail: "4 hardware buttons trigger instant Telegram alerts to supervisors",  icon: FiZap     },
                  { label: "Attendance",      detail: "Day/night shift attendance computed live, exportable as CSV",        icon: FiCheckSquare },
                  { label: "Coverage proof",  detail: "Every scan tagged with scanner ID, location, MAC, and timestamp",    icon: FiMapPin  },
                  { label: "Audit trail",     detail: "All events stored in atomic JSON, every action logged forever",      icon: FiDatabase },
                ].map((row) => (
                  <li key={row.label} className="flex items-start gap-3">
                    <row.icon className="h-4 w-4 text-[var(--color-success)] shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-white">{row.label}</p>
                      <p className="text-xs text-[var(--color-muted)] mt-0.5 leading-relaxed">{row.detail}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative py-24 px-6 lg:px-10 border-t border-white/[0.04]">
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="text-3xl md:text-4xl font-semibold tracking-tight text-white">
            Ready to deploy?
          </h2>
          <p className="mt-3 text-[var(--color-muted)]">
            Spin up the dashboard now — the ESP32 firmware repo is ready to flash.
          </p>
          <div className="mt-8 flex items-center justify-center gap-3">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-md bg-[var(--color-primary)] text-white text-sm font-medium hover:bg-[var(--color-primary)]/90 transition-colors"
            >
              Open Dashboard
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-md border border-white/15 text-white text-sm font-medium hover:bg-white/[0.04] transition-colors"
            >
              Admin Sign-in
            </Link>
          </div>
        </div>
      </section>

      {/* Team */}
      <section className="relative py-16 px-6 lg:px-10 border-t border-white/[0.04]">
        <div className="mx-auto max-w-4xl">
          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 md:p-8">
            {/* Header with logo */}
            <div className="flex items-start gap-4 pb-5 border-b border-white/[0.04]">
              <img
                src="/iiitdm-logo.png"
                alt="IIITDM Kurnool"
                className="h-14 w-14 shrink-0 rounded-md object-contain bg-white/95 p-1"
              />
              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-[0.18em] text-[var(--color-muted)]">
                  Project by
                </p>
                <h2 className="text-lg md:text-xl font-semibold text-white mt-0.5">
                  Team Members
                </h2>
                <p className="text-xs text-[var(--color-muted)] mt-1">
                  Indian Institute Of Information Technology, Design &amp; Manufacturing, Kurnool
                </p>
              </div>
            </div>

            {/* Members */}
            <div className="grid sm:grid-cols-3 gap-3 pt-5">
              {[
                { name: "D. ManojKumar",  roll: "12EC0020" },
                { name: "Mridul S Kumar", roll: "12EC0006" },
                { name: "P. Sai Krishna", roll: "123EC0016" },
              ].map((m) => (
                <div
                  key={m.roll}
                  className="rounded-lg bg-white/[0.02] border border-white/[0.04] px-4 py-3 hover:border-[var(--color-primary)]/20 transition-colors"
                >
                  <p className="text-sm font-medium text-white truncate">{m.name}</p>
                  <p className="text-[11px] mono text-[var(--color-muted)] mt-0.5">{m.roll}</p>
                </div>
              ))}
            </div>

            {/* Supervisor */}
            <div className="mt-5 pt-5 border-t border-white/[0.04] flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
              <p className="text-[10px] uppercase tracking-[0.18em] text-[var(--color-muted)]">
                Under the guidance of
              </p>
              <div className="sm:ml-auto text-right">
                <p className="text-sm font-medium text-white">Dr. Eswaramoorthy K V</p>
                <p className="text-[11px] text-[var(--color-muted)]">Assistant Professor</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
