import {
  aiDrafts,
  appSessions,
  approvalEvents,
  approvalRequests,
  authAccounts,
  documentInvalidations,
  documentLinks,
  documentLocks,
  documents,
  documentVersions,
  publishNotifications,
  publishRecordArtifacts,
  publishRecords,
  templates,
  type HarnessDocsDatabase,
  users,
  workspaceInvitations,
  workspaceMemberships,
  workspaces,
} from "@harness-docs/db";

export async function resetHarnessDocsDatabase(db: HarnessDocsDatabase) {
  await db.transaction(async (tx) => {
    await tx.delete(appSessions);
    await tx.delete(authAccounts);
    await tx.delete(publishNotifications);
    await tx.delete(publishRecordArtifacts);
    await tx.delete(publishRecords);
    await tx.delete(approvalEvents);
    await tx.delete(approvalRequests);
    await tx.delete(documentInvalidations);
    await tx.delete(documentLocks);
    await tx.delete(documentLinks);
    await tx.delete(documentVersions);
    await tx.delete(aiDrafts);
    await tx.delete(documents);
    await tx.delete(templates);
    await tx.delete(workspaceInvitations);
    await tx.delete(workspaceMemberships);
    await tx.delete(workspaces);
    await tx.delete(users);
  });
}
