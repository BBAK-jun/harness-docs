import { createFileRoute, useRouter } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { usePublishPage } from "../hooks/usePublishPage";
import { useWorkspaceRouteShell } from "../hooks/useWorkspaceRouteShell";
import { PublishPage } from "../pages/PublishPage";
import { RouteErrorStateCard } from "../pages/pageUtils";

export const Route = createFileRoute("/$workspaceId/publish")({
  component: WorkspacePublishRoute,
  errorComponent: PublishRouteErrorBoundary,
});

function WorkspacePublishRoute() {
  const shell = useWorkspaceRouteShell();
  const publish = usePublishPage(shell);

  if (publish.preflightState.status === "error" && publish.publishRecord) {
    throw new Error(publish.preflightState.error ?? "Publish preflight failed.");
  }

  return (
    <PublishPage
      app={shell}
      attemptPreview={publish.attemptPreview}
      executeDisabledReason={publish.executeDisabledReason}
      isRationaleRequired={publish.isRationaleRequired}
      onExecute={publish.handleExecutePublish}
      onGoToApprovals={() => shell.handleAreaChange("approvals")}
      onGoToDocuments={() => shell.handleAreaChange("documents")}
      onGoToEditor={() => shell.handleAreaChange("editor")}
      onRationaleDetailsChange={publish.handleRationaleDetailsChange}
      onRationaleSummaryChange={publish.handleRationaleSummaryChange}
      onReasonCodeToggle={publish.handleReasonCodeToggle}
      onRetryPreflight={publish.retryPreflight}
      preflight={publish.preflight}
      preflightState={publish.preflightState}
      publishRecord={publish.publishRecord}
      publishState={publish.publishState}
      rationaleDraft={publish.rationaleDraft}
    />
  );
}

function PublishRouteErrorBoundary({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  const router = useRouter();

  return (
    <RouteErrorStateCard
      description="발행 전검증 데이터를 불러오지 못했습니다. 다시 시도한 뒤에도 실패하면 워크스페이스 목록으로 돌아가세요."
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
      title="발행 전검증 실패"
    />
  );
}
