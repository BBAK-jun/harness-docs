import { createRouter } from "../../../infrastructure/lib/router";
import { createIntakeHandlers } from "./intake.handlers";
import * as routes from "./intake.routes";

export function createIntakeRouter() {
  const handlers = createIntakeHandlers();

  return createRouter().openapi(routes.previewIntake, handlers.previewIntake as never);
}
