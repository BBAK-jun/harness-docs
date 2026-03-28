import { Navigate, createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/$workspaceId/")({
  component: WorkspaceIndexRedirectRoute,
});

function WorkspaceIndexRedirectRoute() {
  const { workspaceId } = Route.useParams();

  return <Navigate params={{ workspaceId }} to="/$workspaceId/dashboard" />;
}
