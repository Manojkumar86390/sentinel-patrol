import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { PulseDot } from "@/components/ui/badge";
import { timeAgo, cn } from "@/lib/utils";
import type { EspScanner } from "@/types";
import { FiCpu } from "react-icons/fi";

interface Props {
  scanners: EspScanner[];
}

export function ScannerStrip({ scanners }: Props) {
  const onlineCount = scanners.filter((s) => s.status === "online").length;

  return (
    <Card>
      <CardHeader className="border-b border-white/[0.04]">
        <CardTitle>ESP32 Scanners</CardTitle>
        <p className="text-xs text-[var(--color-muted)]">
          {onlineCount} of {scanners.length} online
        </p>
      </CardHeader>

      <CardContent className="p-4">
        {scanners.length === 0 && (
          <p className="text-center text-sm text-[var(--color-muted)] py-8">
            No scanners registered. Add one in <span className="text-white">Devices → ESP32 Scanners</span>.
          </p>
        )}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {scanners.map((s) => {
            const online = s.status === "online";
            return (
              <div
                key={s.id}
                className={cn(
                  "group relative rounded-lg border p-3 transition-all",
                  online
                    ? "border-white/[0.06] bg-white/[0.02] hover:border-[var(--color-primary)]/30"
                    : "border-[var(--color-danger)]/20 bg-[var(--color-danger)]/[0.04]"
                )}
              >
                <div className="flex items-center gap-2">
                  <FiCpu className={cn("h-4 w-4 shrink-0",
                    online ? "text-[var(--color-primary)]" : "text-[var(--color-danger)]")} />
                  <p className="text-[11px] mono text-white truncate">{s.esp_id}</p>
                  <PulseDot className={cn("ml-auto",
                    online ? "text-[var(--color-success)]" : "text-[var(--color-danger)]")} />
                </div>

                <p className="mt-2 text-xs text-white font-medium truncate">{s.location}</p>
                {s.description && (
                  <p className="text-[10px] text-[var(--color-muted)] truncate">{s.description}</p>
                )}

                <p className={cn("mt-2 text-[10px] mono",
                  online ? "text-[var(--color-muted)]" : "text-[var(--color-danger)]")}>
                  {online ? `↑ ${timeAgo(s.last_heartbeat)}` : `↓ offline ${timeAgo(s.last_heartbeat)}`}
                </p>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
