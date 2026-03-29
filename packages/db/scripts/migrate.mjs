import "dotenv/config";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { z } from "zod";

const localDevelopmentDatabaseUrl =
  "postgresql://harness_docs:harness_docs@127.0.0.1:5432/harness_docs";

const postgresConnectionStringSchema = z
  .string()
  .trim()
  .min(1, "DATABASE_URL is required.")
  .superRefine((value, context) => {
    try {
      const url = new URL(value);

      if (url.protocol !== "postgresql:" && url.protocol !== "postgres:") {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: "DATABASE_URL must use the postgres or postgresql protocol.",
        });
      }

      if (!url.pathname.replace(/^\/+/, "")) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: "DATABASE_URL must include a database name.",
        });
      }
    } catch {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "DATABASE_URL must be a valid connection string.",
      });
    }
  });

const databaseEnvironmentSchema = z.object({
  DATABASE_URL: postgresConnectionStringSchema.optional(),
  NODE_ENV: z.string().optional(),
});

const parsedEnvironment = databaseEnvironmentSchema.parse(process.env);

if (!parsedEnvironment.DATABASE_URL && parsedEnvironment.NODE_ENV === "production") {
  throw new Error("DATABASE_URL is required in production.");
}

const databaseUrl = parsedEnvironment.DATABASE_URL ?? localDevelopmentDatabaseUrl;
const migrationsFolder = fileURLToPath(new URL("../migrations", import.meta.url));

const pool = new Pool({
  connectionString: databaseUrl,
});

try {
  const db = drizzle({
    client: pool,
  });

  await migrate(db, {
    migrationsFolder: path.resolve(migrationsFolder),
  });
  console.log(`Applied migrations from ${migrationsFolder}`);
} finally {
  await pool.end();
}
