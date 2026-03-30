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
  const approvalsPage = useApprovalsPage(shell);

  return (
    <ApprovalsPage
      app={shell}
      approvals={approvalsPage.approvals}
      canCurrentMemberDecide={approvalsPage.canCurrentMemberDecide}
      isDecisionPendingFor={approvalsPage.isDecisionPendingFor}
      isRequestingApproval={approvalsPage.isRequestingApproval}
      onApprovalDecision={approvalsPage.handleApprovalDecision}
      onGoToComments={() => shell.handleAreaChange("comments")}
      onGoToDocuments={() => shell.handleAreaChange("documents")}
      onRequestApproval={approvalsPage.handleRequestApproval}
      requestApprovalDisabledReason={approvalsPage.requestApprovalDisabledReason}
      requestApprovalLabel={approvalsPage.requestApprovalLabel}
    />
  );
}
