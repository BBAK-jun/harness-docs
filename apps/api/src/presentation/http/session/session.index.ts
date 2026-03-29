import type { ApiRouteDependencies } from "../../../application/ports";
import { createRouter } from "../../../infrastructure/lib/router";
import { createSessionHandlers } from "./session.handlers";
import * as routes from "./session.routes";

export function createSessionRouter(
  dependencies: Pick<ApiRouteDependencies, "dataSource" | "authDataSource">,
) {
  const handlers = createSessionHandlers(dependencies);

  return createRouter().openapi(routes.getBootstrapSession, handlers.getBootstrapSession as never);
}
