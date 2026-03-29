import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { WorkspaceCreateRequestDto } from "@harness-docs/contracts";
import { Navigate, createFileRoute, useRouter } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { useAppBootstrap, loadBootstrapState } from "../hooks/useAppBootstrap";
import { AuthenticatedOnboardingShell } from "../pages/AuthenticatedOnboardingShell";
import { RouteErrorStateCard } from "../pages/pageUtils";
import { WorkspaceCreatePage } from "../pages/WorkspaceCreatePage";
import { desktopMutationKeys, desktopQueryKeys } from "../queries/queryKeys";

export const Route = createFileRoute("/workspace-create")({
  component: WorkspaceCreateRoute,
  errorComponent: WorkspaceCreateErrorBoundary,
});

function WorkspaceCreateRoute() {
  const app = useAppBootstrap();
  const queryClient = useQueryClient();
  const router = useRouter();
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const createWorkspaceMutation = useMutation({
    mutationKey: desktopMutationKeys.workspace.create(),
    mutationFn: async (input: WorkspaceCreateRequestDto) => {
      await app.services.workspaceOnboarding.createWorkspace(input);
      const nextBootstrap = await loadBootstrapState(app.services);
      queryClient.setQueryData(desktopQueryKeys.bootstrap(), nextBootstrap);
      return nextBootstrap;
    },
    onMutate: () => {
      setSubmissionError(null);
    },
    onError: (error) => {
      setSubmissionError(error instanceof Error ? error.message : "Workspace creation failed.");
    },
  });

  if (app.authentication?.status !== "authenticated") {
    return <Navigate to="/sign-in" />;
  }

  return (
    <AuthenticatedOnboardingShell
      activeArea="workspace-create"
      lastActiveWorkspaceId={app.session?.lastActiveWorkspaceId ?? null}
      onOpenArea={(area) => {
        if (area === "workspaces") {
          void router.navigate({ to: "/workspaces" });
          return;
        }

        if (area === "workspace-create") {
          void router.navigate({ to: "/workspace-create" });
          return;
        }

        void router.navigate({ to: "/invitation-acceptance" });
      }}
      onOpenLastWorkspace={() => {
        const workspaceId = app.session?.lastActiveWorkspaceId;

        if (!workspaceId) {
          return;
        }

        void router.navigate({ to: "/$workspaceId/dashboard", params: { workspaceId } });
      }}
      onSignOut={() => app.handleSignOut()}
      user={app.authentication?.user ?? null}
      workspaces={app.session?.workspaces ?? []}
    >
      <WorkspaceCreatePage
        defaultRepoOwner={app.authentication?.user?.githubLogin ?? ""}
        errorMessage={submissionError}
        isSubmitting={createWorkspaceMutation.isPending}
        onCancel={() => {
          void router.navigate({ to: "/workspaces" });
        }}
        onCreate={async (input) => {
          const nextBootstrap = await createWorkspaceMutation.mutateAsync(input);
          const workspaceId = nextBootstrap.appSession?.workspace?.lastActiveWorkspaceId;

          if (!workspaceId) {
            throw new Error("Workspace was created but no active workspace was returned.");
          }

          await router.navigate({
            to: "/$workspaceId/dashboard",
            params: {
              workspaceId,
            },
          });
        }}
        withinShell
      />
    </AuthenticatedOnboardingShell>
  );
}

function WorkspaceCreateErrorBoundary({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  const router = useRouter();

  return (
    <RouteErrorStateCard
      description="워크스페이스 생성 안내 화면을 불러오지 못했습니다. 다시 시도하거나 워크스페이스 목록으로 이동하세요."
      errorMessage={error.message}
      onRetry={() => {
        reset();
        void router.invalidate();
      }}
      secondaryAction={
        <Button
          clientLog="워크스페이스 목록"
          onClick={() => {
            reset();
            void router.navigate({ to: "/workspaces" });
          }}
          variant="outline"
        >
          워크스페이스 목록
        </Button>
      }
      title="워크스페이스 생성 화면 오류"
    />
  );
}
