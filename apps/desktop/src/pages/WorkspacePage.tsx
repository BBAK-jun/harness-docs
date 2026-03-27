import { useState } from "react";
import { Menu } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { WorkspaceLnb } from "@/components/WorkspaceLnb";
import type { HarnessDocsAppModel } from "../hooks/useHarnessDocsApp";
import { areaMeta, pageDescription, pageTitle } from "./pageUtils";

export function WorkspacePage({
  app,
  children,
}: {
  app: HarnessDocsAppModel;
  children: React.ReactNode;
}) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const activeArea = areaMeta[app.activeArea];

  return (
    <main className="app-frame min-h-screen p-4 sm:p-6">
      <div className="mx-auto flex max-w-6xl gap-6">
        <aside className="hidden w-72 shrink-0 lg:block">
          <WorkspaceLnb app={app} />
        </aside>

        <Sheet onOpenChange={setMobileNavOpen} open={mobileNavOpen}>
          <SheetContent side="left">
            <SheetHeader>
              <SheetTitle>Workspace Navigation</SheetTitle>
              <SheetDescription>
                Move between focused work areas from the left navigation.
              </SheetDescription>
            </SheetHeader>
            <SheetBody>
              <WorkspaceLnb app={app} onNavigate={() => setMobileNavOpen(false)} />
            </SheetBody>
          </SheetContent>
        </Sheet>

        <section className="min-w-0 flex-1">
          <header className="mb-4 flex items-center justify-between gap-3 lg:hidden">
            <Button onClick={() => setMobileNavOpen(true)} size="sm" variant="outline">
              <Menu data-icon="inline-start" />
              Menu
            </Button>
            <div className="min-w-0 text-right">
              <p className="truncate font-medium text-[var(--foreground)]">
                {app.activeWorkspace?.name}
              </p>
              <p className="truncate text-sm text-[var(--muted-foreground)]">{activeArea.label}</p>
            </div>
          </header>

          <div className="mb-4 flex flex-col gap-2">
            <Badge variant="info" className="w-fit">
              {activeArea.label}
            </Badge>
            <h1 className="text-3xl font-semibold tracking-tight text-[var(--foreground)]">
              {pageTitle(app.activeArea, app.activeDocument)}
            </h1>
            <p className="max-w-2xl text-sm leading-6 text-[var(--muted-foreground)]">
              {pageDescription(app.activeArea)}
            </p>
          </div>

          {children}
        </section>
      </div>
    </main>
  );
}
