import { useNavigate } from "@tanstack/react-router";
import { overlay } from "overlay-kit";
import { AppShellFrame } from "@/components/AppShellFrame";
import { AppSidebar } from "@/components/AppSidebar";
import { SignOutConfirmOverlay } from "@/components/overlays/SignOutConfirmOverlay";
import { InsetPanel } from "@/components/pagePanels";
import { Badge } from "@/components/ui/badge";
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
    <AppShellFrame
      mobileMeta={{
        eyebrow: app.activeWorkspace?.name ?? "워크스페이스",
        title: hierarchy.join(" > "),
        description: activeArea.label,
      }}
      mobileNavigation={{
        content: (
          <AppSidebar
            app={app}
            className="h-full w-full"
            layout="drawer"
            onSignOutRequest={() => void handleSignOutRequest()}
          />
        ),
        description: "현재 워크스페이스 안에서 이동할 수 있는 작업 영역입니다.",
        title: "워크스페이스 메뉴",
      }}
      sidebar={<AppSidebar app={app} onSignOutRequest={() => void handleSignOutRequest()} />}
    >
      {showPageBanner ? (
        <InsetPanel className="mb-5 px-4 py-4 sm:px-5" padding="none">
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
        </InsetPanel>
      ) : null}

      {children}
    </AppShellFrame>
  );
}
