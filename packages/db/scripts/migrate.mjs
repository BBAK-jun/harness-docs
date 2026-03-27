import "dotenv/config";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { fileURLToPath } from "node:url";
import path from "node:path";

const databaseUrl =
  process.env.DATABASE_URL ?? "postgresql://harness_docs:harness_docs@127.0.0.1:5432/harness_docs";
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
