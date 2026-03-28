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
    <main className="app-frame min-h-screen p-3 sm:p-4">
      <div className="mx-auto flex min-h-[calc(100vh-2rem)] max-w-[1520px] gap-4">
        <aside className="hidden w-[300px] shrink-0 xl:block">
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

        <section className="min-w-0 flex-1 rounded-[calc(var(--radius)+0.75rem)] border border-[var(--border)] bg-[rgba(255,255,255,0.55)] p-4 shadow-[0_30px_120px_-80px_rgba(15,23,42,0.45)] backdrop-blur-xl sm:p-5">
          <header className="mb-4 flex items-center justify-between gap-3 xl:hidden">
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

          <div className="mb-5 rounded-[calc(var(--radius)+0.25rem)] border border-[var(--border)] bg-[var(--surface)] px-4 py-4 sm:px-5">
            <Badge variant="info" className="w-fit">
              {activeArea.label}
            </Badge>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-[var(--foreground)]">
              {pageTitle(app.activeArea, app.activeDocument)}
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--muted-foreground)]">
              {pageDescription(app.activeArea)}
            </p>
          </div>

          {children}
        </section>
      </div>
    </main>
  );
}
