"use client";

import { useEffect, useRef, useState } from "react";

interface UseLiveResult<T> {
  data: T | null;
  error: string | null;
  loading: boolean;
  refresh: () => Promise<void>;
}

/**
 * Fetch JSON from `url` and refresh every `intervalMs` milliseconds.
 * Stops polling when the tab is hidden, resumes when it's visible again.
 *
 * Pass `select` to pull a nested field out of the response without writing
 * a separate state hook in each page.
 */
export function useLive<T>(
  url: string,
  options: {
    intervalMs?: number;
    select?: (raw: unknown) => T;
  } = {}
): UseLiveResult<T> {
  const { intervalMs = 5000, select } = options;
  const [data,    setData]    = useState<T | null>(null);
  const [error,   setError]   = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const aliveRef = useRef(true);

  async function load() {
    try {
      const res = await fetch(url, { credentials: "include", cache: "no-store" });
      if (!aliveRef.current) return;

      if (res.status === 401) {
        // Session expired – bounce to login.
        if (typeof window !== "undefined") window.location.href = "/login";
        return;
      }

      const json = await res.json();
      if (!json.ok) throw new Error(json.error ?? "Request failed");

      setData((select ? select(json) : json) as T);
      setError(null);
    } catch (e) {
      if (aliveRef.current) setError(e instanceof Error ? e.message : "Network error");
    } finally {
      if (aliveRef.current) setLoading(false);
    }
  }

  function schedule() {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      if (document.visibilityState === "visible") await load();
      schedule();
    }, intervalMs);
  }

  useEffect(() => {
    aliveRef.current = true;
    load();
    schedule();
    const onVis = () => { if (document.visibilityState === "visible") load(); };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      aliveRef.current = false;
      if (timerRef.current) clearTimeout(timerRef.current);
      document.removeEventListener("visibilitychange", onVis);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, intervalMs]);

  return { data, error, loading, refresh: load };
}
