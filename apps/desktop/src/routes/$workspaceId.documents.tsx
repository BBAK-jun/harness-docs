import { Outlet, createFileRoute } from "@tanstack/react-router";
import { WorkspaceRouteErrorBoundary } from "./$workspaceId.ai";

export const Route = createFileRoute("/$workspaceId/documents")({
  component: WorkspaceDocumentsRoute,
  errorComponent: WorkspaceRouteErrorBoundary,
});

function WorkspaceDocumentsRoute() {
  return <Outlet />;
}
