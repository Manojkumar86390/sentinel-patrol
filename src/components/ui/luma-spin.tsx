"use client";

import { cn } from "@/lib/utils";

interface LumaSpinProps {
  className?: string;
  /** Diameter in pixels. Default 65. */
  size?: number;
}

/**
 * Two-square chasing loader. The original used `<style jsx>` which doesn't
 * work in our setup; the animation is hoisted into globals.css instead.
 */
export function LumaSpin({ className, size = 65 }: LumaSpinProps) {
  return (
    <div
      className={cn("luma-spin relative aspect-square", className)}
      style={{ width: size, ["--lumaInset" as never]: `${Math.round(size * 0.54)}px` }}
    >
      <span className="absolute rounded-full luma-spin-anim shadow-[inset_0_0_0_3px] shadow-[var(--color-primary)]" />
      <span className="absolute rounded-full luma-spin-anim luma-spin-delay shadow-[inset_0_0_0_3px] shadow-white/80" />
    </div>
  );
}
