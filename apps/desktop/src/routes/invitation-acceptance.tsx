import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { WorkspaceInvitationAcceptRequestDto } from "@harness-docs/contracts";
import { Navigate, createFileRoute, useRouter } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { useAppBootstrap, loadBootstrapState } from "../hooks/useAppBootstrap";
import { AuthenticatedOnboardingShell } from "../pages/AuthenticatedOnboardingShell";
import { InvitationAcceptancePage } from "../pages/InvitationAcceptancePage";
import { RouteErrorStateCard } from "../pages/pageUtils";
import { desktopMutationKeys, desktopQueryKeys } from "../queries/queryKeys";

export const Route = createFileRoute("/invitation-acceptance")({
  validateSearch: (search: Record<string, unknown>) => ({
    code: typeof search.code === "string" ? search.code.trim() : "",
  }),
  component: InvitationAcceptanceRoute,
  errorComponent: InvitationAcceptanceErrorBoundary,
});

function InvitationAcceptanceRoute() {
  const app = useAppBootstrap();
  const search = Route.useSearch();
  const queryClient = useQueryClient();
  const router = useRouter();
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const acceptWorkspaceInvitationMutation = useMutation({
    mutationKey: desktopMutationKeys.workspace.acceptInvitation(),
    mutationFn: async (input: WorkspaceInvitationAcceptRequestDto) => {
      await app.services.workspaceOnboarding.acceptWorkspaceInvitation(input);
      const nextBootstrap = await loadBootstrapState(app.services);
      queryClient.setQueryData(desktopQueryKeys.bootstrap(), nextBootstrap);
      return nextBootstrap;
    },
    onMutate: () => {
      setSubmissionError(null);
    },
    onError: (error) => {
      setSubmissionError(
        error instanceof Error ? error.message : "Workspace invitation acceptance failed.",
      );
    },
  });

  if (app.authentication?.status !== "authenticated") {
    return <Navigate to="/sign-in" />;
  }

  return (
    <AuthenticatedOnboardingShell
      activeArea="invitation-acceptance"
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

        void router.navigate({ to: "/invitation-acceptance", search: { code: "" } });
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
      <InvitationAcceptancePage
        defaultInvitationCode={search.code}
        errorMessage={submissionError}
        isSubmitting={acceptWorkspaceInvitationMutation.isPending}
        onAccept={async (input) => {
          const nextBootstrap = await acceptWorkspaceInvitationMutation.mutateAsync(input);
          const workspaceId =
            nextBootstrap.appSession?.workspace?.lastActiveWorkspaceId ??
            nextBootstrap.appSession?.workspace?.workspaces[0]?.id ??
            null;

          if (!workspaceId) {
            throw new Error("Invitation was accepted but no active workspace was returned.");
          }

          await router.navigate({
            to: "/$workspaceId/dashboard",
            params: {
              workspaceId,
            },
          });
        }}
        onCancel={() => {
          void router.navigate({ to: "/workspaces" });
        }}
        onOpenWorkspaceCreate={() => {
          void router.navigate({ to: "/workspace-create" });
        }}
        withinShell
      />
    </AuthenticatedOnboardingShell>
  );
}

function InvitationAcceptanceErrorBoundary({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  const router = useRouter();

  return (
    <RouteErrorStateCard
      description="초대 수락 안내 화면을 불러오지 못했습니다. 다시 시도하거나 워크스페이스 목록으로 이동하세요."
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
      title="초대 수락 화면 오류"
    />
  );
}
