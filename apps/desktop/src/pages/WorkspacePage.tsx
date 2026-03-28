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
import type { WorkspaceShellModel } from "../hooks/useWorkspaceShell";
import { areaMeta, pageDescription, pageTitle } from "./pageUtils";

export function WorkspacePage({
  app,
  children,
}: {
  app: WorkspaceShellModel;
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
              <SheetTitle>워크스페이스 탐색</SheetTitle>
              <SheetDescription>
                왼쪽 탐색에서 집중 작업 영역 사이를 이동합니다.
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
              메뉴
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
