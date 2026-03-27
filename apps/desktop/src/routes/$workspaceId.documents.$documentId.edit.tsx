import { createFileRoute } from "@tanstack/react-router";
import { useHarnessDocsApp } from "../hooks/useHarnessDocsApp";
import { buildHarnessDocsNavigation } from "../lib/appNavigation";
import { EditorPage } from "../pages/EditorPage";
import { WorkspacePage } from "../pages/WorkspacePage";

export const Route = createFileRoute("/$workspaceId/documents/$documentId/edit")({
  component: WorkspaceDocumentEditRoute,
});

function WorkspaceDocumentEditRoute() {
  const { documentId, workspaceId } = Route.useParams();
  const routeState = {
    activeArea: "editor" as const,
    activeWorkspaceId: workspaceId,
    selectedDocumentId: documentId,
  };
  const app = useHarnessDocsApp(
    routeState,
    buildHarnessDocsNavigation(Route.useNavigate(), routeState),
  );

  return (
    <WorkspacePage app={app}>
      <EditorPage app={app} />
    </WorkspacePage>
  );
}
