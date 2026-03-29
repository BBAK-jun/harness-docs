import { createRouter } from "../../../infrastructure/lib/router";
import { createSystemHandlers } from "./system.handlers";
import * as routes from "./system.routes";

export function createSystemRouter() {
  const handlers = createSystemHandlers();

  return createRouter().openapi(routes.getHealth, handlers.getHealth as never);
}
