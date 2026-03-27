import { createFileRoute } from "@tanstack/react-router";
import { buildHarnessDocsNavigation } from "../lib/appNavigation";
import { useWorkspaceShell } from "../hooks/useWorkspaceShell";
import { EditorPage } from "../pages/EditorPage";
import { WorkspacePage } from "../pages/WorkspacePage";
import { WorkspaceRouteErrorBoundary } from "./$workspaceId.ai";

export const Route = createFileRoute("/$workspaceId/documents/$documentId/edit")({
  component: WorkspaceDocumentEditRoute,
  errorComponent: WorkspaceRouteErrorBoundary,
});

function WorkspaceDocumentEditRoute() {
  const { documentId, workspaceId } = Route.useParams();
  const routeState = {
    activeArea: "editor" as const,
    activeWorkspaceId: workspaceId,
    selectedDocumentId: documentId,
  };
  const shell = useWorkspaceShell(
    routeState,
    buildHarnessDocsNavigation(Route.useNavigate(), routeState),
  );

  return (
    <WorkspacePage app={shell}>
      <EditorPage app={shell} />
    </WorkspacePage>
  );
}
