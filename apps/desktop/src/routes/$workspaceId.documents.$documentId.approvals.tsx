import { createFileRoute } from "@tanstack/react-router";
import { useHarnessDocsApp } from "../hooks/useHarnessDocsApp";
import { buildHarnessDocsNavigation } from "../lib/appNavigation";
import { ApprovalsPage } from "../pages/ApprovalsPage";
import { WorkspacePage } from "../pages/WorkspacePage";

export const Route = createFileRoute("/$workspaceId/documents/$documentId/approvals")({
  component: WorkspaceDocumentApprovalsRoute,
});

function WorkspaceDocumentApprovalsRoute() {
  const { documentId, workspaceId } = Route.useParams();
  const routeState = {
    activeArea: "approvals" as const,
    activeWorkspaceId: workspaceId,
    selectedDocumentId: documentId,
  };
  const app = useHarnessDocsApp(
    routeState,
    buildHarnessDocsNavigation(Route.useNavigate(), routeState),
  );

  return (
    <WorkspacePage app={app}>
      <ApprovalsPage app={app} />
    </WorkspacePage>
  );
}
