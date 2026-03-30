import { createFileRoute } from "@tanstack/react-router";
import { useWorkspaceRouteShell } from "../hooks/useWorkspaceRouteShell";
import { DocumentOverviewPage } from "../pages/DocumentOverviewPage";
import { buildDocumentOverviewView } from "../view-models/documentViews";
import { WorkspaceRouteErrorBoundary } from "./$workspaceId.ai";

export const Route = createFileRoute("/$workspaceId/documents/$documentId/")({
  component: WorkspaceDocumentOverviewRoute,
  errorComponent: WorkspaceRouteErrorBoundary,
});

function WorkspaceDocumentOverviewRoute() {
  const shell = useWorkspaceRouteShell();
  const overview =
    shell.activeDocument && shell.activeWorkspaceGraph
      ? buildDocumentOverviewView(shell.activeDocument, shell.activeWorkspaceGraph)
      : null;

  return <DocumentOverviewPage app={shell} overview={overview} />;
}
