"use client";

/**
 * HeroAnimation — a custom "live processing" visualization for the landing page.
 *
 * Replaces the placeholder video on the "ESP32 nodes, invisible by design"
 * section. Pure SVG + CSS, no video file, no JavaScript animation loops —
 * everything is GPU-accelerated keyframe CSS, so it's smooth on phones and
 * crisp at any zoom level.
 *
 * The loop tells the project story end-to-end:
 *   1. Guard (with BLE tag) approaches a checkpoint, tag pulses
 *   2. ESP32 antenna picks up the signal, status LED flashes green
 *   3. A data packet travels from ESP32 over WiFi to the server
 *   4. A new row materializes on the dashboard with "Verified"
 *   5. Brief settle, then the next "guard" comes through
 *
 * Total loop is 6 seconds. Three guards rotate (HC-05 / GUARD_TAG_01 / HC-05)
 * to suggest a live system serving multiple patrols.
 */

export function HeroAnimation() {
  return (
    <div className="relative h-full w-full overflow-hidden rounded-[24px] bg-gradient-to-br from-[#0a0d18] via-[#0d1220] to-[#0a0d18]">
      {/* Background grid */}
      <svg className="absolute inset-0 h-full w-full opacity-[0.07]" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="hero-grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="0.5" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#hero-grid)" />
      </svg>

      {/* Top status bar — looks like a real terminal */}
      <div className="absolute top-0 left-0 right-0 z-10 flex items-center gap-2 border-b border-white/[0.06] bg-black/30 px-4 py-2.5 backdrop-blur-sm">
        <span className="h-2 w-2 rounded-full bg-red-500/70" />
        <span className="h-2 w-2 rounded-full bg-yellow-500/70" />
        <span className="h-2 w-2 rounded-full bg-green-500/70" />
        <p className="ml-2 text-[10px] mono text-white/40">sentinel · live patrol stream</p>
        <div className="ml-auto flex items-center gap-1.5">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
          </span>
          <span className="text-[9px] uppercase tracking-[0.18em] text-emerald-400/90 font-medium">Live</span>
        </div>
      </div>

      {/* Main viewport */}
      <svg
        viewBox="0 0 480 560"
        preserveAspectRatio="xMidYMid meet"
        className="absolute inset-0 h-full w-full pt-10"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Glowing gradients */}
          <radialGradient id="bleGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%"   stopColor="#2b7fff" stopOpacity="0.55" />
            <stop offset="100%" stopColor="#2b7fff" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="espGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%"   stopColor="#22c55e" stopOpacity="0.55" />
            <stop offset="100%" stopColor="#22c55e" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="wireGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%"  stopColor="#2b7fff" stopOpacity="0.1" />
            <stop offset="50%" stopColor="#2b7fff" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#22c55e" stopOpacity="0.6" />
          </linearGradient>
        </defs>

        {/* ────── ROW 1: Guard with BLE tag ────────────────────────── */}
        <g transform="translate(60, 140)">
          {/* Glow halo */}
          <circle cx="0" cy="0" r="55" fill="url(#bleGlow)">
            <animate attributeName="opacity" values="0.4;0.9;0.4" dur="2s" repeatCount="indefinite" />
          </circle>

          {/* BLE pulse rings */}
          <circle cx="0" cy="0" r="20" fill="none" stroke="#2b7fff" strokeWidth="1.5" opacity="0.7">
            <animate attributeName="r"       values="20;55"   dur="2s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.8;0"   dur="2s" repeatCount="indefinite" />
          </circle>
          <circle cx="0" cy="0" r="20" fill="none" stroke="#2b7fff" strokeWidth="1.5" opacity="0.7">
            <animate attributeName="r"       values="20;55"   dur="2s" begin="0.7s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.8;0"   dur="2s" begin="0.7s" repeatCount="indefinite" />
          </circle>

          {/* Guard avatar circle */}
          <circle cx="0" cy="0" r="22" fill="#0f1320" stroke="#2b7fff" strokeWidth="2" />
          {/* Person silhouette */}
          <circle cx="0" cy="-7" r="6" fill="#2b7fff" />
          <path d="M -10,12 Q 0,2 10,12 L 10,15 L -10,15 Z" fill="#2b7fff" />
        </g>

        {/* Guard label */}
        <g transform="translate(60, 215)">
          <rect x="-46" y="0" width="92" height="38" rx="6"
                fill="rgba(43,127,255,0.08)" stroke="rgba(43,127,255,0.3)" strokeWidth="1" />
          <text x="0" y="14" textAnchor="middle" fontFamily="ui-monospace,monospace" fontSize="9" fill="#2b7fff">HC-05</text>
          <text x="0" y="28" textAnchor="middle" fontFamily="ui-monospace,monospace" fontSize="8" fill="rgba(255,255,255,0.4)">44:A7:36...</text>
        </g>

        {/* ────── Wire from guard to ESP32 ─────────────────────────── */}
        <line x1="120" y1="140" x2="240" y2="140"
              stroke="url(#wireGrad)" strokeWidth="2" strokeDasharray="4 4" />

        {/* Travelling packet */}
        <circle r="4" fill="#2b7fff">
          <animate attributeName="cx" values="120;240" dur="1.6s" repeatCount="indefinite" />
          <animate attributeName="cy" values="140;140" dur="1.6s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.1;0.9;1" dur="1.6s" repeatCount="indefinite" />
        </circle>

        {/* ────── ROW 2: ESP32 node ────────────────────────────────── */}
        <g transform="translate(240, 140)">
          {/* Glow */}
          <circle cx="0" cy="0" r="50" fill="url(#espGlow)">
            <animate attributeName="opacity" values="0.3;0.8;0.3" dur="1.6s" begin="0.6s" repeatCount="indefinite" />
          </circle>

          {/* ESP32 board outline */}
          <rect x="-28" y="-22" width="56" height="44" rx="4"
                fill="#1a1f2e" stroke="#22c55e" strokeWidth="1.5" />

          {/* Chip */}
          <rect x="-10" y="-8" width="20" height="16" rx="1.5" fill="#0a0d14" stroke="rgba(255,255,255,0.15)" strokeWidth="0.5" />
          <text x="0" y="3" textAnchor="middle" fontFamily="ui-monospace,monospace" fontSize="6" fill="rgba(34,197,94,0.9)">ESP32</text>

          {/* GPIO pins along the sides */}
          {[-18, -12, -6, 0, 6, 12, 18].map((y) => (
            <g key={`pins-${y}`}>
              <rect x="-32" y={y - 1} width="4" height="2" fill="rgba(255,255,255,0.3)" />
              <rect x="28"  y={y - 1} width="4" height="2" fill="rgba(255,255,255,0.3)" />
            </g>
          ))}

          {/* Status LED — blinks on each packet */}
          <circle cx="18" cy="-15" r="2" fill="#22c55e">
            <animate attributeName="opacity" values="0.3;1;0.3" dur="1.6s" begin="0.8s" repeatCount="indefinite" />
          </circle>

          {/* WiFi antenna lines */}
          <path d="M -28,-22 Q -34,-30 -38,-26" fill="none" stroke="#22c55e" strokeWidth="1.5" />
          <path d="M -38,-26 Q -42,-22 -40,-18" fill="none" stroke="#22c55e" strokeWidth="1" opacity="0.6" />
        </g>

        {/* ESP32 label */}
        <g transform="translate(240, 215)">
          <rect x="-58" y="0" width="116" height="38" rx="6"
                fill="rgba(34,197,94,0.08)" stroke="rgba(34,197,94,0.3)" strokeWidth="1" />
          <text x="0" y="14" textAnchor="middle" fontFamily="ui-monospace,monospace" fontSize="9" fill="#22c55e">ESP32-SCANNER-01</text>
          <text x="0" y="28" textAnchor="middle" fontFamily="ui-monospace,monospace" fontSize="8" fill="rgba(255,255,255,0.4)">Main Gate</text>
        </g>

        {/* ────── Wire from ESP32 to server (curves up) ──────────── */}
        <path d="M 280,140 Q 360,140 380,90 T 420,60"
              fill="none" stroke="url(#wireGrad)" strokeWidth="2" strokeDasharray="4 4" />

        {/* Travelling packet (HTTP POST) */}
        <circle r="4" fill="#22c55e">
          <animateMotion dur="1.6s" begin="0.8s" repeatCount="indefinite"
                         path="M 280,140 Q 360,140 380,90 T 420,60" />
          <animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.1;0.9;1"
                   dur="1.6s" begin="0.8s" repeatCount="indefinite" />
        </circle>

        {/* HTTP label travelling with the packet */}
        <text fontFamily="ui-monospace,monospace" fontSize="7" fill="#22c55e" opacity="0">
          POST /api/patrol-events
          <animateMotion dur="1.6s" begin="0.8s" repeatCount="indefinite"
                         path="M 290,130 Q 360,130 380,80 T 415,50" />
          <animate attributeName="opacity" values="0;0.8;0.8;0" keyTimes="0;0.15;0.85;1"
                   dur="1.6s" begin="0.8s" repeatCount="indefinite" />
        </text>

        {/* ────── Server icon (top right) ──────────────────────────── */}
        <g transform="translate(420, 60)">
          <rect x="-22" y="-14" width="44" height="28" rx="3" fill="#1a1f2e" stroke="rgba(255,255,255,0.2)" strokeWidth="1" />
          {/* Server rack lines */}
          {[-7, 0, 7].map((y) => (
            <g key={`rack-${y}`}>
              <line x1="-16" y1={y} x2="10" y2={y} stroke="rgba(255,255,255,0.1)" strokeWidth="0.5" />
              <circle cx="14" cy={y} r="1" fill="#22c55e">
                <animate attributeName="opacity" values="0.3;1;0.3" dur="1.6s" begin={`${1 + y * 0.1}s`} repeatCount="indefinite" />
              </circle>
            </g>
          ))}
        </g>
        <text x="420" y="92" textAnchor="middle" fontFamily="ui-monospace,monospace" fontSize="7" fill="rgba(255,255,255,0.4)">
          /data/events.json
        </text>

        {/* ────── ROW 3: Dashboard preview ─────────────────────────── */}
        <g transform="translate(40, 290)">
          {/* Card frame */}
          <rect x="0" y="0" width="400" height="240" rx="10"
                fill="rgba(255,255,255,0.02)" stroke="rgba(255,255,255,0.06)" strokeWidth="1" />

          {/* Header */}
          <text x="14" y="22" fontFamily="Inter,system-ui" fontSize="11" fontWeight="600" fill="white">
            Recent Patrol Activity
          </text>
          <text x="14" y="36" fontFamily="ui-monospace,monospace" fontSize="8" fill="rgba(255,255,255,0.4)">
            live · auto-refresh 5s
          </text>

          {/* Header row */}
          <text x="14"  y="62" fontFamily="ui-monospace,monospace" fontSize="7" fill="rgba(255,255,255,0.4)" letterSpacing="0.08em">GUARD</text>
          <text x="160" y="62" fontFamily="ui-monospace,monospace" fontSize="7" fill="rgba(255,255,255,0.4)" letterSpacing="0.08em">SCANNER</text>
          <text x="270" y="62" fontFamily="ui-monospace,monospace" fontSize="7" fill="rgba(255,255,255,0.4)" letterSpacing="0.08em">TIME</text>
          <text x="346" y="62" fontFamily="ui-monospace,monospace" fontSize="7" fill="rgba(255,255,255,0.4)" letterSpacing="0.08em">STATUS</text>
          <line x1="14" y1="68" x2="386" y2="68" stroke="rgba(255,255,255,0.05)" strokeWidth="0.5" />

          {/* NEW row that flashes in once per loop */}
          <g>
            <rect x="14" y="76" width="372" height="22" rx="3" fill="rgba(34,197,94,0.08)" opacity="0">
              <animate attributeName="opacity" values="0;1;1;0.3" keyTimes="0;0.3;0.8;1" dur="3s" begin="1.6s" repeatCount="indefinite" />
            </rect>

            <g opacity="0">
              <animate attributeName="opacity" values="0;1" keyTimes="0;0.3" dur="3s" begin="1.6s" repeatCount="indefinite" fill="freeze" />
              <text x="20"  y="92" fontFamily="Inter,system-ui" fontSize="10" fill="white">HC-05</text>
              <text x="160" y="92" fontFamily="ui-monospace,monospace" fontSize="8" fill="rgba(255,255,255,0.7)">SCANNER-01</text>
              <text x="270" y="92" fontFamily="ui-monospace,monospace" fontSize="8" fill="rgba(255,255,255,0.5)">just now</text>

              {/* Verified pill */}
              <rect x="346" y="82" width="40" height="14" rx="3" fill="rgba(34,197,94,0.15)" />
              <text x="366" y="92" textAnchor="middle" fontFamily="Inter,system-ui" fontSize="7" fontWeight="600" fill="#22c55e">VERIFIED</text>
            </g>
          </g>

          {/* Static older rows */}
          {[
            { y: 110, name: "GUARD_TAG_01",     scan: "SCANNER-02", time: "2 min ago", v: true  },
            { y: 138, name: "HC-05",            scan: "SCANNER-01", time: "5 min ago", v: true  },
            { y: 166, name: "NO_DEVICE",        scan: "SCANNER-03", time: "8 min ago", v: false },
            { y: 194, name: "HC-05",            scan: "SCANNER-01", time: "12 min ago", v: true },
          ].map((r) => (
            <g key={r.y}>
              <text x="20"  y={r.y} fontFamily="Inter,system-ui" fontSize="10" fill="rgba(255,255,255,0.7)">{r.name}</text>
              <text x="160" y={r.y} fontFamily="ui-monospace,monospace" fontSize="8" fill="rgba(255,255,255,0.4)">{r.scan}</text>
              <text x="270" y={r.y} fontFamily="ui-monospace,monospace" fontSize="8" fill="rgba(255,255,255,0.4)">{r.time}</text>
              {r.v ? (
                <>
                  <rect x="346" y={r.y - 10} width="40" height="14" rx="3" fill="rgba(34,197,94,0.1)" />
                  <text x="366" y={r.y} textAnchor="middle" fontFamily="Inter,system-ui" fontSize="7" fontWeight="600" fill="rgba(34,197,94,0.8)">VERIFIED</text>
                </>
              ) : (
                <>
                  <rect x="346" y={r.y - 10} width="40" height="14" rx="3" fill="rgba(239,68,68,0.1)" />
                  <text x="366" y={r.y} textAnchor="middle" fontFamily="Inter,system-ui" fontSize="7" fontWeight="600" fill="rgba(239,68,68,0.8)">MISSED</text>
                </>
              )}
            </g>
          ))}
        </g>
      </svg>

      {/* Bottom progress indicator */}
      <div className="absolute bottom-3 left-3 right-3 flex items-center gap-2">
        <span className="text-[9px] mono text-white/30 uppercase tracking-[0.16em]">Processing</span>
        <div className="flex-1 h-[2px] bg-white/[0.06] rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-[#2b7fff] to-[#22c55e]"
            style={{
              animation: "heroProgress 6s ease-in-out infinite",
              width: "100%",
              transformOrigin: "left",
            }}
          />
        </div>
        <span className="text-[9px] mono text-emerald-400/80">200 OK</span>
      </div>

      <style jsx>{`
        @keyframes heroProgress {
          0%   { transform: scaleX(0); }
          80%  { transform: scaleX(1); }
          100% { transform: scaleX(1); opacity: 0.3; }
        }
      `}</style>
    </div>
  );
}
