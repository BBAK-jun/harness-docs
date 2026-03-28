import { createFileRoute } from "@tanstack/react-router";
import { buildHarnessDocsNavigation } from "../lib/appNavigation";
import { useWorkspaceShell } from "../hooks/useWorkspaceShell";
import { DocumentOverviewPage } from "../pages/DocumentOverviewPage";
import { buildDocumentOverviewView } from "../view-models/documentViews";
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
  const overview =
    shell.activeDocument && shell.activeWorkspaceGraph
      ? buildDocumentOverviewView(shell.activeDocument, shell.activeWorkspaceGraph)
      : null;

  return <DocumentOverviewPage app={shell} overview={overview} />;
}
