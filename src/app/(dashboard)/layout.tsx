import { Sidebar } from "@/components/layout/sidebar";

/**
 * Route-group layout for all authenticated pages.
 * Renders the sidebar and reserves the main content area to its right.
 *
 * Two things to note:
 *   1. `data-theme="dark"` is pinned here so the landing-page light theme
 *      toggle never bleeds into the security console. The dashboard should
 *      always feel like a dark ops center.
 *   2. The inner div has `page-fade-in` so navigating between dashboard
 *      pages animates in gently instead of snapping.
 */
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      data-theme="dark"
      className="min-h-screen bg-[var(--color-bg)]"
    >
      <Sidebar />
      <div className="md:pl-64">
        <div className="page-fade-in">{children}</div>
      </div>
    </div>
  );
}
