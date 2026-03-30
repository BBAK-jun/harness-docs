import { createFileRoute } from "@tanstack/react-router";
import { useAIPage } from "../hooks/useAIPage";
import { useWorkspaceRouteShell } from "../hooks/useWorkspaceRouteShell";
import { DocumentsPage } from "../pages/DocumentsPage";
import { WorkspaceRouteErrorBoundary } from "./$workspaceId.ai";

export const Route = createFileRoute("/$workspaceId/documents/")({
  component: WorkspaceDocumentsIndexRoute,
  errorComponent: WorkspaceRouteErrorBoundary,
});

function WorkspaceDocumentsIndexRoute() {
  const shell = useWorkspaceRouteShell();
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
