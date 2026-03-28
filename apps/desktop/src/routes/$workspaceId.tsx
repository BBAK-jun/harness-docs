import { Navigate, Outlet, createFileRoute, useLocation } from "@tanstack/react-router";
import { useMemo } from "react";
import { useWorkspaceShell, type WorkspaceShellRouteState } from "../hooks/useWorkspaceShell";
import { buildHarnessDocsNavigation } from "../lib/appNavigation";
import { WorkspacePage } from "../pages/WorkspacePage";

export const Route = createFileRoute("/$workspaceId")({
  component: WorkspaceLayoutRoute,
});

function WorkspaceLayoutRoute() {
  const { workspaceId } = Route.useParams();
  const location = useLocation();
  const routeState = useMemo<WorkspaceShellRouteState>(() => {
    const suffix = location.pathname.replace(`/${workspaceId}`, "");
    const segments = suffix.split("/").filter(Boolean);
    const isDocumentsRoute = segments[0] === "documents";
    const selectedDocumentId = isDocumentsRoute && segments[1] ? segments[1] : null;

    if (segments[0] === "publish") {
      return {
        activeArea: "publish",
        activeWorkspaceId: workspaceId,
        selectedDocumentId: null,
      };
    }

    if (segments[0] === "ai") {
      return {
        activeArea: "ai",
        activeWorkspaceId: workspaceId,
        selectedDocumentId: null,
      };
    }

    if (isDocumentsRoute) {
      const trailing = segments[2] ?? null;
      const activeArea =
        trailing === "edit"
          ? "editor"
          : trailing === "comments"
            ? "comments"
            : trailing === "approvals"
              ? "approvals"
              : "documents";

      return {
        activeArea,
        activeWorkspaceId: workspaceId,
        selectedDocumentId,
      };
    }

    return {
      activeArea: "dashboard",
      activeWorkspaceId: workspaceId,
      selectedDocumentId: null,
    };
  }, [location.pathname, workspaceId]);

  const shell = useWorkspaceShell(
    routeState,
    buildHarnessDocsNavigation(Route.useNavigate(), routeState),
  );

  if (shell.authentication?.status !== "authenticated") {
    return <Navigate to="/sign-in" />;
  }

  return (
    <WorkspacePage app={shell}>
      <Outlet />
    </WorkspacePage>
  );
}
