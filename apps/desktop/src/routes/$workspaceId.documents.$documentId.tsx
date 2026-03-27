import { createFileRoute } from "@tanstack/react-router";
import { useAIPage } from "../hooks/useAIPage";
import { buildHarnessDocsNavigation } from "../lib/appNavigation";
import { useWorkspaceShell } from "../hooks/useWorkspaceShell";
import { DocumentsPage } from "../pages/DocumentsPage";
import { WorkspacePage } from "../pages/WorkspacePage";
import { WorkspaceRouteErrorBoundary } from "./$workspaceId.ai";

export const Route = createFileRoute("/$workspaceId/documents/$documentId")({
  component: WorkspaceDocumentDetailRoute,
  errorComponent: WorkspaceRouteErrorBoundary,
});

function WorkspaceDocumentDetailRoute() {
  const { documentId, workspaceId } = Route.useParams();
  const routeState = {
    activeArea: "documents" as const,
    activeWorkspaceId: workspaceId,
    selectedDocumentId: documentId,
  };
  const shell = useWorkspaceShell(
    routeState,
    buildHarnessDocsNavigation(Route.useNavigate(), routeState),
  );
  const ai = useAIPage(shell);

  return (
    <WorkspacePage app={shell}>
      <DocumentsPage
        aiEntryPoints={ai.aiEntryPoints}
        app={shell}
        onGoToAI={() => shell.handleAreaChange("ai")}
        onOpenWorkspaces={shell.handleWorkspaceLeave}
      />
    </WorkspacePage>
  );
}
