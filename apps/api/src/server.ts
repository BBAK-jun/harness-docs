import "dotenv/config";
import { serve } from "@hono/node-server";
import { createApiApp } from "@harness-docs/contracts";
import { createMockWorkspaceSessionSource } from "./data/mockWorkspaceSessionSource.ts";
import { createPostgresWorkspaceSessionSource } from "./data/postgresWorkspaceSessionSource.ts";

const port = Number(process.env.PORT ?? 4020);
const hostname = process.env.HOST ?? "127.0.0.1";
const dataSourceMode = process.env.HARNESS_DOCS_API_DATA_SOURCE ?? "mock";

const app = createApiApp({
  dataSource:
    dataSourceMode === "mock"
      ? createMockWorkspaceSessionSource()
      : createPostgresWorkspaceSessionSource(),
});

const server = serve(
  {
    fetch: app.fetch,
    port,
    hostname,
  },
  (info) => {
    console.log(
      `Harness Docs API listening on http://${info.address}:${info.port} using ${dataSourceMode} data source`,
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
