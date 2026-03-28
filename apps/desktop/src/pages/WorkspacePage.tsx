import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Menu } from "lucide-react";
import { overlay } from "overlay-kit";
import { AppLayout } from "@/components/AppLayout";
import { AppSidebar } from "@/components/AppSidebar";
import { SignOutConfirmOverlay } from "@/components/overlays/SignOutConfirmOverlay";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { WorkspaceShellModel } from "../hooks/useWorkspaceShell";
import { areaMeta, pageDescription, pageHierarchy, pageTitle } from "./pageUtils";

export function WorkspacePage({
  app,
  children,
}: {
  app: WorkspaceShellModel;
  children: React.ReactNode;
}) {
  const navigate = useNavigate();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const activeArea = areaMeta[app.activeArea];
  const hierarchy = ["워크스페이스", ...pageHierarchy(app.activeArea, app.activeDocument)];
  const showPageBanner = app.activeArea !== "dashboard";

  const handleSignOutRequest = async () => {
    const shouldSignOut = await overlay.openAsync<boolean>(({ isOpen, close, unmount }) => (
      <SignOutConfirmOverlay
        close={close}
        isOpen={isOpen}
        onConfirm={async () => {
          await app.handleSignOut();
        }}
        unmount={unmount}
      />
    ));

    if (!shouldSignOut) {
      return;
    }

    await navigate({ to: "/sign-in" });
  };

  return (
    <>
      <AppLayout sidebar={<AppSidebar app={app} onSignOutRequest={() => void handleSignOutRequest()} />}>
        <main className="app-frame min-h-screen p-3 sm:p-4">
          <div className="mx-auto flex min-h-[calc(100vh-2rem)] max-w-[1520px] gap-4">
            <Sheet onOpenChange={setMobileNavOpen} open={mobileNavOpen}>
              <SheetContent side="left">
                <SheetHeader>
                  <SheetTitle>워크스페이스 탐색</SheetTitle>
                  <SheetDescription>러버블 기준 앱 셸 탐색입니다.</SheetDescription>
                </SheetHeader>
                <div className="mt-4">
                  <AppSidebar app={app} onSignOutRequest={() => void handleSignOutRequest()} />
                </div>
              </SheetContent>
            </Sheet>

            <section className="min-w-0 flex-1 rounded-[calc(var(--radius)+0.75rem)] border border-[var(--border)] bg-[rgba(255,255,255,0.55)] p-4 shadow-[0_30px_120px_-80px_rgba(15,23,42,0.45)] backdrop-blur-xl sm:p-5">
              <header className="mb-4 flex items-center justify-between gap-3 xl:hidden">
                <Button onClick={() => setMobileNavOpen(true)} size="sm" variant="outline">
                  <Menu data-icon="inline-start" />
                  메뉴
                </Button>
                <div className="min-w-0 text-right">
                  <p className="truncate font-medium text-[var(--foreground)]">{app.activeWorkspace?.name}</p>
                  <p className="truncate text-xs uppercase tracking-[0.14em] text-[var(--muted-foreground)]">
                    {hierarchy.join(" > ")}
                  </p>
                  <p className="truncate text-sm text-[var(--muted-foreground)]">{activeArea.label}</p>
                </div>
              </header>

              {showPageBanner ? (
                <div className="mb-5 rounded-[calc(var(--radius)+0.25rem)] border border-[var(--border)] bg-[var(--surface)] px-4 py-4 sm:px-5">
                  <p className="text-xs font-medium uppercase tracking-[0.16em] text-[var(--muted-foreground)]">
                    {hierarchy.join(" > ")}
                  </p>
                  <Badge className="mt-3 w-fit" variant="info">
                    {activeArea.label}
                  </Badge>
                  <h1 className="mt-3 text-3xl font-semibold tracking-tight text-[var(--foreground)]">
                    {pageTitle(app.activeArea, app.activeDocument)}
                  </h1>
                  <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--muted-foreground)]">
                    {pageDescription(app.activeArea)}
                  </p>
                </div>
              ) : null}

              {children}
            </section>
          </div>
        </main>
      </AppLayout>
    </>
  );
}
