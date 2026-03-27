import { createFileRoute } from "@tanstack/react-router";
import { useHarnessDocsApp } from "../hooks/useHarnessDocsApp";
import { buildHarnessDocsNavigation } from "../lib/appNavigation";
import { DocumentsPage } from "../pages/DocumentsPage";
import { WorkspacePage } from "../pages/WorkspacePage";

export const Route = createFileRoute("/$workspaceId/documents/$documentId")({
  component: WorkspaceDocumentDetailRoute,
});

function WorkspaceDocumentDetailRoute() {
  const { documentId, workspaceId } = Route.useParams();
  const routeState = {
    activeArea: "documents" as const,
    activeWorkspaceId: workspaceId,
    selectedDocumentId: documentId,
  };
  const app = useHarnessDocsApp(
    routeState,
    buildHarnessDocsNavigation(Route.useNavigate(), routeState),
  );

  return (
    <WorkspacePage app={app}>
      <DocumentsPage app={app} />
    </WorkspacePage>
  );
}
