import { createFileRoute } from "@tanstack/react-router";
import { useWorkspaceRouteShell } from "../hooks/useWorkspaceRouteShell";
import { EditorPage } from "../pages/EditorPage";
import { WorkspaceRouteErrorBoundary } from "./$workspaceId.ai";

export const Route = createFileRoute("/$workspaceId/documents/$documentId/edit")({
  component: WorkspaceDocumentEditRoute,
  errorComponent: WorkspaceRouteErrorBoundary,
});

function WorkspaceDocumentEditRoute() {
  const shell = useWorkspaceRouteShell();

  return <EditorPage app={shell} />;
}
