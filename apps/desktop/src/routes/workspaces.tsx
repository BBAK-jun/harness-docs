import { Navigate, createFileRoute, useRouter } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { AuthenticatedOnboardingShell } from "../pages/AuthenticatedOnboardingShell";
import { useAppBootstrap } from "../hooks/useAppBootstrap";
import { RouteErrorStateCard } from "../pages/pageUtils";
import { WorkspaceSelectionPage } from "../pages/WorkspaceSelectionPage";
import { desktopQueryKeys } from "../queries/queryKeys";

export const Route = createFileRoute("/workspaces")({
  component: WorkspacesRoute,
  errorComponent: WorkspacesRouteErrorBoundary,
});

function WorkspacesRoute() {
  const bootstrap = useAppBootstrap();
  const router = useRouter();
  const queryClient = useQueryClient();
  const app = {
    ...bootstrap,
    workspaces: bootstrap.session?.workspaces ?? [],
  };

  if (bootstrap.authentication?.status !== "authenticated") {
    return <Navigate to="/sign-in" />;
  }

  return (
    <AuthenticatedOnboardingShell
      activeArea="workspaces"
      lastActiveWorkspaceId={bootstrap.session?.lastActiveWorkspaceId ?? null}
      onOpenArea={(area) => {
        if (area === "workspaces") {
          void router.navigate({ to: "/workspaces" });
          return;
        }

        if (area === "workspace-create") {
          void router.navigate({ to: "/workspace-create" });
          return;
        }

        void router.navigate({ to: "/invitation-acceptance", search: { code: "" } });
      }}
      onOpenLastWorkspace={() => {
        const workspaceId = bootstrap.session?.lastActiveWorkspaceId;

        if (!workspaceId) {
          return;
        }

        void router.navigate({ to: "/$workspaceId/dashboard", params: { workspaceId } });
      }}
      onSignOut={() => bootstrap.handleSignOut()}
      user={bootstrap.authentication?.user ?? null}
      workspaces={app.workspaces}
    >
      <WorkspaceSelectionPage
        app={app}
        onOpenInvitationAcceptance={() => {
          void router.navigate({ to: "/invitation-acceptance", search: { code: "" } });
        }}
        onRefreshWorkspaces={() => {
          void queryClient.invalidateQueries({
            queryKey: desktopQueryKeys.bootstrap(),
          });
        }}
        onOpenSignOut={() => {
          void bootstrap.handleSignOut().finally(() => {
            void router.navigate({ to: "/sign-in" });
          });
        }}
        onOpenWorkspaceCreate={() => {
          void router.navigate({ to: "/workspace-create" });
        }}
        onOpenWorkspace={(workspaceId) => {
          void router.navigate({
            to: "/$workspaceId/dashboard",
            params: { workspaceId },
          });
        }}
        withinShell
      />
    </AuthenticatedOnboardingShell>
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
          clientLog="로그인 화면"
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
