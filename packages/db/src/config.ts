const localDevelopmentDatabaseUrl =
  "postgresql://harness_docs:harness_docs@127.0.0.1:5432/harness_docs";

export function resolveDatabaseUrl() {
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error("DATABASE_URL is required in production.");
  }

  return localDevelopmentDatabaseUrl;
}

export { localDevelopmentDatabaseUrl };
