import { Sidebar } from "@/components/layout/sidebar";

/**
 * Route-group layout for all authenticated pages.
 * Renders the sidebar and reserves the main content area to its right.
 * Each page is responsible for its own <Topbar />.
 */
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      <Sidebar />
      <div className="md:pl-64">{children}</div>
    </div>
  );
}
