import "dotenv/config";
import { defineConfig } from "drizzle-kit";

const databaseUrl =
  process.env.DATABASE_URL ?? "postgresql://harness_docs:harness_docs@127.0.0.1:5432/harness_docs";

export default defineConfig({
  out: "./migrations",
  schema: "./src/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: databaseUrl,
  },
  verbose: true,
  strict: true,
});
