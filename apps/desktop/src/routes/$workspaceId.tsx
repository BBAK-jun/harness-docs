import { Navigate, Outlet, createFileRoute } from "@tanstack/react-router";
import { useWorkspaceShell } from "../hooks/useWorkspaceShell";
import {
  WorkspaceRouteShellProvider,
  useWorkspaceRouteState,
} from "../hooks/useWorkspaceRouteShell";
import { buildHarnessDocsNavigation } from "../lib/appNavigation";
import { WorkspacePage } from "../pages/WorkspacePage";

export const Route = createFileRoute("/$workspaceId")({
  component: WorkspaceLayoutRoute,
});

function WorkspaceLayoutRoute() {
  const { workspaceId } = Route.useParams();
  const routeState = useWorkspaceRouteState(workspaceId);

  const shell = useWorkspaceShell(
    routeState,
    buildHarnessDocsNavigation(Route.useNavigate(), routeState),
  );

  if (shell.authentication?.status !== "authenticated") {
    return <Navigate to="/sign-in" />;
  }

  return (
    <WorkspaceRouteShellProvider shell={shell}>
      <WorkspacePage app={shell}>
        <Outlet />
      </WorkspacePage>
    </WorkspaceRouteShellProvider>
  );
}
