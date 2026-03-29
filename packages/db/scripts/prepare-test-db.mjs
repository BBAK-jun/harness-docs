import "dotenv/config";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { z } from "zod";

const postgresConnectionStringSchema = z
  .string()
  .trim()
  .min(1, "Database URL is required.")
  .superRefine((value, context) => {
    try {
      const url = new URL(value);

      if (url.protocol !== "postgresql:" && url.protocol !== "postgres:") {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Database URL must use the postgres or postgresql protocol.",
        });
      }

      if (!url.pathname.replace(/^\/+/, "")) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Database URL must include a database name.",
        });
      }
    } catch {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Database URL must be a valid connection string.",
      });
    }
  });

const testDatabaseEnvironmentSchema = z
  .object({
    DATABASE_URL: postgresConnectionStringSchema.optional(),
    TEST_DATABASE_URL: postgresConnectionStringSchema,
  })
  .superRefine((value, context) => {
    if (value.DATABASE_URL && value.TEST_DATABASE_URL === value.DATABASE_URL) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "TEST_DATABASE_URL must not match DATABASE_URL.",
        path: ["TEST_DATABASE_URL"],
      });
    }
  });

function withDatabaseName(connectionString, databaseName) {
  const url = new URL(connectionString);
  url.pathname = `/${databaseName}`;
  return url.toString();
}

function resolveTestDatabaseUrl() {
  return testDatabaseEnvironmentSchema.parse(process.env).TEST_DATABASE_URL;
}

function escapeIdentifier(value) {
  return `"${value.replace(/"/g, '""')}"`;
}

const testDatabaseUrl = resolveTestDatabaseUrl();
const testDatabaseName = new URL(testDatabaseUrl).pathname.replace(/^\/+/, "");
const adminDatabaseUrl = withDatabaseName(testDatabaseUrl, "postgres");
const migrationsFolder = fileURLToPath(new URL("../migrations", import.meta.url));

const adminPool = new Pool({
  connectionString: adminDatabaseUrl,
});

try {
  const existsResult = await adminPool.query("select 1 from pg_database where datname = $1", [
    testDatabaseName,
  ]);

  if (existsResult.rowCount === 0) {
    await adminPool.query(`create database ${escapeIdentifier(testDatabaseName)}`);
    console.log(`Created test database ${testDatabaseName}`);
  }
} finally {
  await adminPool.end();
}

const testPool = new Pool({
  connectionString: testDatabaseUrl,
});

try {
  const db = drizzle({
    client: testPool,
  });

  await migrate(db, {
    migrationsFolder: path.resolve(migrationsFolder),
  });
  console.log(`Prepared test database ${testDatabaseName}`);
} finally {
  await testPool.end();
}
