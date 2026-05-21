"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge, PulseDot } from "@/components/ui/badge";
import { Spotlight } from "@/components/ui/spotlight";
import { FiShield, FiLock, FiUser, FiArrowRight } from "react-icons/fi";

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginInner />
    </Suspense>
  );
}

function LoginInner() {
  const router = useRouter();
  const params = useSearchParams();
  const nextPath = params.get("next") ?? "/dashboard";

  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const username = String(formData.get("username") ?? "");
    const password = String(formData.get("password") ?? "");

    try {
      const res = await fetch("/api/login", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ username, password }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        setError(json.error ?? "Login failed");
        return;
      }
      router.push(nextPath);
      router.refresh();
    } catch {
      setError("Could not reach the server. Is `npm run dev` running?");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen relative grid place-items-center px-4 overflow-hidden grid-bg bg-black">
      <Spotlight className="-top-40 left-0 md:left-60 md:-top-20" fill="rgba(43,127,255,0.6)" />

      <div className="relative z-10 w-full max-w-md">
        <div className="text-center mb-6">
          <Link href="/" className="inline-flex items-center gap-2.5 mb-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-[var(--color-primary)]/15 text-[var(--color-primary)] ring-1 ring-[var(--color-primary)]/30">
              <FiShield className="h-5 w-5" />
            </div>
            <div className="text-left leading-tight">
              <p className="text-sm font-semibold text-white">Sentinel</p>
              <p className="text-[10px] uppercase tracking-[0.18em] text-white/50">Patrol Ops</p>
            </div>
          </Link>
        </div>

        <Card className="relative overflow-hidden p-7 glass">
          <div aria-hidden className="absolute -top-24 -right-24 h-48 w-48 rounded-full bg-[var(--color-primary)]/20 blur-3xl" />

          <div className="relative">
            <Badge variant="info" className="mb-4">
              <PulseDot className="text-[var(--color-primary)]" />
              Secure Admin Portal
            </Badge>

            <h1 className="text-2xl font-semibold tracking-tight text-white">Welcome back</h1>
            <p className="mt-1 text-sm text-[var(--color-muted)]">
              Sign in to access the patrol monitoring dashboard.
            </p>

            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <div className="space-y-1.5">
                <label htmlFor="username" className="text-xs text-[var(--color-muted)] uppercase tracking-[0.12em]">
                  Username
                </label>
                <div className="relative">
                  <FiUser className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--color-muted)]" />
                  <Input id="username" name="username" type="text"
                         placeholder="admin" autoComplete="username" required className="pl-9"
                         defaultValue="admin" />
                </div>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="password" className="text-xs text-[var(--color-muted)] uppercase tracking-[0.12em]">
                  Password
                </label>
                <div className="relative">
                  <FiLock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--color-muted)]" />
                  <Input id="password" name="password" type="password"
                         placeholder="••••••••" autoComplete="current-password" required className="pl-9"
                         defaultValue="admin123" />
                </div>
              </div>

              {error && (
                <div className="text-xs text-[var(--color-danger)] bg-[var(--color-danger)]/10 border border-[var(--color-danger)]/20 rounded-md px-3 py-2">
                  {error}
                </div>
              )}

              <Button type="submit" size="lg" className="w-full" disabled={loading}>
                {loading ? "Signing in…" : (<>Sign in <FiArrowRight className="h-4 w-4" /></>)}
              </Button>
            </form>

            <div className="mt-5 pt-5 border-t border-white/[0.06] text-center">
              <p className="text-xs text-[var(--color-muted)]">
                Default credentials: <code className="mono text-white">admin / admin123</code>
              </p>
              <p className="text-[10px] text-[var(--color-muted)] mt-1">
                Change in <code className="mono">.env.local</code>
              </p>
            </div>
          </div>
        </Card>

        <p className="mt-6 text-center text-xs text-[var(--color-muted)]">
          ← <Link href="/" className="hover:text-white transition-colors">Back to home</Link>
        </p>
      </div>
    </main>
  );
}
