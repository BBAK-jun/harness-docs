import { apiReference } from "@scalar/hono-api-reference";
import { OpenAPIHono } from "@hono/zod-openapi";
import type { Context, Next } from "hono";
import { cors } from "hono/cors";
import type { CreateApiAppOptions } from "../../application/ports";
import { createDefaultDataSource } from "../../infrastructure/data/defaultDataSource";
import { createApprovalRouter } from "./approval/approval.index";
import { createAuthRouter } from "./auth/auth.index";
import { createDocumentRouter } from "./document/document.index";
import { createIntakeRouter } from "./intake/intake.index";
import { createPublishRouter } from "./publish/publish.index";
import { createSessionRouter } from "./session/session.index";
import { createSystemRouter } from "./system/system.index";
import { errorResponse, requireSession } from "./shared";
import { createWorkspaceRouter } from "./workspace/workspace.index";

export function createApiApp(options: CreateApiAppOptions = {}) {
  const dataSource = options.dataSource ?? createDefaultDataSource();
  const dependencies = {
    dataSource,
    publishGovernanceAdapter: options.publishGovernanceAdapter,
    workspaceRepositoryValidator: options.workspaceRepositoryValidator,
    authDataSource: options.authDataSource,
    gitHubOAuthDataSource: options.gitHubOAuthDataSource,
  };
  const app = new OpenAPIHono();

  app.use("*", cors());
  app.doc("/doc", {
    openapi: "3.1.0",
    info: {
      title: "Harness Docs API",
      version: "0.1.0",
      description:
        "Authoritative API for authentication, workspace onboarding, document workflow, approvals, and publish governance.",
    },
  });
  app.get(
    "/scalar",
    apiReference({
      pageTitle: "Harness Docs API Reference",
      url: "/doc",
    }),
  );

  if (options.authDataSource) {
    app.use("/api/session/bootstrap", async (c: Context, next: Next) => {
      const sessionResult = await requireSession(c, options.authDataSource);

      if (!sessionResult.ok) {
        return sessionResult.response;
      }

      await next();
    });
    app.use("/api/workspaces", async (c: Context, next: Next) => {
      const sessionResult = await requireSession(c, options.authDataSource);

      if (!sessionResult.ok) {
        return sessionResult.response;
      }

      await next();
    });
    app.use("/api/workspaces/*", async (c: Context, next: Next) => {
      const sessionResult = await requireSession(c, options.authDataSource);

      if (!sessionResult.ok) {
        return sessionResult.response;
      }

      await next();
    });
    app.use("/api/workspace-invitations/accept", async (c: Context, next: Next) => {
      const sessionResult = await requireSession(c, options.authDataSource);

      if (!sessionResult.ok) {
        return sessionResult.response;
      }

      await next();
    });
    app.use("/api/workspace-invitations/acceptances", async (c: Context, next: Next) => {
      const sessionResult = await requireSession(c, options.authDataSource);

      if (!sessionResult.ok) {
        return sessionResult.response;
      }

      await next();
    });
  }

  app.notFound(
    (c: Context) =>
      errorResponse(
        c,
        404,
        "route_not_found",
        `Route '${c.req.path}' is not registered.`,
      ) as unknown as Response,
  );
  app.onError(
    (error: unknown, c: Context) =>
      errorResponse(
        c,
        500,
        "internal_server_error",
        error instanceof Error ? error.message : "Unexpected error while handling request.",
      ) as unknown as Response,
  );

  return app
    .route("/", createSystemRouter())
    .route("/api", createAuthRouter(dependencies))
    .route("/api", createSessionRouter(dependencies))
    .route("/api", createWorkspaceRouter(dependencies))
    .route("/api", createDocumentRouter(dependencies))
    .route("/api", createApprovalRouter(dependencies))
    .route("/api", createPublishRouter(dependencies))
    .route("/api", createIntakeRouter());
}

const appTypeSource = createApiApp();

export type AppType = typeof appTypeSource;
