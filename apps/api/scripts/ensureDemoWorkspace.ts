import "dotenv/config";
import { createDatabaseContext, workspaces } from "@harness-docs/db";
import { eq } from "drizzle-orm";
import { demoWorkspaceFixture } from "./lib/demoWorkspaceFixture.ts";
import { seedDemoWorkspace } from "./lib/seedDemoWorkspace.ts";

async function main() {
  const { db, pool } = createDatabaseContext();

  try {
    const existingWorkspace = await db.query.workspaces.findFirst({
      where: eq(workspaces.id, demoWorkspaceFixture.workspace.id),
      columns: {
        id: true,
      },
    });

    if (existingWorkspace) {
      console.log(
        JSON.stringify(
          {
            status: "preserved",
            workspaceId: existingWorkspace.id,
          },
          null,
          2,
        ),
      );
      return;
    }

    const seeded = await seedDemoWorkspace(db);

    console.log(
      JSON.stringify(
        {
          status: "seeded",
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

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
