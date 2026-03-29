import type { ApiRouteDependencies } from "../../../application/ports";
import { createRouter } from "../../../infrastructure/lib/router";
import { createPublishHandlers } from "./publish.handlers";
import * as routes from "./publish.routes";

export function createPublishRouter(dependencies: Pick<ApiRouteDependencies, "dataSource">) {
  const handlers = createPublishHandlers(dependencies);
  const router = createRouter()
    .openapi(routes.listWorkspacePublishRecords, handlers.listWorkspacePublishRecords as never)
    .openapi(routes.createPublishRecord, handlers.createPublishRecord as never)
    .openapi(routes.executePublishRecord, handlers.executePublishRecord as never);

  router.post(
    "/workspaces/:workspaceId/publish-records/:publishRecordId/execute",
    handlers.executePublishRecord,
  );

  return router;
}
