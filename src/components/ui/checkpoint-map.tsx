"use client";

import { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { cn } from "@/lib/utils";
import { LumaSpin } from "@/components/ui/luma-spin";
import type { Device } from "@/types";

interface CheckpointMapProps {
  devices: Array<Device & { lat: number; lng: number }>;
  className?: string;
  /** Initial map centre. Default = Kurnool, AP. */
  center?: [number, number];
  zoom?: number;
}

/**
 * Dark-themed MapLibre map showing every ESP32 checkpoint as a coloured pin.
 * Uses the free Carto dark-matter basemap (no API key required).
 */
export function CheckpointMap({
  devices,
  className,
  center = [78.0422, 15.8281], // Kurnool, AP
  zoom = 13,
}: CheckpointMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!containerRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json",
      center,
      zoom,
      attributionControl: { compact: true },
    });

    map.on("load", () => setReady(true));
    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Add / refresh markers whenever the devices list changes.
  useEffect(() => {
    if (!mapRef.current || !ready) return;
    const map = mapRef.current;

    // Remove old markers
    const oldMarkers = (map as unknown as { _sentinelMarkers?: maplibregl.Marker[] })._sentinelMarkers ?? [];
    oldMarkers.forEach((m) => m.remove());

    const next: maplibregl.Marker[] = devices.map((d) => {
      const el = document.createElement("div");
      el.className = "sentinel-pin";
      el.innerHTML = `
        <span class="sentinel-pin__ring" style="background:${
          d.status === "online" ? "#10d47e" : "#ef4444"
        }"></span>
        <span class="sentinel-pin__core" style="background:${
          d.status === "online" ? "#10d47e" : "#ef4444"
        }"></span>
      `;
      const popup = new maplibregl.Popup({ offset: 18, closeButton: false }).setHTML(`
        <div style="font-family: 'Space Grotesk', sans-serif; padding: 6px 8px; min-width: 160px;">
          <div style="font-size: 10px; color: #94a3b8; font-family: 'JetBrains Mono', monospace;">${d.device_id}</div>
          <div style="font-size: 13px; color: #fff; font-weight: 600; margin-top: 2px;">${d.checkpoint_name}</div>
          <div style="font-size: 11px; color: #94a3b8; margin-top: 2px;">${d.location}</div>
        </div>
      `);

      return new maplibregl.Marker({ element: el })
        .setLngLat([d.lng, d.lat])
        .setPopup(popup)
        .addTo(map);
    });

    (map as unknown as { _sentinelMarkers?: maplibregl.Marker[] })._sentinelMarkers = next;
  }, [devices, ready]);

  return (
    <div className={cn("relative rounded-lg overflow-hidden border border-white/[0.06]", className)}>
      <div ref={containerRef} className="h-[420px] w-full" />
      {!ready && (
        <div className="absolute inset-0 grid place-items-center bg-[var(--color-bg)]/80">
          <LumaSpin size={48} />
        </div>
      )}
    </div>
  );
}
