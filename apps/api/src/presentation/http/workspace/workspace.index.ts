import type { ApiRouteDependencies } from "../../../application/ports";
import { createRouter } from "../../../infrastructure/lib/router";
import { createWorkspaceHandlers } from "./workspace.handlers";
import * as routes from "./workspace.routes";

export function createWorkspaceRouter(
  dependencies: Pick<
    ApiRouteDependencies,
    "dataSource" | "authDataSource" | "workspaceRepositoryValidator"
  >,
) {
  const handlers = createWorkspaceHandlers(dependencies);
  const router = createRouter()
    .openapi(routes.listWorkspaces, handlers.listWorkspaces as never)
    .openapi(routes.createWorkspace, handlers.createWorkspace as never)
    .openapi(routes.acceptWorkspaceInvitation, handlers.acceptWorkspaceInvitation as never)
    .openapi(routes.getWorkspaceGraph, handlers.getWorkspaceGraph as never)
    .openapi(routes.updateWorkspace, handlers.updateWorkspace as never);

  router.post("/workspace-invitations/accept", handlers.acceptWorkspaceInvitation);

  return router;
}
