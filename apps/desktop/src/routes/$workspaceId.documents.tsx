import { createFileRoute } from "@tanstack/react-router";
import { useAIPage } from "../hooks/useAIPage";
import { buildHarnessDocsNavigation } from "../lib/appNavigation";
import { useWorkspaceShell } from "../hooks/useWorkspaceShell";
import { DocumentsPage } from "../pages/DocumentsPage";
import { WorkspaceRouteErrorBoundary } from "./$workspaceId.ai";

export const Route = createFileRoute("/$workspaceId/documents")({
  component: WorkspaceDocumentsRoute,
  errorComponent: WorkspaceRouteErrorBoundary,
});

function WorkspaceDocumentsRoute() {
  const { workspaceId } = Route.useParams();
  const routeState = {
    activeArea: "documents" as const,
    activeWorkspaceId: workspaceId,
    selectedDocumentId: null,
  };
  const shell = useWorkspaceShell(
    routeState,
    buildHarnessDocsNavigation(Route.useNavigate(), routeState),
  );
  const ai = useAIPage(shell);

  return (
    <DocumentsPage
      aiEntryPoints={ai.aiEntryPoints}
      app={shell}
      onGoToDashboard={() => shell.handleAreaChange("dashboard")}
      onGoToAI={() => shell.handleAreaChange("ai")}
      onOpenWorkspaces={shell.handleWorkspaceLeave}
    />
  );
}
