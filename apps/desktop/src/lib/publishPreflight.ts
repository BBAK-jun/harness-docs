import type {
  ApprovalId,
  PublishAutomationMetadata,
  PublishPreflightFinding,
  PublishPreflightResult,
  PublishRecord,
  UnresolvedApprovalSnapshot,
  WorkspaceDocument,
} from "../types";

type PublishRecordInput = Omit<PublishRecord, "publication"> & {
  publication: Omit<PublishAutomationMetadata, "preflight">;
};

function formatList(items: string[]) {
  if (items.length === 0) {
    return "";
  }

  if (items.length === 1) {
    return items[0];
  }

  if (items.length === 2) {
    return `${items[0]} and ${items[1]}`;
  }

  return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
}

function dedupeApprovalIds(approvals: UnresolvedApprovalSnapshot[]) {
  return Array.from(
    new Set(
      approvals
        .map((approval) => approval.approvalId)
        .filter((approvalId): approvalId is ApprovalId => approvalId != null),
    ),
  );
}

function buildStaleRationaleFindings(
  publishRecord: Pick<
    PublishRecordInput,
    "staleDocumentIds" | "staleRationale" | "staleRationaleEntries"
  >,
  documents: WorkspaceDocument[],
): PublishPreflightFinding[] {
  return publishRecord.staleDocumentIds.map((documentId) => {
    const document = documents.find((entry) => entry.id === documentId) ?? null;
    const rationaleEntry =
      publishRecord.staleRationaleEntries.find(
        (entry) => entry.status === "current" && entry.relatedDocumentId === documentId,
      ) ?? null;
    const hasRecordedRationale =
      rationaleEntry != null || publishRecord.staleRationale.trim().length > 0;

    return {
      id: `preflight-stale-${documentId}`,
      kind: "stale_rationale",
      severity: hasRecordedRationale ? "warning" : "blocking",
      label: document
        ? `${document.title} requires stale publish disclosure`
        : "Stale publish disclosure is required",
      summary:
        rationaleEntry?.summary ??
        (hasRecordedRationale
          ? publishRecord.staleRationale
          : "This stale document still needs an explicit publish rationale before GitHub automation starts."),
      requiredAction: hasRecordedRationale
        ? "Carry the recorded stale rationale into the publish memo and PR context."
        : "Record a stale publish rationale before branch, commit, and pull request automation begins.",
      documentId,
      approvalId: rationaleEntry?.relatedApprovalId ?? null,
      invalidationId: rationaleEntry?.relatedInvalidationId ?? null,
      staleRationaleEntryId: rationaleEntry?.id ?? null,
    };
  });
}

function buildUnresolvedApprovalFindings(
  publishRecord: Pick<PublishRecordInput, "unresolvedApprovals">,
  documents: WorkspaceDocument[],
): PublishPreflightFinding[] {
  return (publishRecord.unresolvedApprovals ?? []).map((approval) => {
    const document = documents.find((entry) => entry.id === approval.documentId) ?? null;

    return {
      id: `preflight-approval-${approval.id}`,
      kind: "unresolved_approval",
      severity: approval.status === "missing" ? "blocking" : "warning",
      label: document ? `${document.title} • ${approval.label}` : approval.label,
      summary: approval.summary,
      requiredAction: approval.requiredAction,
      documentId: approval.documentId,
      approvalId: approval.approvalId ?? null,
      invalidationId: approval.invalidationIds[0] ?? null,
      staleRationaleEntryId: null,
    };
  });
}

export function buildPublishPreflightResult(
  publishRecord: Pick<
    PublishRecordInput,
    "staleDocumentIds" | "staleRationale" | "staleRationaleEntries" | "unresolvedApprovals"
  >,
  documents: WorkspaceDocument[],
): PublishPreflightResult {
  const staleFindings = buildStaleRationaleFindings(publishRecord, documents);
  const approvalFindings = buildUnresolvedApprovalFindings(publishRecord, documents);
  const findings = [...staleFindings, ...approvalFindings];
  const blockingFindings = findings.filter((finding) => finding.severity === "blocking");
  const warningFindings = findings.filter((finding) => finding.severity === "warning");
  const unresolvedApprovalIds = dedupeApprovalIds(publishRecord.unresolvedApprovals ?? []);

  const summary =
    findings.length === 0
      ? "Preflight is clear. GitHub branch, commit, and pull request automation can proceed from the app-owned publish snapshot."
      : blockingFindings.length > 0
        ? `Preflight found ${blockingFindings.length} blocking issue${blockingFindings.length === 1 ? "" : "s"} and ${warningFindings.length} warning${warningFindings.length === 1 ? "" : "s"}. Resolve ${formatList(blockingFindings.map((finding) => finding.label))} before GitHub publication.`
        : `Preflight found ${warningFindings.length} warning${warningFindings.length === 1 ? "" : "s"} across stale rationale and unresolved approvals. GitHub publication may proceed with ${formatList(warningFindings.map((finding) => finding.label))} preserved in the publish record.`;

  return {
    status:
      blockingFindings.length > 0
        ? "blocked"
        : warningFindings.length > 0
          ? "ready_with_warnings"
          : "ready",
    summary,
    staleDocumentIds: [...publishRecord.staleDocumentIds],
    unresolvedApprovalIds,
    findings,
  };
}

export function createPublishRecordWithPreflight(
  publishRecord: PublishRecordInput,
  documents: WorkspaceDocument[],
): PublishRecord {
  return {
    ...publishRecord,
    publication: {
      ...publishRecord.publication,
      preflight: buildPublishPreflightResult(publishRecord, documents),
    },
  };
}
