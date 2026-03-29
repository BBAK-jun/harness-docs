import { z } from "zod";

const localDevelopmentDatabaseUrl =
  "postgresql://harness_docs:harness_docs@127.0.0.1:5432/harness_docs";

function withDatabaseName(connectionString: string, databaseName: string) {
  const url = new URL(connectionString);
  url.pathname = `/${databaseName}`;
  return url.toString();
}

export function deriveTestDatabaseUrl(connectionString: string) {
  const url = new URL(connectionString);
  const databaseName = url.pathname.replace(/^\/+/, "");

  if (!databaseName) {
    throw new Error("Database URL must include a database name to derive a test database URL.");
  }

  return withDatabaseName(connectionString, `${databaseName}_test`);
}

const localTestDatabaseUrl = deriveTestDatabaseUrl(localDevelopmentDatabaseUrl);

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

const databaseEnvironmentSchema = z.object({
  DATABASE_URL: postgresConnectionStringSchema.optional(),
  NODE_ENV: z.string().optional(),
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

export function resolveDatabaseUrl() {
  const parsed = databaseEnvironmentSchema.parse(process.env);

  if (parsed.DATABASE_URL) {
    return parsed.DATABASE_URL;
  }

  if (parsed.NODE_ENV === "production") {
    throw new Error("DATABASE_URL is required in production.");
  }

  return localDevelopmentDatabaseUrl;
}

export function resolveTestDatabaseUrl() {
  return testDatabaseEnvironmentSchema.parse(process.env).TEST_DATABASE_URL;
}

export { localDevelopmentDatabaseUrl, localTestDatabaseUrl };
