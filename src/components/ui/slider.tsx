"use client";

import * as React from "react";
import * as SliderPrimitive from "@radix-ui/react-slider";
import { cn } from "@/lib/utils";

interface SliderProps
  extends Omit<React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root>, "value" | "onValueChange" | "onChange"> {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  label?: string;
  /** Format function for the live value display. */
  formatValue?: (v: number) => string;
}

/**
 * Single-thumb slider with a value pill above the thumb.
 * Uses @radix-ui/react-slider (already in package.json) for keyboard a11y.
 */
export function Slider({
  value,
  onChange,
  min = 0,
  max = 100,
  step = 1,
  label,
  formatValue = (v) => String(v),
  className,
  ...rest
}: SliderProps) {
  const pct = ((value - min) / (max - min)) * 100;

  return (
    <div className={cn("w-full", className)}>
      {label && (
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs uppercase tracking-[0.12em] text-[var(--color-muted)]">
            {label}
          </label>
          <span className="mono text-xs text-white">{formatValue(value)}</span>
        </div>
      )}

      <SliderPrimitive.Root
        className="relative flex w-full touch-none select-none items-center h-10"
        min={min}
        max={max}
        step={step}
        value={[value]}
        onValueChange={(v) => onChange(v[0])}
        {...rest}
      >
        <SliderPrimitive.Track className="relative h-1.5 w-full grow overflow-hidden rounded-full bg-white/[0.06]">
          <SliderPrimitive.Range className="absolute h-full bg-gradient-to-r from-[var(--color-primary)] to-cyan-400" />
        </SliderPrimitive.Track>

        <SliderPrimitive.Thumb
          aria-label={label ?? "slider"}
          className="relative block h-5 w-5 rounded-full border-2 border-white bg-[var(--color-primary)] shadow-[0_0_12px_-2px_var(--color-primary)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-bg)] transition-transform hover:scale-110"
        >
          <span
            className="absolute -top-9 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-md bg-[var(--color-primary)] text-white text-[10px] mono shadow-lg pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity"
            style={{ left: "50%" }}
          >
            {formatValue(value)}
          </span>
        </SliderPrimitive.Thumb>
      </SliderPrimitive.Root>

      <div className="flex justify-between text-[10px] mono text-[var(--color-muted)] mt-1">
        <span>{formatValue(min)}</span>
        <span style={{ visibility: pct > 5 && pct < 95 ? "hidden" : "visible" }}>
          {formatValue(max)}
        </span>
      </div>
    </div>
  );
}
