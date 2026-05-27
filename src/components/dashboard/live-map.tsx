"use client";

import { useEffect, useMemo, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { CAMPUS_CENTER, CAMPUS_LOCATIONS, type CampusLocation } from "@/lib/campus-locations";
import { timeAgo } from "@/lib/utils";
import type { EspScanner, GuardPosition, PatrolEvent } from "@/types";

interface Props {
  scanners: EspScanner[];
  events:   PatrolEvent[];
  guardPositions?: GuardPosition[];   // NEW: live-computed guard positions
  height?:  number;
}

type MarkerState = "online" | "offline" | "unmapped";

interface ResolvedMarker {
  loc: CampusLocation;
  scanner?: EspScanner;
  state: MarkerState;
  lastEvent?: PatrolEvent;
}

/** Resolve each campus location against the live scanner list. */
function resolveMarkers(
  scanners: EspScanner[],
  events:   PatrolEvent[]
): ResolvedMarker[] {
  return CAMPUS_LOCATIONS.map((loc) => {
    const scanner = scanners.find(
      (s) => s.location.toLowerCase() === loc.name.toLowerCase()
    );
    const state: MarkerState = !scanner
      ? "unmapped"
      : scanner.status === "online"
        ? "online"
        : "offline";
    const lastEvent = scanner
      ? events.find((e) => e.espId === scanner.esp_id)
      : undefined;
    return { loc, scanner, state, lastEvent };
  });
}

/**
 * Build a small SVG marker DOM-icon for Leaflet. Three flavours: green pulse
 * (online), red solid (offline), grey hollow (unmapped). Inline so it works
 * without external assets.
 */
/**
 * Build a Leaflet icon for an animated GUARD marker. Yellow/amber pulsing dot
 * with a small label below showing the BLE name or guard name. Distinct from
 * the green/red checkpoint pins so the eye separates them at a glance.
 */
function buildGuardIcon(label: string): L.DivIcon {
  const svg = `
    <svg width="36" height="44" viewBox="0 0 36 44" xmlns="http://www.w3.org/2000/svg" style="overflow:visible">
      <g>
        <!-- outer pulse ring -->
        <circle cx="18" cy="14" r="12" fill="#facc15" opacity="0.3">
          <animate attributeName="r" from="8" to="18" dur="1.4s" repeatCount="indefinite"/>
          <animate attributeName="opacity" from="0.65" to="0" dur="1.4s" repeatCount="indefinite"/>
        </circle>
        <!-- solid amber dot, white ring -->
        <circle cx="18" cy="14" r="8"  fill="#facc15" stroke="white" stroke-width="2"/>
        <circle cx="18" cy="14" r="3"  fill="#0a0d18"/>
      </g>
    </svg>`;
  return L.divIcon({
    html: `${svg}<div class="sentinel-guard-label">${label}</div>`,
    className: "sentinel-guard",
    iconSize:   [36, 44],
    iconAnchor: [18, 14],
    popupAnchor: [0, -8],
  });
}

function buildIcon(state: MarkerState): L.DivIcon {
  const palette = {
    online:   { fill: "#22c55e", ring: "#22c55e" },
    offline:  { fill: "#ef4444", ring: "#ef4444" },
    unmapped: { fill: "#6b7280", ring: "#9ca3af" },
  }[state];

  const pulse = state === "online"
    ? `<circle cx="14" cy="14" r="13" fill="${palette.fill}" opacity="0.35">
         <animate attributeName="r" from="8" to="16" dur="1.6s" repeatCount="indefinite"/>
         <animate attributeName="opacity" from="0.6" to="0" dur="1.6s" repeatCount="indefinite"/>
       </circle>`
    : "";

  const svg = `
    <svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg" style="overflow:visible">
      <g>
        ${pulse}
        <circle cx="14" cy="14" r="8" fill="${palette.fill}" stroke="white" stroke-width="2"/>
        <circle cx="14" cy="14" r="3" fill="white"/>
      </g>
    </svg>`;

  return L.divIcon({
    html: svg,
    className: "sentinel-marker",
    iconSize:   [32, 32],
    iconAnchor: [14, 14],
    popupAnchor: [0, -12],
  });
}

export function LiveMap({ scanners, events, guardPositions = [], height = 420 }: Props) {
  const mapRef        = useRef<HTMLDivElement | null>(null);
  const leafletRef    = useRef<L.Map | null>(null);
  const markersRef    = useRef<L.Marker[]>([]);
  // Persistent guard markers keyed by MAC. We KEEP these between renders so
  // they animate smoothly to their new (lat, lng) instead of being recreated.
  const guardMarkersRef  = useRef<Map<string, L.Marker>>(new Map());
  const accuracyRingsRef = useRef<Map<string, L.Circle>>(new Map());

  const markers = useMemo(() => resolveMarkers(scanners, events), [scanners, events]);

  // Initialize the Leaflet map once.
  useEffect(() => {
    if (!mapRef.current || leafletRef.current) return;

    const map = L.map(mapRef.current, {
      center:        [CAMPUS_CENTER.lat, CAMPUS_CENTER.lng],
      zoom:          CAMPUS_CENTER.zoom,
      zoomControl:   true,
      scrollWheelZoom: true,
      attributionControl: false, // we add a compact one below
    });

    // Esri satellite tiles - free, no API key.
    L.tileLayer(
      "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      {
        maxZoom: 19,
        attribution: "Tiles © Esri",
      }
    ).addTo(map);

    // Tiny attribution control (top-right, low-key)
    L.control.attribution({
      position: "bottomright",
      prefix: false,
    }).addAttribution("© Esri · IIITDM Kurnool").addTo(map);

    leafletRef.current = map;

    return () => {
      map.remove();
      leafletRef.current = null;
    };
  }, []);

  // Sync markers whenever scanner/event data changes.
  useEffect(() => {
    const map = leafletRef.current;
    if (!map) return;

    // Wipe old markers.
    for (const m of markersRef.current) m.remove();
    markersRef.current = [];

    for (const { loc, scanner, state, lastEvent } of markers) {
      const marker = L.marker([loc.lat, loc.lng], {
        icon:  buildIcon(state),
        title: loc.name,
      });

      const stateLabel = state === "online"
        ? `<span style="color:#22c55e">● ONLINE</span>`
        : state === "offline"
          ? `<span style="color:#ef4444">● OFFLINE</span>`
          : `<span style="color:#9ca3af">○ UNMAPPED</span>`;

      const scannerLine = scanner
        ? `<div style="font-family:ui-monospace,monospace;font-size:11px;color:#aaa">${escape(scanner.esp_id)}</div>
           <div style="font-size:11px;color:#aaa;margin-top:2px">Last seen ${timeAgo(scanner.last_heartbeat)}</div>`
        : `<div style="font-size:11px;color:#9ca3af;margin-top:2px">No scanner registered at this location.<br/>Add one in Devices &rarr; ESP32 Scanners.</div>`;

      const lastEventLine = lastEvent
        ? `<div style="margin-top:6px;padding-top:6px;border-top:1px solid #333">
             <div style="font-size:11px;color:#ccc">Last detection</div>
             <div style="font-size:12px;color:white">${escape(lastEvent.guardName ?? lastEvent.name)}</div>
             <div style="font-family:ui-monospace,monospace;font-size:10px;color:#888">${lastEvent.date} ${lastEvent.time}</div>
           </div>`
        : "";

      const html = `
        <div style="min-width:200px;color:#e5e7eb;font-family:Inter,system-ui,sans-serif">
          <div style="font-weight:600;color:white;font-size:13px;margin-bottom:2px">${escape(loc.name)}</div>
          <div style="font-size:11px;margin-bottom:6px">${stateLabel}</div>
          ${loc.description ? `<div style="font-size:11px;color:#aaa;margin-bottom:6px">${escape(loc.description)}</div>` : ""}
          ${scannerLine}
          ${lastEventLine}
        </div>
      `;

      marker.bindPopup(html, { className: "sentinel-popup" });
      marker.addTo(map);
      markersRef.current.push(marker);
    }
  }, [markers]);

  // Sync GUARD markers. Persistent (not wiped each render) so they animate
  // smoothly using setLatLng() instead of being removed and re-added.
  useEffect(() => {
    const map = leafletRef.current;
    if (!map) return;

    const seen = new Set<string>();

    for (const g of guardPositions) {
      seen.add(g.mac);
      const label = escape(g.guardName ?? g.name);

      let marker = guardMarkersRef.current.get(g.mac);
      let ring   = accuracyRingsRef.current.get(g.mac);

      if (!marker) {
        marker = L.marker([g.lat, g.lng], {
          icon: buildGuardIcon(label),
          zIndexOffset: 1000,
        });
        marker.addTo(map);
        guardMarkersRef.current.set(g.mac, marker);
      } else {
        // Smoothly move to the new position. Leaflet will redraw, and our
        // CSS transition on .sentinel-guard takes care of the visual easing.
        marker.setLatLng([g.lat, g.lng]);
        marker.setIcon(buildGuardIcon(label));
      }

      // Accuracy ring (semi-transparent circle showing estimated error radius)
      if (!ring) {
        ring = L.circle([g.lat, g.lng], {
          radius: g.accuracyMeters,
          color: "#facc15",
          fillColor: "#facc15",
          fillOpacity: 0.08,
          weight: 1,
          opacity: 0.4,
          interactive: false,
        }).addTo(map);
        accuracyRingsRef.current.set(g.mac, ring);
      } else {
        ring.setLatLng([g.lat, g.lng]);
        ring.setRadius(g.accuracyMeters);
      }

      // Popup with diagnostic info
      const sampleHtml = g.sample
        .map((s) => `<li style="font-family:ui-monospace,monospace;font-size:10px;color:#aaa">
            ${escape(s.location)} (${escape(s.espId)}) · ${s.rssi} dBm · ${s.ageSeconds}s ago
          </li>`)
        .join("");
      const html = `
        <div style="min-width:220px;color:#e5e7eb;font-family:Inter,system-ui,sans-serif">
          <div style="font-weight:600;color:white;font-size:13px;margin-bottom:2px">
            ${escape(g.guardName ?? g.name)}
          </div>
          <div style="font-family:ui-monospace,monospace;font-size:10px;color:#aaa;margin-bottom:6px">${escape(g.mac)}</div>
          <div style="font-size:11px;color:#facc15;margin-bottom:6px">
            ~${g.accuracyMeters}m accuracy · ${g.source === "interpolated" ? "interpolated" : "snap-to-scanner"}
          </div>
          <ul style="list-style:none;padding:0;margin:0;border-top:1px solid #333;padding-top:6px">
            ${sampleHtml}
          </ul>
        </div>`;
      marker.bindPopup(html, { className: "sentinel-popup" });
    }

    // Drop markers for guards that disappeared.
    for (const [mac, marker] of guardMarkersRef.current) {
      if (!seen.has(mac)) {
        marker.remove();
        guardMarkersRef.current.delete(mac);
      }
    }
    for (const [mac, ring] of accuracyRingsRef.current) {
      if (!seen.has(mac)) {
        ring.remove();
        accuracyRingsRef.current.delete(mac);
      }
    }
  }, [guardPositions]);

  return (
    <div
      ref={mapRef}
      className="w-full rounded-xl overflow-hidden ring-1 ring-white/10 bg-black"
      style={{ height }}
    />
  );
}

function escape(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
