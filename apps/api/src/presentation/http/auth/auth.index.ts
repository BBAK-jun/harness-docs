import type { ApiRouteDependencies } from "../../../application/ports";
import { createRouter } from "../../../infrastructure/lib/router";
import { createAuthHandlers } from "./auth.handlers";
import * as routes from "./auth.routes";

export function createAuthRouter(
  dependencies: Pick<ApiRouteDependencies, "authDataSource" | "gitHubOAuthDataSource">,
) {
  const handlers = createAuthHandlers(dependencies);
  const router = createRouter()
    .openapi(routes.startGitHubAuthorization, handlers.startGitHubAuthorization as never)
    .openapi(routes.getGitHubAuthorizationAttempt, handlers.getGitHubAuthorizationAttempt as never)
    .openapi(routes.createSession, handlers.createSession as never)
    .openapi(routes.getSession, handlers.getSession as never)
    .openapi(routes.deleteSession, handlers.deleteSession as never);

  router.get("/auth/github/start", handlers.startGitHubAuthorization);
  router.get("/auth/github/attempts/:attemptId", handlers.getGitHubAuthorizationAttempt);
  router.get("/auth/github/callback", handlers.callbackGitHubAuthorization);
  router.post("/auth/session/exchange", handlers.createSession);
  router.post("/auth/sign-out", handlers.deleteSession);

  return router;
}
