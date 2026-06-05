"use client";

import { useEffect, useRef, useState } from "react";
import { useLive } from "@/hooks/use-live";
import type { AlertType, EmergencyAlert } from "@/types";

// ---------------------------------------------------------------------------
// GlobalAlertWatcher
//
// Mounts inside the dashboard layout so it lives on EVERY authenticated page,
// not just /alerts. Polls /api/emergency-alerts, detects newly arrived
// unacknowledged alerts (by comparing IDs across polls), and plays the alarm
// beep + voice announcement.
//
// Why it must be global:
//   The /alerts page already detected and announced new alerts, but that code
//   only ran while the user had that page open. So a guard pressing a panic
//   button while the admin was on /dashboard heard nothing until they
//   navigated to /alerts. With this watcher, audio fires anywhere within the
//   logged-in dashboard.
//
// Why NOT before login:
//   Audio alarms require knowing who you are (auth) so we don't broadcast
//   emergencies to anyone visiting the URL. Also, browsers block audio until
//   the user interacts with the page anyway.
//
// Mute control:
//   The mute toggle on /alerts writes to localStorage AND dispatches a
//   "sentinel:mute-changed" custom event, so this watcher updates in real
//   time without polling localStorage. State persists across reloads.
// ---------------------------------------------------------------------------

// Visual treatment per alert type (just labels here — colors used by the alerts page).
const TYPE_LABEL: Record<AlertType, string> = {
  accident: "Accident",
  fire:     "Fire",
  bleeding: "Bleeding",
  fight:    "Fight",
};

/** Beep: three short square-wave pulses synthesised with Web Audio API. */
function playAlarmBeep() {
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    for (let i = 0; i < 3; i++) {
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "square";
      osc.frequency.value = 880;

      const start = ctx.currentTime + i * 0.18;
      const stop  = start + 0.10;
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(0.18, start + 0.01);
      gain.gain.linearRampToValueAtTime(0,    stop);
      osc.start(start);
      osc.stop(stop + 0.02);
    }
    setTimeout(() => { ctx.close().catch(() => {}); }, 700);
  } catch {
    /* Audio blocked by browser autoplay policy — silently ignore */
  }
}

/** Voice: speak the alert type + location three times. */
function speakAlert(type: AlertType, location: string) {
  try {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const phrase = `${TYPE_LABEL[type] ?? type} is detected at ${location}.`;
    for (let i = 0; i < 3; i++) {
      const u = new SpeechSynthesisUtterance(phrase);
      u.lang   = "en-IN";
      u.rate   = 0.95;
      u.pitch  = 1.0;
      u.volume = 1.0;
      window.speechSynthesis.speak(u);
    }
  } catch {
    /* SpeechSynthesis not available — ignore */
  }
}

export function GlobalAlertWatcher() {
  // Poll the alerts endpoint independently of the /alerts page. We poll less
  // frequently than the page itself (5s vs 3s) since we only need it for
  // "did a new alert appear" detection.
  const { data: alerts } = useLive<EmergencyAlert[]>("/api/emergency-alerts",
    { select: (r) => (r as { items: EmergencyAlert[] }).items, intervalMs: 5000 });

  // IDs we've already seen. Stays in memory for the lifetime of the dashboard
  // session (across page navigations, since the layout component doesn't
  // unmount when you switch pages within /(dashboard)/...).
  const seenIdsRef = useRef<Set<string> | null>(null);

  // Mute state — initialised from localStorage so the user's choice persists
  // across reloads. Synchronised with the /alerts page via a custom event.
  const [muted, setMuted] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    try { return window.localStorage.getItem("sentinel-alerts-muted") === "1"; }
    catch { return false; }
  });

  // Listen for mute changes coming from anywhere else in the app.
  useEffect(() => {
    function onMuteChange(e: Event) {
      const ce = e as CustomEvent<boolean>;
      setMuted(!!ce.detail);
      // If muted mid-utterance, stop the speech queue.
      if (ce.detail && typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    }
    window.addEventListener("sentinel:mute-changed", onMuteChange);
    return () => window.removeEventListener("sentinel:mute-changed", onMuteChange);
  }, []);

  // New-alert detection. Fires audio for any newly-arrived UNacknowledged
  // alert. Initial poll captures the existing set without beeping (so we
  // don't blast an old alert in the user's ear on every page load).
  useEffect(() => {
    if (!alerts) return;
    const currentIds = new Set(alerts.map((a) => a.id));

    if (seenIdsRef.current === null) {
      // First time we see the alerts — capture, don't beep
      seenIdsRef.current = currentIds;
      return;
    }

    const newOnes = alerts.filter(
      (a) => !seenIdsRef.current!.has(a.id) && !a.acknowledged
    );

    if (newOnes.length > 0 && !muted) {
      playAlarmBeep();
      // Speak each new alert sequentially. SpeechSynthesis queues utterances
      // automatically, so a burst of alerts narrates one after another.
      for (const a of newOnes) {
        speakAlert(a.type, a.location);
      }
    }

    // Also broadcast a custom event so the /alerts page can flash matching
    // cards even though IT no longer calls the audio functions itself.
    if (newOnes.length > 0) {
      window.dispatchEvent(new CustomEvent("sentinel:new-alert", {
        detail: { ids: newOnes.map((a) => a.id) },
      }));
    }

    seenIdsRef.current = currentIds;
  }, [alerts, muted]);

  // This component renders nothing. It exists purely for its effects.
  return null;
}
