import { useState } from "react";
import { Menu } from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

export function AppShellFrame({
  children,
  mobileMeta,
  mobileNavigation,
  sidebar,
}: {
  children: React.ReactNode;
  mobileMeta?: {
    eyebrow: string;
    title: string;
    description: string;
  };
  mobileNavigation?: {
    content: React.ReactNode;
    description: string;
    title: string;
  };
  sidebar: React.ReactNode;
}) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <AppLayout sidebar={sidebar}>
      <main className="app-frame min-h-screen p-3 sm:p-4">
        <div className="mx-auto flex min-h-[calc(100vh-2rem)] max-w-[1520px] gap-4">
          {mobileNavigation ? (
            <Sheet onOpenChange={setMobileNavOpen} open={mobileNavOpen}>
              <SheetContent
                className="w-[min(86vw,20rem)] max-w-none border-r border-[var(--sidebar-border)] bg-[var(--sidebar-background)] p-0 text-[var(--sidebar-foreground)]"
                side="left"
              >
                <SheetHeader className="border-b border-[var(--sidebar-border)] px-5 py-4 pr-12">
                  <SheetTitle className="text-base text-[var(--sidebar-accent-foreground)]">
                    {mobileNavigation.title}
                  </SheetTitle>
                  <SheetDescription className="text-[11px] leading-5 text-[var(--sidebar-muted)]">
                    {mobileNavigation.description}
                  </SheetDescription>
                </SheetHeader>
                <div className="h-[calc(100%-5.25rem)] overflow-y-auto">{mobileNavigation.content}</div>
              </SheetContent>
            </Sheet>
          ) : null}

          <section className="min-w-0 flex-1 rounded-[calc(var(--radius)+0.75rem)] border border-[var(--border)] bg-[rgba(255,255,255,0.55)] p-4 shadow-[0_30px_120px_-80px_rgba(15,23,42,0.45)] backdrop-blur-xl sm:p-5">
            {mobileMeta && mobileNavigation ? (
              <header className="mb-4 flex items-center justify-between gap-3 xl:hidden">
                <Button clientLog="모바일 메뉴 열기" onClick={() => setMobileNavOpen(true)} size="sm" variant="outline">
                  <Menu data-icon="inline-start" />
                  메뉴
                </Button>
                <div className="min-w-0 text-right">
                  <p className="truncate font-medium text-[var(--foreground)]">{mobileMeta.eyebrow}</p>
                  <p className="truncate text-xs uppercase tracking-[0.14em] text-[var(--muted-foreground)]">
                    {mobileMeta.title}
                  </p>
                  <p className="truncate text-sm text-[var(--muted-foreground)]">{mobileMeta.description}</p>
                </div>
              </header>
            ) : null}

            {children}
          </section>
        </div>
      </main>
    </AppLayout>
  );
}
