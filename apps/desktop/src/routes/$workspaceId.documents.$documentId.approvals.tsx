import { createFileRoute } from "@tanstack/react-router";
import { useApprovalsPage } from "../hooks/useApprovalsPage";
import { useWorkspaceRouteShell } from "../hooks/useWorkspaceRouteShell";
import { ApprovalsPage } from "../pages/ApprovalsPage";
import { WorkspaceRouteErrorBoundary } from "./$workspaceId.ai";

export const Route = createFileRoute("/$workspaceId/documents/$documentId/approvals")({
  component: WorkspaceDocumentApprovalsRoute,
  errorComponent: WorkspaceRouteErrorBoundary,
});

function WorkspaceDocumentApprovalsRoute() {
  const shell = useWorkspaceRouteShell();
  const approvals = useApprovalsPage(shell);

  return (
    <ApprovalsPage
      app={shell}
      approvals={approvals.approvals}
      onGoToComments={() => shell.handleAreaChange("comments")}
      onGoToDocuments={() => shell.handleAreaChange("documents")}
    />
  );
}
