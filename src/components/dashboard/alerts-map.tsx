"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { CAMPUS_CENTER, CAMPUS_LOCATIONS } from "@/lib/campus-locations";
import type { EmergencyAlert, EmergencySwitch, EspScanner } from "@/types";

interface Props {
  /** Registered ESP32 scanners — used for the static "checkpoint" pins. */
  scanners: EspScanner[];
  /** Registered Emergency Switches — pinned at their lat/lng. */
  switches: EmergencySwitch[];
  /** Unacknowledged active emergencies — shown as pulsing red markers. */
  activeAlerts: EmergencyAlert[];
  height?: number;
}

/**
 * The alerts page map.
 *
 * Three layers, from bottom to top:
 *   1. Checkpoint pins for the 4 campus locations (greyed when no scanner online there).
 *   2. Emergency Switch pins at their registered (lat, lng).
 *   3. Bright red pulsing markers wherever an unacknowledged alert is happening.
 *
 * Click any marker to open a popup with the relevant details. The red alert
 * marker shows the alert type, location, and time — matching the style of the
 * live map's popups.
 */
export function AlertsMap({ scanners, switches, activeAlerts, height = 360 }: Props) {
  const containerRef    = useRef<HTMLDivElement | null>(null);
  const mapRef          = useRef<L.Map | null>(null);
  const staticLayerRef  = useRef<L.LayerGroup | null>(null);
  const alertLayerRef   = useRef<L.LayerGroup | null>(null);

  // ─── 1. Initialise the map exactly once ──────────────────────────────────
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: [CAMPUS_CENTER.lat, CAMPUS_CENTER.lng],
      zoom:   CAMPUS_CENTER.zoom,
      zoomControl: true,
      attributionControl: true,
    });

    // Satellite basemap (Esri World Imagery, no API key required).
    L.tileLayer(
      "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      {
        attribution: "Tiles © Esri",
        maxZoom: 19,
      }
    ).addTo(map);

    staticLayerRef.current = L.layerGroup().addTo(map);
    alertLayerRef.current  = L.layerGroup().addTo(map);
    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // ─── 2. Static layer: checkpoints + switches ─────────────────────────────
  // Rebuilds whenever scanners or switches change. We tear down and rebuild
  // because there are only a few markers (cheap) and it avoids state drift.
  useEffect(() => {
    const layer = staticLayerRef.current;
    if (!layer) return;
    layer.clearLayers();

    // 2a. Campus checkpoint pins (green if a scanner there is online).
    for (const loc of CAMPUS_LOCATIONS) {
      const scanner = scanners.find(
        (s) => s.location.toLowerCase() === loc.name.toLowerCase()
      );
      const online  = scanner?.status === "online";

      L.marker([loc.lat, loc.lng], {
        icon: buildCheckpointIcon(online),
      })
        .bindPopup(
          `<div style="font-family:Inter,system-ui;min-width:170px;color:#e5e7eb">
             <div style="font-weight:600;color:white;font-size:13px;margin-bottom:2px">${escapeHtml(loc.name)}</div>
             <div style="font-size:11px;color:#aaa">${
               scanner
                 ? `Scanner <code style="font-family:ui-monospace,monospace">${escapeHtml(scanner.esp_id)}</code> · ${online ? "online" : "offline"}`
                 : "No scanner deployed"
             }</div>
           </div>`,
          { className: "sentinel-popup" }
        )
        .addTo(layer);
    }

    // 2b. Emergency Switch pins (small blue dot at their registered coords).
    for (const sw of switches) {
      if (!Number.isFinite(sw.latitude) || !Number.isFinite(sw.longitude)) continue;
      if (sw.latitude === 0 && sw.longitude === 0) continue; // never plotted

      L.marker([sw.latitude, sw.longitude], {
        icon: buildSwitchIcon(sw.status === "online"),
      })
        .bindPopup(
          `<div style="font-family:Inter,system-ui;min-width:200px;color:#e5e7eb">
             <div style="font-weight:600;color:white;font-size:13px;margin-bottom:2px">
               🆘 ${escapeHtml(sw.location)}
             </div>
             <div style="font-size:11px;font-family:ui-monospace,monospace;color:#aaa;margin-bottom:4px">${escapeHtml(sw.switch_id)}</div>
             <div style="font-size:11px;color:${sw.status === "online" ? "#22c55e" : "#ef4444"}">
               ${sw.status === "online" ? "● online" : "● offline"}
             </div>
           </div>`,
          { className: "sentinel-popup" }
        )
        .addTo(layer);
    }
  }, [scanners, switches]);

  // ─── 3. Alert layer: red pulsing markers for unacknowledged emergencies ──
  // Recreated each time the active list changes. The pulse animation runs
  // inline in the SVG, so no JS animation loop is needed.
  useEffect(() => {
    const layer = alertLayerRef.current;
    if (!layer) return;
    layer.clearLayers();

    for (const alert of activeAlerts) {
      // Resolve coordinates: prefer the switch's coords; fall back to the
      // scanner's matched campus pin; else off-map (skip with a warning).
      let lat: number | null = null;
      let lng: number | null = null;

      if (alert.switchId) {
        const sw = switches.find((s) => s.switch_id === alert.switchId);
        if (sw && Number.isFinite(sw.latitude) && Number.isFinite(sw.longitude)
            && !(sw.latitude === 0 && sw.longitude === 0)) {
          lat = sw.latitude;
          lng = sw.longitude;
        }
      }
      if ((lat === null || lng === null) && alert.location) {
        // Fall back to a matching campus pin if the alert's location name matches one
        const pin = CAMPUS_LOCATIONS.find(
          (p) => p.name.toLowerCase() === alert.location.toLowerCase()
        );
        if (pin) { lat = pin.lat; lng = pin.lng; }
      }
      if (lat === null || lng === null) continue;

      const { label, color } = ALERT_STYLE[alert.type] ?? { label: alert.type, color: "#ef4444" };

      L.marker([lat, lng], {
        icon: buildAlertIcon(color, label),
        zIndexOffset: 2000,
      })
        .bindPopup(
          `<div style="font-family:Inter,system-ui;min-width:220px;color:#e5e7eb">
             <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px">
               <span style="width:10px;height:10px;border-radius:9999px;background:${color};box-shadow:0 0 8px ${color}"></span>
               <span style="font-weight:700;color:white;font-size:13px;text-transform:uppercase;letter-spacing:0.04em">${escapeHtml(label)} ALERT</span>
             </div>
             <div style="font-size:12px;color:white;margin-bottom:2px">📍 ${escapeHtml(alert.location)}</div>
             <div style="font-size:11px;color:#aaa">${escapeHtml(alert.date)} · ${escapeHtml(alert.time)}</div>
           </div>`,
          { className: "sentinel-popup" }
        )
        .addTo(layer);
    }
  }, [activeAlerts, switches]);

  return (
    <div
      ref={containerRef}
      className="w-full rounded-xl overflow-hidden ring-1 ring-white/10 bg-black"
      style={{ height }}
    />
  );
}

