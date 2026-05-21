"use client";

import { Suspense, lazy } from "react";
import { LumaSpin } from "@/components/ui/luma-spin";
const Spline = lazy(() => import("@splinetool/react-spline"));

interface SplineSceneProps {
  scene: string;
  className?: string;
}

/**
 * Lazy-loaded Spline scene used by the hero section to render the 3D robot.
 * Suspense fallback shows the dark-themed loader from globals.css.
 */
export function SplineScene({ scene, className }: SplineSceneProps) {
  return (
    <Suspense
      fallback={
        <div className="w-full h-full flex items-center justify-center">
          <LumaSpin />
        </div>
      }
    >
      <Spline scene={scene} className={className} />
    </Suspense>
  );
}
