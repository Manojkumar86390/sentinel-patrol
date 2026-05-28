"use client";

import { useEffect, useRef, useState } from "react";
import type { GuardPosition } from "@/types";

interface Props {
  positions: GuardPosition[];
}

/**
 * Per-guard direction trend: did the strongest RSSI improve (approaching)
 * or weaken (leaving) compared to ~10 seconds ago?
 *
 * RSSI compared to the historical sample we cached the last time positions
 * arrived for this MAC. Threshold of 3 dBm to avoid jitter triggering arrows.
 */
type Trend = "approaching" | "leaving" | "stable";

interface TickerEntry {
  mac: string;
  guard: string;          // Display name (guardName ?? bleName)
  nearestLocation: string;
  nearestEspId: string;
  rssi: number;           // strongest current RSSI
  distance: number;       // estimated meters from nearest scanner
  trend: Trend;
}

/** Very rough RSSI -> meters, same as positioning.ts (kept independent so this
 *  module has no cross-coupling). At -45 dBm ~ 1m, falls off ~10 dB per decade. */
function rssiToMeters(rssi: number): number {
  const d = Math.pow(10, (-45 - rssi) / (10 * 2.5));
  return Math.max(0.5, d);
}

export function LiveTicker({ positions }: Props) {
  // Cache RSSI history per MAC: array of {rssi, at} for the last 30s.
  const historyRef = useRef<Map<string, Array<{ rssi: number; at: number }>>>(new Map());

  // Re-render the ticker only when the set of MACs or any value
  // changes meaningfully (avoid CSS animation restart on every poll).
  const [entries, setEntries] = useState<TickerEntry[]>([]);

  useEffect(() => {
    const now = Date.now();
    const computed: TickerEntry[] = [];

    for (const p of positions) {
      // 1) Pick the strongest current sample (the one driving the marker)
      if (p.sample.length === 0) continue;
      const strongest = p.sample.reduce((a, b) => (a.rssi > b.rssi ? a : b));

      // 2) Push current strongest into history; prune anything older than 30s
      const hist = historyRef.current.get(p.mac) ?? [];
      hist.push({ rssi: strongest.rssi, at: now });
      while (hist.length > 0 && now - hist[0].at > 30_000) hist.shift();
      historyRef.current.set(p.mac, hist);

      // 3) Trend = compare against the reading ~10s ago (or oldest if fewer).
      //    Threshold 3 dBm so natural fluctuation doesn't flip the arrow constantly.
      let trend: Trend = "stable";
      const tenSecAgo = now - 10_000;
      const past = [...hist].reverse().find((h) => h.at <= tenSecAgo) ?? hist[0];
      if (past && past !== hist[hist.length - 1]) {
        const delta = strongest.rssi - past.rssi;
        if (delta >=  3) trend = "approaching";
        if (delta <= -3) trend = "leaving";
      }

      computed.push({
        mac: p.mac,
        guard: p.guardName ?? p.name,
        nearestLocation: strongest.location,
        nearestEspId: strongest.espId,
        rssi: strongest.rssi,
        distance: rssiToMeters(strongest.rssi),
        trend,
      });
    }

    // Stable order: by guard name (so the ticker doesn't visually shuffle on
    // each poll while the underlying data is identical).
    computed.sort((a, b) => a.guard.localeCompare(b.guard));
    setEntries(computed);
  }, [positions]);

  if (entries.length === 0) {
    return (
      <div className="mt-4 rounded-lg border border-white/[0.06] bg-black/40 px-4 py-3 text-xs text-[var(--color-muted)]">
        <span className="mono">[LIVE]</span> waiting for guard detections — power on the BLE wristband and walk near an ESP32 to begin tracking.
      </div>
    );
  }

  // Duplicate entries so the marquee loop is seamless. CSS handles the scroll.
  return (
    <div className="mt-4 rounded-lg border border-white/[0.06] bg-gradient-to-r from-black/60 via-black/40 to-black/60 overflow-hidden">
      <div className="flex items-stretch">
        {/* Fixed "LIVE" badge on the left (news-channel style) */}
        <div className="shrink-0 bg-[var(--color-danger)]/90 text-white px-3 py-2.5 flex items-center gap-1.5">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-white" />
          </span>
          <span className="text-[10px] font-bold uppercase tracking-[0.18em]">Live</span>
        </div>

        {/* Scrolling ticker content */}
        <div className="flex-1 overflow-hidden py-2.5">
          <div className="ticker-track whitespace-nowrap inline-block">
            {/* Render twice for seamless loop */}
            {[...entries, ...entries].map((e, i) => (
              <TickerItem key={`${e.mac}-${i}`} entry={e} />
            ))}
          </div>
        </div>
      </div>

      <style jsx>{`
        .ticker-track {
          animation: ticker-scroll linear infinite;
          /* Speed: ~80px per second.
             More entries = longer loop, so we tie duration to entry count. */
          animation-duration: ${entries.length * 12}s;
        }
        @keyframes ticker-scroll {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }  /* half because we duplicated */
        }
        /* Pause on hover so people can read */
        .ticker-track:hover { animation-play-state: paused; }
      `}</style>
    </div>
  );
}

function TickerItem({ entry }: { entry: TickerEntry }) {
  const trendColor =
    entry.trend === "approaching" ? "text-[var(--color-success)]" :
    entry.trend === "leaving"     ? "text-[var(--color-danger)]"  :
                                    "text-[var(--color-muted)]";
  const trendIcon =
    entry.trend === "approaching" ? "→" :
    entry.trend === "leaving"     ? "←" :
                                    "•";
  const trendLabel =
    entry.trend === "approaching" ? "approaching" :
    entry.trend === "leaving"     ? "leaving" :
                                    "stable";

  return (
    <span className="inline-flex items-center gap-2 text-xs mx-6 align-middle">
      <span className="text-yellow-400 font-semibold">{entry.guard}</span>
      <span className={trendColor + " font-medium"}>{trendIcon} {trendLabel}</span>
      <span className="text-white">{entry.nearestLocation}</span>
      <span className="mono text-[10px] text-[var(--color-muted)]">
        {entry.rssi} dBm · ~{entry.distance.toFixed(1)} m · {entry.nearestEspId}
      </span>
      <span className="text-white/20 ml-2">|</span>
    </span>
  );
}
