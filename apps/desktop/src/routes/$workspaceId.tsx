import { Navigate, createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/$workspaceId")({
  component: WorkspaceRedirectRoute,
});

function WorkspaceRedirectRoute() {
  const { workspaceId } = Route.useParams();

  return <Navigate params={{ workspaceId }} to="/$workspaceId/dashboard" />;
}
