import { AppLayout } from "@/components/AppLayout";
import { PageBreadcrumb } from "@/components/PageBreadcrumb";
import { SidebarTrigger } from "@/components/ui/sidebar";

export function AppShellFrame({
  children,
  headerVariant = "full",
  navigationMeta,
  sidebar,
}: {
  children: React.ReactNode;
  headerVariant?: "compact" | "full";
  navigationMeta?: {
    breadcrumbItems?: string[];
    eyebrow?: string;
    title: string;
    description: string;
  };
  sidebar: React.ReactNode;
}) {
  const breadcrumbItems = navigationMeta?.breadcrumbItems ?? [];

  return (
    <AppLayout sidebar={sidebar}>
      <div className="app-frame min-h-screen p-3 sm:p-4">
        <div className="flex min-h-[calc(100vh-2rem)] w-full gap-4">
          <section className="min-w-0 flex-1 rounded-[calc(var(--radius)+0.75rem)] border border-[var(--border)] bg-[rgba(255,255,255,0.55)] p-4 shadow-[0_30px_120px_-80px_rgba(15,23,42,0.45)] backdrop-blur-xl sm:p-5">
            {navigationMeta ? (
              headerVariant === "compact" ? (
                <header className="mb-5 flex items-center gap-3 border-b border-[var(--border)] pb-4">
                  <SidebarTrigger className="shrink-0 text-[var(--muted-foreground)] hover:bg-[rgba(37,99,235,0.08)] hover:text-[var(--foreground)]" />
                  <div className="min-w-0">
                    <p className="truncate text-[11px] font-medium uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
                      {navigationMeta.eyebrow ?? navigationMeta.title}
                    </p>
                  </div>
                </header>
              ) : (
                <header className="mb-5 flex items-start gap-3 border-b border-[var(--border)] pb-4">
                  <SidebarTrigger className="mt-0.5 shrink-0 text-[var(--muted-foreground)] hover:bg-[rgba(37,99,235,0.08)] hover:text-[var(--foreground)]" />
                  <div className="min-w-0">
                    {navigationMeta.eyebrow ? (
                      <p className="truncate text-[11px] font-medium uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
                        {navigationMeta.eyebrow}
                      </p>
                    ) : null}
                    {breadcrumbItems.length ? (
                      <PageBreadcrumb className="mt-1" items={breadcrumbItems} variant="header" />
                    ) : null}
                    <p className="mt-2 truncate text-sm font-medium text-[var(--foreground)]">
                      {navigationMeta.title}
                    </p>
                    <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                      {navigationMeta.description}
                    </p>
                  </div>
                </header>
              )
            ) : null}

            {children}
          </section>
        </div>
      </div>
    </AppLayout>
  );
}
