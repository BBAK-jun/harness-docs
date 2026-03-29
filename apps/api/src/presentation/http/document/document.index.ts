import type { ApiRouteDependencies } from "../../../application/ports";
import { createRouter } from "../../../infrastructure/lib/router";
import { createDocumentHandlers } from "./document.handlers";
import * as routes from "./document.routes";

export function createDocumentRouter(
  dependencies: Pick<ApiRouteDependencies, "dataSource" | "publishGovernanceAdapter">,
) {
  const handlers = createDocumentHandlers(dependencies);
  return createRouter()
    .openapi(routes.getDocumentPublishPreflight, handlers.getDocumentPublishPreflight as never)
    .openapi(routes.listWorkspaceDocuments, handlers.listWorkspaceDocuments as never)
    .openapi(routes.createDocument, handlers.createDocument as never)
    .openapi(routes.updateDocument, handlers.updateDocument as never);
}
