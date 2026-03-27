import { createFileRoute } from "@tanstack/react-router";
import { useHarnessDocsApp } from "../hooks/useHarnessDocsApp";
import { buildHarnessDocsNavigation } from "../lib/appNavigation";
import { PublishPage } from "../pages/PublishPage";
import { WorkspacePage } from "../pages/WorkspacePage";

export const Route = createFileRoute("/$workspaceId/publish")({
  component: WorkspacePublishRoute,
});

function WorkspacePublishRoute() {
  const { workspaceId } = Route.useParams();
  const routeState = {
    activeArea: "publish" as const,
    activeWorkspaceId: workspaceId,
    selectedDocumentId: null,
  };
  const app = useHarnessDocsApp(
    routeState,
    buildHarnessDocsNavigation(Route.useNavigate(), routeState),
  );

  return (
    <WorkspacePage app={app}>
      <PublishPage app={app} />
    </WorkspacePage>
  );
}
