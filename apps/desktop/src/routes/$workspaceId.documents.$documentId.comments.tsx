import { createFileRoute } from "@tanstack/react-router";
import { buildHarnessDocsNavigation } from "../lib/appNavigation";
import { useCommentsPage } from "../hooks/useCommentsPage";
import { useWorkspaceShell } from "../hooks/useWorkspaceShell";
import { CommentsPage } from "../pages/CommentsPage";
import { WorkspaceRouteErrorBoundary } from "./$workspaceId.ai";

export const Route = createFileRoute("/$workspaceId/documents/$documentId/comments")({
  component: WorkspaceDocumentCommentsRoute,
  errorComponent: WorkspaceRouteErrorBoundary,
});

function WorkspaceDocumentCommentsRoute() {
  const { documentId, workspaceId } = Route.useParams();
  const routeState = {
    activeArea: "comments" as const,
    activeWorkspaceId: workspaceId,
    selectedDocumentId: documentId,
  };
  const shell = useWorkspaceShell(
    routeState,
    buildHarnessDocsNavigation(Route.useNavigate(), routeState),
  );
  const comments = useCommentsPage(shell);

  return (
    <CommentsPage
      app={shell}
      onGoToApprovals={() => shell.handleAreaChange("approvals")}
      onGoToDocuments={() => shell.handleAreaChange("documents")}
      threads={comments.threads}
    />
  );
}
