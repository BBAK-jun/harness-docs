import { createFileRoute } from "@tanstack/react-router";
import { useHarnessDocsApp } from "../hooks/useHarnessDocsApp";
import { buildHarnessDocsNavigation } from "../lib/appNavigation";
import { AIPage } from "../pages/AIPage";
import { WorkspacePage } from "../pages/WorkspacePage";

export const Route = createFileRoute("/$workspaceId/ai")({
  component: WorkspaceAIRoute,
});

function WorkspaceAIRoute() {
  const { workspaceId } = Route.useParams();
  const routeState = {
    activeArea: "ai" as const,
    activeWorkspaceId: workspaceId,
    selectedDocumentId: null,
  };
  const app = useHarnessDocsApp(
    routeState,
    buildHarnessDocsNavigation(Route.useNavigate(), routeState),
  );

  return (
    <WorkspacePage app={app}>
      <AIPage app={app} />
    </WorkspacePage>
  );
}
