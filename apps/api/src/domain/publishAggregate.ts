import type { DocumentType, WorkspaceRole } from "@harness-docs/contracts";
import type { ApprovalAuthority, UnresolvedApprovalSnapshot } from "./documentAggregate.ts";
import { buildId, dedupeByKey, dedupeStrings, slugify } from "./shared.ts";

export type PublishStageId = "scope" | "freshness" | "approvals" | "memo" | "github";
export type PublishStageStatus = "pending" | "ready" | "attention" | "complete";
export type PublishRecordStatus = "draft" | "ready_for_publish" | "publishing" | "published";
export type PublishNotificationKind = "in_app" | "webhook";
export type PublishNotificationStatus = "pending" | "queued" | "sent";
export type PublishPreflightStatus = "ready" | "ready_with_warnings" | "blocked";
export type PublishStalenessStatus = "current" | "stale";

export interface PublishFlowStage {
  id: PublishStageId;
  title: string;
  description: string;
  status: PublishStageStatus;
  primaryAction: string;
  guidance: string[];
}

export interface PublishNotificationTarget {
  id: string;
  kind: PublishNotificationKind;
  label: string;
  membershipId: string | null;
  destination: string | null;
  status: PublishNotificationStatus;
}

export interface PublishStaleRationaleEntry {
  id: string;
  label: string;
  summary: string;
  status: "current" | "outdated";
  recordedAt: string;
  recordedByMembershipId: string;
  relatedDocumentId: string | null;
  relatedInvalidationId: string | null;
  relatedApprovalId: string | null;
  supersededAt: string | null;
  supersededByDocumentId: string | null;
  supersededReason: string | null;
}

export interface PublishPreflightFinding {
  id: string;
  kind: "stale_rationale" | "unresolved_approval";
  severity: "warning" | "blocking";
  label: string;
  summary: string;
  requiredAction: string;
  documentId: string | null;
  approvalId: string | null;
  invalidationId: string | null;
  staleRationaleEntryId: string | null;
}

export interface PublishPreflightResult {
  status: PublishPreflightStatus;
  summary: string;
  staleDocumentIds: string[];
  unresolvedApprovalIds: string[];
  findings: PublishPreflightFinding[];
}

export interface PublishArtifactDraft {
  id: string;
  kind: "document" | "template";
  targetId: string;
  label: string;
  documentType: DocumentType | null;
  changeSummary: string;
  linkedDocumentIds: string[];
  stalenessStatus: PublishStalenessStatus | null;
  unresolvedApprovalIds: string[];
  unresolvedApprovals: UnresolvedApprovalSnapshot[];
  invalidationIds: string[];
}

export interface PublishDocumentSnapshot {
  id: string;
  title: string;
  type: DocumentType;
  linkedDocumentIds: string[];
  freshnessStatus: PublishStalenessStatus;
  unresolvedApprovalIds: string[];
  unresolvedApprovals: UnresolvedApprovalSnapshot[];
  invalidationIds: string[];
}

export interface PublishTemplateSnapshot {
  id: string;
  name: string;
  documentType: DocumentType;
}

export interface MembershipSnapshot {
  id: string;
  role: WorkspaceRole;
  status: "active" | "invited" | "suspended" | "removed";
  notificationWebhookUrl: string | null;
}

export interface RepositoryBindingSnapshot {
  owner: string;
  name: string;
  defaultBranch: string;
  installationId: number | null;
}

export interface PublishRecordSourceSnapshot {
  kind: "workspace" | "document" | "template";
  documentId: string | null;
  templateId: string | null;
  label: string;
  changeSummary: string;
}

export interface PublishDraftAggregate {
  currentStageId: PublishStageId;
  status: PublishRecordStatus;
  staleRationaleEntries: PublishStaleRationaleEntry[];
  artifacts: PublishArtifactDraft[];
  staleDocumentIds: string[];
  unresolvedApprovalIds: string[];
  unresolvedApprovals: UnresolvedApprovalSnapshot[];
  invalidationIds: string[];
  notificationTargets: PublishNotificationTarget[];
  branchName: string;
  commitMessage: string;
  pullRequestTitle: string;
  preflight: PublishPreflightResult;
}

const publishStageDefinitions = [
  {
    id: "scope",
    title: "Confirm scope",
    description: "Choose the documents and templates that belong to this publish batch.",
    primaryAction: "Review scope",
    guidance: ["Keep the publish batch explicit and traceable."],
  },
  {
    id: "freshness",
    title: "Review freshness",
    description: "Inspect stale linked documents and invalidations before publication.",
    primaryAction: "Inspect freshness",
    guidance: ["Record stale rationale when linked documents invalidate the batch."],
  },
  {
    id: "approvals",
    title: "Capture approval snapshot",
    description: "Freeze unresolved app-native approval state before GitHub automation starts.",
    primaryAction: "Review approvals",
    guidance: ["Preserve unresolved approvals inside the app-owned publish record."],
  },
  {
    id: "memo",
    title: "Prepare publish memo",
    description: "Carry stale rationale and unresolved approvals into the publication memo.",
    primaryAction: "Draft memo",
    guidance: ["The memo should explain why stale publication is still allowed."],
  },
  {
    id: "github",
    title: "Open GitHub PR",
    description: "Create the branch, commit, and pull request in the mapped docs repository.",
    primaryAction: "Execute publish",
    guidance: ["The app snapshot is the source of truth before GitHub handoff."],
  },
] as const;

