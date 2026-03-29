import type { ApiRouteDependencies } from "../../../application/ports";
import { createRouter } from "../../../infrastructure/lib/router";
import { createApprovalHandlers } from "./approval.handlers";
import * as routes from "./approval.routes";

export function createApprovalRouter(dependencies: Pick<ApiRouteDependencies, "dataSource">) {
  const handlers = createApprovalHandlers(dependencies);
  const router = createRouter()
    .openapi(routes.listWorkspaceApprovals, handlers.listWorkspaceApprovals as never)
    .openapi(routes.requestApproval, handlers.requestApproval as never)
    .openapi(routes.decideApproval, handlers.decideApproval as never);

  router.post(
    "/workspaces/:workspaceId/documents/:documentId/approvals/request",
    handlers.requestApproval,
  );
  router.post("/workspaces/:workspaceId/approvals/:approvalId/decision", handlers.decideApproval);

  return router;
}
