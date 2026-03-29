import { fail } from "./result";

export function authenticationRequiredFailure() {
  return fail(422, "authentication_required", "A valid app session is required for this endpoint.");
}

export function workspaceNotFoundFailure(workspaceId: string) {
  return fail(404, "workspace_not_found", `Workspace '${workspaceId}' is not registered.`);
}

export function documentNotFoundFailure(documentId: string) {
  return fail(404, "document_not_found", `Document '${documentId}' is not registered.`);
}

export function approvalNotFoundFailure(approvalId: string) {
  return fail(404, "approval_not_found", `Approval '${approvalId}' is not registered.`);
}

export function publishRecordNotFoundFailure(publishRecordId: string) {
  return fail(
    404,
    "publish_record_not_found",
    `Publish record '${publishRecordId}' is not registered.`,
  );
}
