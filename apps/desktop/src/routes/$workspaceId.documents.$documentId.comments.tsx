import { createFileRoute } from "@tanstack/react-router";
import { useHarnessDocsApp } from "../hooks/useHarnessDocsApp";
import { buildHarnessDocsNavigation } from "../lib/appNavigation";
import { CommentsPage } from "../pages/CommentsPage";
import { WorkspacePage } from "../pages/WorkspacePage";

export const Route = createFileRoute("/$workspaceId/documents/$documentId/comments")({
  component: WorkspaceDocumentCommentsRoute,
});

function WorkspaceDocumentCommentsRoute() {
  const { documentId, workspaceId } = Route.useParams();
  const routeState = {
    activeArea: "comments" as const,
    activeWorkspaceId: workspaceId,
    selectedDocumentId: documentId,
  };
  const app = useHarnessDocsApp(
    routeState,
    buildHarnessDocsNavigation(Route.useNavigate(), routeState),
  );

  return (
    <WorkspacePage app={app}>
      <CommentsPage app={app} />
    </WorkspacePage>
  );
}