function formatList(items: string[]) {
  if (items.length === 0) {
    return "";
  }

  if (items.length === 1) {
    return items[0] ?? "";
  }

  if (items.length === 2) {
    return `${items[0]} and ${items[1]}`;
  }

  return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
}

function dedupeUnresolvedApprovals(values: UnresolvedApprovalSnapshot[]) {
  return dedupeByKey(values, (entry) => entry.id);
}

function buildStaleRationaleFindings(
  staleDocumentIds: string[],
  staleRationale: string,
  staleRationaleEntries: PublishStaleRationaleEntry[],
  documentLabelById: Map<string, string>,
) {
  return staleDocumentIds.map((documentId) => {
    const rationaleEntry =
      staleRationaleEntries.find(
        (entry) => entry.status === "current" && entry.relatedDocumentId === documentId,
      ) ?? null;
    const hasRecordedRationale = rationaleEntry != null || staleRationale.trim().length > 0;

    return {
      id: `preflight-stale-${documentId}`,
      kind: "stale_rationale" as const,
      severity: hasRecordedRationale ? "warning" : "blocking",
      label: `${documentLabelById.get(documentId) ?? "Document"} requires stale publish disclosure`,
      summary:
        rationaleEntry?.summary ??
        (hasRecordedRationale
          ? staleRationale
          : "This stale document still needs an explicit publish rationale before GitHub automation starts."),
      requiredAction: hasRecordedRationale
        ? "Carry the recorded stale rationale into the publish memo and PR context."
        : "Record a stale publish rationale before branch, commit, and pull request automation begins.",
      documentId,
      approvalId: rationaleEntry?.relatedApprovalId ?? null,
      invalidationId: rationaleEntry?.relatedInvalidationId ?? null,
      staleRationaleEntryId: rationaleEntry?.id ?? null,
    } satisfies PublishPreflightFinding;
  });
}

function buildUnresolvedApprovalFindings(
  unresolvedApprovals: UnresolvedApprovalSnapshot[],
  documentLabelById: Map<string, string>,
) {
  return unresolvedApprovals.map(
    (approval) =>
      ({
        id: `preflight-approval-${approval.id}`,
        kind: "unresolved_approval",
        severity: approval.status === "missing" ? "blocking" : "warning",
        label: `${documentLabelById.get(approval.documentId) ?? "Document"} • ${approval.label}`,
        summary: approval.summary,
        requiredAction: approval.requiredAction,
        documentId: approval.documentId,
        approvalId: approval.approvalId ?? null,
        invalidationId: approval.invalidationIds[0] ?? null,
        staleRationaleEntryId: null,
      }) satisfies PublishPreflightFinding,
  );
}

export function buildPublishStages(
  currentStageId: PublishStageId,
  recordStatus: PublishRecordStatus,
  preflightStatus: PublishPreflightStatus,
) {
  const currentIndex = publishStageDefinitions.findIndex((stage) => stage.id === currentStageId);

  return publishStageDefinitions.map((stage, index) => {
    let status: PublishStageStatus = "pending";

    if (recordStatus === "published") {
      status = "complete";
    } else if (index < currentIndex) {
      status = "complete";
    } else if (index === currentIndex) {
      status = preflightStatus === "blocked" ? "attention" : "ready";
    }

    if (recordStatus === "publishing" && stage.id === "github") {
      status = "ready";
    }

    return {
      ...stage,
      guidance: [...stage.guidance],
      status,
    };
  });
}

export function buildPublishPreflightResult(params: {
  staleDocumentIds: string[];
  staleRationale: string;
  staleRationaleEntries: PublishStaleRationaleEntry[];
  unresolvedApprovals: UnresolvedApprovalSnapshot[];
  documentLabelById: Map<string, string>;
}) {
  const staleFindings = buildStaleRationaleFindings(
    params.staleDocumentIds,
    params.staleRationale,
    params.staleRationaleEntries,
    params.documentLabelById,
  );
  const approvalFindings = buildUnresolvedApprovalFindings(
    params.unresolvedApprovals,
    params.documentLabelById,
  );
  const findings = [...staleFindings, ...approvalFindings];
  const blockingFindings = findings.filter((finding) => finding.severity === "blocking");
  const warningFindings = findings.filter((finding) => finding.severity === "warning");
  const unresolvedApprovalIds = dedupeStrings(
    params.unresolvedApprovals.map((approval) => approval.approvalId),
  );

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
    staleDocumentIds: [...params.staleDocumentIds],
    unresolvedApprovalIds,
    findings,
  } satisfies PublishPreflightResult;
}

