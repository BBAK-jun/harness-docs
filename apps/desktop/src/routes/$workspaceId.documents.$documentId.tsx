import { Outlet, createFileRoute } from "@tanstack/react-router";
import { WorkspaceRouteErrorBoundary } from "./$workspaceId.ai";

export const Route = createFileRoute("/$workspaceId/documents/$documentId")({
  component: WorkspaceDocumentDetailRoute,
  errorComponent: WorkspaceRouteErrorBoundary,
});

function WorkspaceDocumentDetailRoute() {
  return <Outlet />;
}