// ──────────────────────────────────────────────────────────────────────────
// Icon builders
// ──────────────────────────────────────────────────────────────────────────

const ALERT_STYLE: Record<string, { label: string; color: string }> = {
  fire:     { label: "Fire",     color: "#fb923c" },
  accident: { label: "Accident", color: "#f87171" },
  bleeding: { label: "Bleeding", color: "#fb7185" },
  fight:    { label: "Fight",    color: "#fbbf24" },
};

function buildCheckpointIcon(online: boolean): L.DivIcon {
  const fill = online ? "#22c55e" : "#6b7280";
  const pulse = online
    ? `<circle cx="12" cy="12" r="11" fill="${fill}" opacity="0.35">
         <animate attributeName="r" from="7" to="14" dur="1.6s" repeatCount="indefinite"/>
         <animate attributeName="opacity" from="0.6" to="0" dur="1.6s" repeatCount="indefinite"/>
       </circle>`
    : "";
  const svg = `
    <svg width="28" height="28" viewBox="0 0 28 28" xmlns="http://www.w3.org/2000/svg" style="overflow:visible">
      <g>
        ${pulse}
        <circle cx="12" cy="12" r="7" fill="${fill}" stroke="white" stroke-width="2"/>
        <circle cx="12" cy="12" r="2.5" fill="white"/>
      </g>
    </svg>`;
  return L.divIcon({
    html: svg,
    className: "sentinel-checkpoint",
    iconSize:   [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -10],
  });
}

function buildSwitchIcon(online: boolean): L.DivIcon {
  const fill = online ? "#3b82f6" : "#475569";
  const svg = `
    <svg width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <rect x="3" y="3" width="18" height="18" rx="3" fill="${fill}" stroke="white" stroke-width="1.5"/>
      <circle cx="12" cy="12" r="3" fill="white"/>
    </svg>`;
  return L.divIcon({
    html: svg,
    className: "sentinel-switch-pin",
    iconSize:   [24, 24],
    iconAnchor: [12, 12],
    popupAnchor: [0, -10],
  });
}

function buildAlertIcon(color: string, _label: string): L.DivIcon {
  // Bright, double-pulsing emergency marker. Two animated rings + a solid
  // center dot, so it stands out clearly even on a busy satellite background.
  const svg = `
    <svg width="44" height="44" viewBox="0 0 44 44" xmlns="http://www.w3.org/2000/svg" style="overflow:visible">
      <g>
        <circle cx="22" cy="22" r="18" fill="${color}" opacity="0.25">
          <animate attributeName="r" from="10" to="22" dur="1.4s" repeatCount="indefinite"/>
          <animate attributeName="opacity" from="0.7" to="0" dur="1.4s" repeatCount="indefinite"/>
        </circle>
        <circle cx="22" cy="22" r="14" fill="${color}" opacity="0.40">
          <animate attributeName="r" from="6" to="18" dur="1.4s" repeatCount="indefinite" begin="0.5s"/>
          <animate attributeName="opacity" from="0.7" to="0" dur="1.4s" repeatCount="indefinite" begin="0.5s"/>
        </circle>
        <circle cx="22" cy="22" r="9" fill="${color}" stroke="white" stroke-width="2.5"/>
        <text x="22" y="27" text-anchor="middle" font-family="system-ui,sans-serif" font-size="13" font-weight="700" fill="white">!</text>
      </g>
    </svg>`;
  return L.divIcon({
    html: svg,
    className: "sentinel-alert-marker",
    iconSize:   [44, 44],
    iconAnchor: [22, 22],
    popupAnchor: [0, -16],
  });
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
