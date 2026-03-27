import { createFileRoute } from "@tanstack/react-router";
import { buildHarnessDocsNavigation } from "../lib/appNavigation";
import { useApprovalsPage } from "../hooks/useApprovalsPage";
import { useWorkspaceShell } from "../hooks/useWorkspaceShell";
import { ApprovalsPage } from "../pages/ApprovalsPage";
import { WorkspacePage } from "../pages/WorkspacePage";
import { WorkspaceRouteErrorBoundary } from "./$workspaceId.ai";

export const Route = createFileRoute("/$workspaceId/documents/$documentId/approvals")({
  component: WorkspaceDocumentApprovalsRoute,
  errorComponent: WorkspaceRouteErrorBoundary,
});

function WorkspaceDocumentApprovalsRoute() {
  const { documentId, workspaceId } = Route.useParams();
  const routeState = {
    activeArea: "approvals" as const,
    activeWorkspaceId: workspaceId,
    selectedDocumentId: documentId,
  };
  const shell = useWorkspaceShell(
    routeState,
    buildHarnessDocsNavigation(Route.useNavigate(), routeState),
  );
  const approvals = useApprovalsPage(shell);

  return (
    <WorkspacePage app={shell}>
      <ApprovalsPage
        app={shell}
        approvals={approvals.approvals}
        onGoToComments={() => shell.handleAreaChange("comments")}
        onGoToDocuments={() => shell.handleAreaChange("documents")}
      />
    </WorkspacePage>
  );
}
