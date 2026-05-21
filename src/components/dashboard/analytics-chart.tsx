"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

// Mock 24-point series — replace with /api/reports/daily when wired.
const DATA = [
  4, 6, 5, 8, 9, 11, 14, 16, 18, 20, 19, 22,
  24, 23, 21, 19, 18, 22, 25, 27, 24, 21, 17, 14,
];
const MAX = Math.max(...DATA);
const W = 600;
const H = 180;
const STEP = W / (DATA.length - 1);

const points = DATA.map((v, i) => [i * STEP, H - (v / MAX) * (H - 20) - 8] as const);
const path = points.map(([x, y], i) => `${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`).join(" ");
const area = `${path} L ${W} ${H} L 0 ${H} Z`;

export function AnalyticsChart() {
  return (
    <Card>
      <CardHeader className="border-b border-white/[0.04]">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Patrols (24h)</CardTitle>
            <p className="text-xs text-[var(--color-muted)] mt-0.5">
              Checkpoint scans per hour
            </p>
          </div>
          <div className="flex gap-2 text-[10px] mono text-[var(--color-muted)]">
            <span className="px-2 py-1 rounded border border-white/10 text-white">24H</span>
            <span className="px-2 py-1 rounded hover:text-white cursor-pointer">7D</span>
            <span className="px-2 py-1 rounded hover:text-white cursor-pointer">30D</span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-4">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-[180px]" preserveAspectRatio="none">
          <defs>
            <linearGradient id="chart-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor="var(--color-primary)" stopOpacity="0.4" />
              <stop offset="100%" stopColor="var(--color-primary)" stopOpacity="0" />
            </linearGradient>
          </defs>

          {[0.25, 0.5, 0.75].map((y) => (
            <line
              key={y}
              x1="0" x2={W}
              y1={H * y} y2={H * y}
              stroke="rgba(255,255,255,0.04)"
              strokeDasharray="2 4"
            />
          ))}

          <path d={area}  fill="url(#chart-grad)" />
          <path d={path}  fill="none" stroke="var(--color-primary)" strokeWidth="2"
                strokeLinejoin="round" strokeLinecap="round" />

          {points.map(([x, y], i) => (
            <circle key={i} cx={x} cy={y} r="2.5" fill="var(--color-primary)" />
          ))}
        </svg>

        <div className="mt-3 grid grid-cols-4 text-[10px] mono text-[var(--color-muted)]">
          <span>00:00</span>
          <span className="text-center">06:00</span>
          <span className="text-center">12:00</span>
          <span className="text-right">18:00</span>
        </div>
      </CardContent>
    </Card>
  );
}
