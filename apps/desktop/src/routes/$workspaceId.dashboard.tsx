import { createFileRoute } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { useAIPage } from "../hooks/useAIPage";
import { useWorkspaceRouteShell } from "../hooks/useWorkspaceRouteShell";
import { DashboardPage } from "../pages/DashboardPage";
import { EmptyStateCard } from "../pages/pageUtils";
import { buildWorkspaceDashboardView } from "../view-models/workspaceDashboard";
import { WorkspaceRouteErrorBoundary } from "./$workspaceId.ai";

export const Route = createFileRoute("/$workspaceId/dashboard")({
  component: WorkspaceDashboardRoute,
  errorComponent: WorkspaceRouteErrorBoundary,
});

function WorkspaceDashboardRoute() {
  const shell = useWorkspaceRouteShell();
  const ai = useAIPage(shell);

  if (!shell.isReady) {
    return (
      <EmptyStateCard
        description="워크스페이스 상태와 문서 지표를 불러오는 중입니다."
        title="대시보드를 준비하고 있습니다"
      />
    );
  }

  if (!shell.activeWorkspaceGraph || !shell.activeWorkspace) {
    return (
      <EmptyStateCard
        actions={
          <Button
            clientLog="워크스페이스 목록"
            onClick={shell.handleWorkspaceLeave}
            variant="outline"
          >
            워크스페이스 목록
          </Button>
        }
        description="현재 워크스페이스 데이터를 찾지 못했습니다. 다른 워크스페이스를 선택해 다시 들어오세요."
        title="워크스페이스 정보를 확인할 수 없습니다"
      />
    );
  }

  const dashboard = buildWorkspaceDashboardView(
    shell.activeWorkspaceGraph,
    shell.activeWorkspace,
    ai.aiEntryPoints,
  );

  return <DashboardPage app={shell} dashboard={dashboard} />;
}
