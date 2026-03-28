import { createFileRoute } from "@tanstack/react-router";
import { useAIPage } from "../hooks/useAIPage";
import { buildHarnessDocsNavigation } from "../lib/appNavigation";
import { useWorkspaceShell } from "../hooks/useWorkspaceShell";
import { DashboardPage } from "../pages/DashboardPage";
import { buildWorkspaceDashboardView } from "../view-models/workspaceDashboard";
import { WorkspaceRouteErrorBoundary } from "./$workspaceId.ai";

export const Route = createFileRoute("/$workspaceId/dashboard")({
  component: WorkspaceDashboardRoute,
  errorComponent: WorkspaceRouteErrorBoundary,
});

function WorkspaceDashboardRoute() {
  const { workspaceId } = Route.useParams();
  const routeState = {
    activeArea: "dashboard" as const,
    activeWorkspaceId: workspaceId,
    selectedDocumentId: null,
  };
  const shell = useWorkspaceShell(
    routeState,
    buildHarnessDocsNavigation(Route.useNavigate(), routeState),
  );
  const ai = useAIPage(shell);

  if (!shell.activeWorkspaceGraph || !shell.activeWorkspace) {
    return null;
  }

  const dashboard = buildWorkspaceDashboardView(
    shell.activeWorkspaceGraph,
    shell.activeWorkspace,
    ai.aiEntryPoints,
  );

  return <DashboardPage app={shell} dashboard={dashboard} />;
}
