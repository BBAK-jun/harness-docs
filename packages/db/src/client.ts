import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { resolveDatabaseUrl } from "./config.ts";
import * as schema from "./schema.ts";

export function createDatabasePool(connectionString = resolveDatabaseUrl()) {
  return new Pool({
    connectionString,
  });
}

export function createDatabase(connectionString = resolveDatabaseUrl()) {
  const pool = createDatabasePool(connectionString);

  return drizzle({
    client: pool,
    schema,
  });
}

export function createDatabaseContext(connectionString = resolveDatabaseUrl()) {
  const pool = createDatabasePool(connectionString);
  const db = drizzle({
    client: pool,
    schema,
  });

  return {
    pool,
    db,
  };
}

export type HarnessDocsDatabase = ReturnType<typeof createDatabaseContext>["db"];