export function createPublishDraft(params: {
  workspaceId: string;
  workspaceSlug: string;
  source: PublishRecordSourceSnapshot;
  initiatedByMembershipId: string;
  repository: RepositoryBindingSnapshot;
  documents: PublishDocumentSnapshot[];
  templates: PublishTemplateSnapshot[];
  memberships: MembershipSnapshot[];
  staleRationale: string;
  timestamp: string;
}) {
  const branchSlug = slugify(params.source.label) || "publish-batch";
  const branchName = `publish/${params.workspaceSlug}/${branchSlug}-${params.timestamp.slice(0, 10).replace(/-/g, "")}`;
  const unresolvedApprovals = dedupeUnresolvedApprovals(
    params.documents.flatMap((document) => document.unresolvedApprovals),
  );
  const unresolvedApprovalIds = dedupeStrings(unresolvedApprovals.map((entry) => entry.approvalId));
  const invalidationIds = dedupeStrings(
    params.documents.flatMap((document) => document.invalidationIds),
  );
  const staleDocumentIds = params.documents
    .filter((document) => document.freshnessStatus === "stale")
    .map((document) => document.id);
  const staleRationaleEntries: PublishStaleRationaleEntry[] =
    params.staleRationale.trim().length > 0
      ? staleDocumentIds.map((documentId) => {
          const document = params.documents.find((entry) => entry.id === documentId) ?? null;
          const invalidationId = document?.invalidationIds[0] ?? null;
          const approvalId = document?.unresolvedApprovals[0]?.approvalId ?? null;

          return {
            id: buildId("pub_rationale"),
            label: document ? `${document.title} stale rationale` : "Stale rationale",
            summary: params.staleRationale,
            status: "current",
            recordedAt: params.timestamp,
            recordedByMembershipId: params.initiatedByMembershipId,
            relatedDocumentId: documentId,
            relatedInvalidationId: invalidationId,
            relatedApprovalId: approvalId,
            supersededAt: null,
            supersededByDocumentId: null,
            supersededReason: null,
          };
        })
      : [];
  const documentLabelById = new Map(
    params.documents.map((document) => [document.id, document.title]),
  );
  const preflight = buildPublishPreflightResult({
    staleDocumentIds,
    staleRationale: params.staleRationale,
    staleRationaleEntries,
    unresolvedApprovals,
    documentLabelById,
  });
  const currentStageId: PublishStageId =
    unresolvedApprovals.length > 0 ? "approvals" : staleDocumentIds.length > 0 ? "memo" : "github";
  const status: PublishRecordStatus =
    preflight.status === "blocked" ? "draft" : "ready_for_publish";

  return {
    currentStageId,
    status,
    staleRationaleEntries,
    artifacts: [
      ...params.documents.map((document) => ({
        id: buildId("pub_artifact"),
        kind: "document" as const,
        targetId: document.id,
        label: document.title,
        documentType: document.type,
        changeSummary: params.source.changeSummary,
        linkedDocumentIds: [...document.linkedDocumentIds],
        stalenessStatus: document.freshnessStatus,
        unresolvedApprovalIds: [...document.unresolvedApprovalIds],
        unresolvedApprovals: [...document.unresolvedApprovals],
        invalidationIds: [...document.invalidationIds],
      })),
      ...params.templates.map((template) => ({
        id: buildId("pub_artifact"),
        kind: "template" as const,
        targetId: template.id,
        label: template.name,
        documentType: template.documentType,
        changeSummary: params.source.changeSummary,
        linkedDocumentIds: [],
        stalenessStatus: null,
        unresolvedApprovalIds: [],
        unresolvedApprovals: [],
        invalidationIds: [],
      })),
    ],
    staleDocumentIds,
    unresolvedApprovalIds,
    unresolvedApprovals,
    invalidationIds,
    notificationTargets: [
      ...params.memberships
        .filter((membership) => membership.status === "active")
        .map((membership) => ({
          id: buildId("pub_notify"),
          kind: "in_app" as const,
          label: `${membership.role} inbox`,
          membershipId: membership.id,
          destination: null,
          status: "pending" as const,
        })),
      ...params.memberships
        .filter(
          (membership) =>
            membership.status === "active" && membership.notificationWebhookUrl != null,
        )
        .map((membership) => ({
          id: buildId("pub_notify"),
          kind: "webhook" as const,
          label: `${membership.role} webhook`,
          membershipId: membership.id,
          destination: membership.notificationWebhookUrl,
          status: "queued" as const,
        })),
    ],
    branchName,
    commitMessage: `docs: ${params.source.changeSummary}`,
    pullRequestTitle: `docs: ${params.source.label}`,
    preflight,
  } satisfies PublishDraftAggregate;
}
