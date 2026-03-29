import { createDatabaseContext } from "@harness-docs/db";
import "dotenv/config";
import { resetHarnessDocsDatabase } from "./lib/resetHarnessDocsDatabase.ts";
import { seedDemoWorkspace } from "./lib/seedDemoWorkspace.ts";

async function main() {
  const { db, pool } = createDatabaseContext();

  try {
    await resetHarnessDocsDatabase(db);
    const seeded = await seedDemoWorkspace(db);

    console.log(
      JSON.stringify(
        {
          workspaceId: seeded.workspace.id,
          templateIds: seeded.templates,
          documentIds: seeded.documents,
          membershipIds: seeded.memberships,
          userIds: seeded.users,
        },
        null,
        2,
      ),
    );
  } finally {
    await pool.end();
  }
}

main().catch(async (error) => {
  console.error(error);
  process.exitCode = 1;
});
