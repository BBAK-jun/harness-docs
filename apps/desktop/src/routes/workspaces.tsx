import { Navigate, createFileRoute, useRouter } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { useAppBootstrap } from "../hooks/useAppBootstrap";
import { buildHarnessDocsNavigation } from "../lib/appNavigation";
import { RouteErrorStateCard } from "../pages/pageUtils";
import { WorkspaceSelectionPage } from "../pages/WorkspaceSelectionPage";

export const Route = createFileRoute("/workspaces")({
  component: WorkspacesRoute,
  errorComponent: WorkspacesRouteErrorBoundary,
});

function WorkspacesRoute() {
  const bootstrap = useAppBootstrap();
  const router = useRouter();
  const routeState = {
    activeArea: "dashboard" as const,
    activeWorkspaceId: null,
    selectedDocumentId: null,
  };
  const navigation = buildHarnessDocsNavigation(Route.useNavigate(), routeState);
  const app = {
    ...bootstrap,
    workspaces: bootstrap.session?.workspaces ?? [],
    handleWorkspaceEnter: navigation.onWorkspaceEnter,
  };

  const preferredWorkspaceId =
    bootstrap.session?.lastActiveWorkspaceId ??
    app.workspaces[0]?.id ??
    null;

  if (preferredWorkspaceId) {
    return <Navigate params={{ workspaceId: preferredWorkspaceId }} to="/$workspaceId/dashboard" />;
  }

  return (
    <WorkspaceSelectionPage
      app={app}
      onOpenInvitationAcceptance={() => {
        void router.navigate({ to: "/invitation-acceptance" });
      }}
      onOpenSignOut={() => {
        void router.navigate({ to: "/sign-out" });
      }}
      onOpenWorkspaceCreate={() => {
        void router.navigate({ to: "/workspace-create" });
      }}
    />
  );
}

function WorkspacesRouteErrorBoundary({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  const router = useRouter();

  return (
    <RouteErrorStateCard
      description="워크스페이스 목록을 불러오지 못했습니다. 다시 시도하거나 로그인 화면으로 이동하세요."
      errorMessage={error.message}
      onRetry={() => {
        reset();
        void router.invalidate();
      }}
      secondaryAction={
        <Button
          onClick={() => {
            reset();
            void router.navigate({ to: "/sign-in" });
          }}
          variant="outline"
        >
          로그인 화면
        </Button>
      }
      title="워크스페이스 로딩 실패"
    />
  );
}
