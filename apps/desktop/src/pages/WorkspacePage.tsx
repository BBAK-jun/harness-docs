import { useNavigate } from "@tanstack/react-router";
import { overlay } from "overlay-kit";
import { AppShellFrame } from "@/components/AppShellFrame";
import { AppSidebar } from "@/components/AppSidebar";
import { SignOutConfirmOverlay } from "@/components/overlays/SignOutConfirmOverlay";
import { PageBreadcrumb } from "@/components/PageBreadcrumb";
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
      headerVariant="compact"
      navigationMeta={{
        breadcrumbItems: hierarchy,
        eyebrow: app.activeWorkspace?.name ?? "워크스페이스",
        title: pageTitle(app.activeArea, app.activeDocument),
        description: pageDescription(app.activeArea),
      }}
      sidebar={<AppSidebar app={app} onSignOutRequest={() => void handleSignOutRequest()} />}
    >
      <InsetPanel className="mb-5 px-4 py-4 sm:px-5" padding="none">
        <PageBreadcrumb items={hierarchy} />
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

      {children}
    </AppShellFrame>
  );
}
