import { Outlet, createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/$workspaceId")({
  component: WorkspaceLayoutRoute,
});

function WorkspaceLayoutRoute() {
  return <Outlet />;
}
