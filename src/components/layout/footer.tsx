import Link from "next/link";
import {
  FiGithub,
  FiLinkedin,
  FiMail,
  FiPhone,
  FiMapPin,
  FiShield,
} from "react-icons/fi";

// External profiles. Open in a new tab.
const socialLinks = [
  { Icon: FiGithub,   label: "GitHub",   href: "https://github.com/Manojkumar86390" },
  { Icon: FiLinkedin, label: "LinkedIn", href: "https://www.linkedin.com/in/manojkumardannana" },
];

// Renamed to match what the project actually does.
//
// MONITORING  = pages where you watch the system live
// MANAGEMENT  = pages where you configure it
// RESOURCES   = the project's documentation drive link goes here later
const monitoringLinks = [
  { text: "Dashboard",        href: "/dashboard" },
  { text: "Live Status",      href: "/live" },
  { text: "Patrol Logs",      href: "/logs" },
  { text: "Emergency Alerts", href: "/alerts" },
  { text: "Attendance",       href: "/attendance" },
  { text: "Reports",          href: "/reports" },
];

const managementLinks = [
  { text: "Devices (BLE + ESP32)", href: "/devices" },
  { text: "Settings",              href: "/settings" },
  { text: "Admin Login",           href: "/login" },
];

// Drive link will be filled in here later — kept as a placeholder so the
// layout is stable when you add it.
const resourcesLinks = [
  { text: "Project Documentation", href: "#" },     // replace # with your Drive link
  { text: "ESP32 Firmware",        href: "#" },
];

const contactInfo = [
  { Icon: FiMail,   text: "123ec20manoj@gmail.com" },
  { Icon: FiPhone,  text: "+91 8639059067" },
  { Icon: FiMapPin, text: "Kurnool, Andhra Pradesh, India" },
];

export function Footer() {
  return (
    <footer className="bg-[var(--color-surface)]/40 border-t border-white/[0.06] mt-16">
      <div className="mx-auto max-w-screen-xl px-4 pt-16 pb-6 sm:px-6 lg:px-8 lg:pt-20">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-3">
          {/* Brand block */}
          <div>
            <Link href="/" className="flex items-center gap-2.5">
              <div className="grid h-9 w-9 place-items-center rounded-lg bg-[var(--color-primary)]/15 text-[var(--color-primary)] ring-1 ring-[var(--color-primary)]/30">
                <FiShield className="h-5 w-5" />
              </div>
              <div>
                <p className="text-base font-semibold text-white leading-tight">Sentinel</p>
                <p className="text-[10px] uppercase tracking-[0.18em] text-white/50">Patrol Ops</p>
              </div>
            </Link>

            <p className="text-[var(--color-muted)] mt-5 max-w-md text-sm leading-relaxed">
              Real-time BLE + ESP32 security patrol monitoring. Built for college campuses,
              office buildings, and industrial facilities that need verified checkpoint coverage.
            </p>

            <ul className="mt-6 flex gap-3">
              {socialLinks.map(({ Icon, label, href }) => (
                <li key={label}>
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={label}
                    className="grid h-9 w-9 place-items-center rounded-md border border-white/10 text-[var(--color-muted)] hover:text-white hover:bg-white/[0.04] hover:border-[var(--color-primary)]/30 transition-colors"
                  >
                    <Icon className="h-4 w-4" />
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Link columns */}
          <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 lg:col-span-2">
            <Column heading="Monitoring" items={monitoringLinks} />
            <Column heading="Management" items={managementLinks} />
            <Column heading="Resources"  items={resourcesLinks}  />
          </div>
        </div>

        {/* Contact strip */}
        <div className="mt-12 pt-6 border-t border-white/[0.04]">
          <div className="flex flex-col sm:flex-row gap-4 sm:gap-8 flex-wrap">
            {contactInfo.map(({ Icon, text }) => (
              <div key={text} className="flex items-center gap-2 text-xs text-[var(--color-muted)]">
                <Icon className="h-3.5 w-3.5 text-[var(--color-primary)]" />
                <span>{text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* bottom row */}
        <div className="mt-6 pt-5 border-t border-white/[0.04] flex flex-col sm:flex-row gap-3 items-center justify-between text-xs text-[var(--color-muted)]">
          <p>© {new Date().getFullYear()} Sentinel · Patrol Ops. All rights reserved.</p>
          <p className="mono">v0.2.0 · ESP32 firmware compatible</p>
        </div>
      </div>
    </footer>
  );
}

function Column({
  heading,
  items,
}: {
  heading: string;
  items: { text: string; href: string }[];
}) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white">
        {heading}
      </p>
      <ul className="mt-4 space-y-2.5">
        {items.map(({ text, href }) => (
          <li key={text}>
            <Link
              href={href}
              className="text-sm text-[var(--color-muted)] hover:text-white transition-colors"
            >
              {text}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
