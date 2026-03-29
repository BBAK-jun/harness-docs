import "dotenv/config";
import { serve } from "@hono/node-server";
import { createGitHubOAuthDataSource } from "./infrastructure/data/githubOAuthSource.ts";
import { createGitHubWorkspaceRepositoryValidator } from "./infrastructure/data/githubWorkspaceRepositoryValidator.ts";
import { createPostgresAuthSessionSource } from "./infrastructure/data/postgresAuthSessionSource.ts";
import { createPostgresWorkspaceSessionSource } from "./infrastructure/data/postgresWorkspaceSessionSource.ts";
import { createPublishGovernanceAdapter } from "./domain/publishGovernanceAdapter.ts";
import { createApiApp } from "./app.ts";

const port = Number(process.env.PORT ?? 4020);
const hostname = process.env.HOST ?? "127.0.0.1";
const authDataSource = createPostgresAuthSessionSource();

const app = createApiApp({
  dataSource: createPostgresWorkspaceSessionSource(),
  authDataSource,
  gitHubOAuthDataSource: createGitHubOAuthDataSource(authDataSource),
  publishGovernanceAdapter: createPublishGovernanceAdapter(),
  workspaceRepositoryValidator: createGitHubWorkspaceRepositoryValidator(),
});

const server = serve(
  {
    fetch: app.fetch,
    port,
    hostname,
  },
  (info) => {
    console.log(
      `Harness Docs API listening on http://${info.address}:${info.port} using postgres data source`,
    );
  },
);

process.on("SIGINT", () => {
  server.close();
  process.exit(0);
});

process.on("SIGTERM", () => {
  server.close((error) => {
    if (error) {
      console.error(error);
      process.exit(1);
    }

    process.exit(0);
  });
});
