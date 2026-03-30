import { createFileRoute } from "@tanstack/react-router";
import { useCommentsPage } from "../hooks/useCommentsPage";
import { useWorkspaceRouteShell } from "../hooks/useWorkspaceRouteShell";
import { CommentsPage } from "../pages/CommentsPage";
import { WorkspaceRouteErrorBoundary } from "./$workspaceId.ai";

export const Route = createFileRoute("/$workspaceId/documents/$documentId/comments")({
  component: WorkspaceDocumentCommentsRoute,
  errorComponent: WorkspaceRouteErrorBoundary,
});

function WorkspaceDocumentCommentsRoute() {
  const shell = useWorkspaceRouteShell();
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
