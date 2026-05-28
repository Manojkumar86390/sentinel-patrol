"use client";

import { useEffect, useState } from "react";
import { FiSun, FiMoon } from "react-icons/fi";

/**
 * Tiny sun/moon button that flips the landing-page color scheme between
 * dark (default) and light by toggling a `data-theme` attribute on the
 * wrapping element. We persist the user's choice in localStorage so it
 * survives reloads, but each page mount checks system preference first if
 * nothing's been saved.
 *
 * Scope: applied to the parent that includes this component, so we can have
 * a light landing page and a dark dashboard side by side without bleeding.
 */
export function ThemeToggle() {
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  // On mount: read saved preference, else respect system "prefers-color-scheme".
  useEffect(() => {
    let initial: "dark" | "light" = "dark";
    try {
      const saved = window.localStorage.getItem("sentinel-landing-theme");
      if (saved === "light" || saved === "dark") {
        initial = saved;
      } else if (window.matchMedia?.("(prefers-color-scheme: light)").matches) {
        initial = "light";
      }
    } catch {
      /* localStorage blocked — fall back to dark */
    }
    setTheme(initial);
  }, []);

  // Apply attribute to the document root so the CSS selector picks it up.
  // We scope to <html> deliberately — the dashboard pages set
  // data-theme="dark" inline, which overrides this for those routes.
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    try {
      window.localStorage.setItem("sentinel-landing-theme", theme);
    } catch {
      /* ignore */
    }
  }, [theme]);

  const flip = () => setTheme((t) => (t === "dark" ? "light" : "dark"));
  const Icon = theme === "dark" ? FiSun : FiMoon;
  const label = theme === "dark" ? "Switch to light mode" : "Switch to dark mode";

  return (
    <button
      type="button"
      onClick={flip}
      aria-label={label}
      title={label}
      className="grid h-9 w-9 place-items-center rounded-md border border-white/10 bg-white/[0.04] text-[var(--color-muted)] hover:text-white hover:bg-white/[0.08] transition-colors"
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}
