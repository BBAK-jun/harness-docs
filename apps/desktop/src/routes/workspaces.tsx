import { createFileRoute } from "@tanstack/react-router";
import { useHarnessDocsApp } from "../hooks/useHarnessDocsApp";
import { buildHarnessDocsNavigation } from "../lib/appNavigation";
import { WorkspaceSelectionPage } from "../pages/WorkspaceSelectionPage";

export const Route = createFileRoute("/workspaces")({
  component: WorkspacesRoute,
});

function WorkspacesRoute() {
  const routeState = {
    activeArea: "documents" as const,
    activeWorkspaceId: null,
    selectedDocumentId: null,
  };
  const app = useHarnessDocsApp(
    routeState,
    buildHarnessDocsNavigation(Route.useNavigate(), routeState),
  );

  return <WorkspaceSelectionPage app={app} />;
}
