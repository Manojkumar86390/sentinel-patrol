import { Sidebar } from "@/components/layout/sidebar";
import { GlobalAlertWatcher } from "@/components/dashboard/global-alert-watcher";

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
 *   3. `<GlobalAlertWatcher />` runs in the background on every dashboard
 *      page, polling for new emergency alerts and playing audio. This is
 *      separate from the /alerts page's own polling so audio fires even
 *      when the user is on Dashboard, Logs, Live Status, etc.
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
      <GlobalAlertWatcher />
      <Sidebar />
      <div className="md:pl-64">
        <div className="page-fade-in">{children}</div>
      </div>
    </div>
  );
}
