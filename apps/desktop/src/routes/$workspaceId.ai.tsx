import { createFileRoute, useRouter } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { useAIPage } from "../hooks/useAIPage";
import { useWorkspaceRouteShell } from "../hooks/useWorkspaceRouteShell";
import { AIPage } from "../pages/AIPage";
import { RouteErrorStateCard } from "../pages/pageUtils";

export const Route = createFileRoute("/$workspaceId/ai")({
  component: WorkspaceAIRoute,
  errorComponent: WorkspaceRouteErrorBoundary,
});

function WorkspaceAIRoute() {
  const shell = useWorkspaceRouteShell();
  const ai = useAIPage(shell);

  return (
    <AIPage
      aiEntryPoints={ai.aiEntryPoints}
      providerStatuses={shell.desktopShell?.aiProviderStatuses ?? null}
      onGoToDocuments={() => shell.handleAreaChange("documents")}
      onGoToEditor={() => shell.handleAreaChange("editor")}
      onLaunch={ai.handleLaunchAITaskEntryPoint}
    />
  );
}

export function WorkspaceRouteErrorBoundary({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  const router = useRouter();

  return (
    <RouteErrorStateCard
      description="이 작업 영역 페이지를 렌더링하지 못했습니다. 다시 시도하거나 워크스페이스 목록으로 돌아가세요."
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
      title="페이지 로딩 실패"
    />
  );
}
