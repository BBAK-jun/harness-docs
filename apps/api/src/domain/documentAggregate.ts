import type { ApprovalAuthority } from "@harness-docs/contracts";
export type { ApprovalAuthority } from "@harness-docs/contracts";
import { dedupeByKey, dedupeStrings } from "./shared.ts";

export type DocumentStatus = "draft" | "in_review" | "approved" | "published" | "archived";
export type DocumentReviewStatus = "idle" | "review_requested" | "changes_requested" | "approved";
export type DocumentApprovalState =
  | "not_requested"
  | "pending"
  | "approved"
  | "changes_requested"
  | "invalidated"
  | "restored";
export type PublishStalenessStatus = "current" | "stale";
export type DocumentFreshnessReason =
  | "linked_document_updated"
  | "approval_invalidated"
  | "publish_evaluation_pending";
export type UnresolvedApprovalStatus = "missing" | "pending" | "rejected";
export type DocumentPrePublicationReadiness = "ready" | "attention_required" | "blocked";

export interface TemplateSectionSnapshot {
  title: string;
  defaultMarkdown: string;
}

export interface TemplateSnapshot {
  description: string;
  sections: TemplateSectionSnapshot[];
}

export interface ApprovalSnapshot {
  id: string;
  authority: ApprovalAuthority;
  membershipId: string | null;
  reviewerLabel: string;
  requestedByMembershipId: string | null;
  decisionByMembershipId: string | null;
  decisionNote: string | null;
  state: DocumentApprovalState;
  requestedAt: string | null;
  respondedAt: string | null;
}

export interface InvalidationSnapshot {
  id: string;
  reason: DocumentFreshnessReason;
  summary: string;
  detectedAt: string;
  affectsApprovalIds: string[];
}

export interface UnresolvedApprovalSnapshot {
  id: string;
  status: UnresolvedApprovalStatus;
  documentId: string;
  label: string;
  authority: ApprovalAuthority;
  summary: string;
  requiredAction: string;
  approvalId: string | null;
  membershipId: string | null;
  invalidationIds: string[];
}

export interface DocumentBlockingIssueSnapshot {
  id: string;
  kind: "approval_missing";
  severity: "blocking";
  label: string;
  summary: string;
  requiredAction: string;
  relatedApprovalIds: string[];
  relatedInvalidationIds: string[];
}

export interface DocumentDerivedState {
  status: DocumentStatus;
  reviewStatus: DocumentReviewStatus;
  approvalState: DocumentApprovalState;
  reviewRequestedAt: string | null;
  requestedByMembershipId: string | null;
  lastReviewedAt: string | null;
  lastReviewedByMembershipId: string | null;
  approvedAt: string | null;
  freshnessStatus: PublishStalenessStatus;
  staleRationaleRequired: boolean;
  staleEvaluatedAt: string;
  staleSummary: string;
  staleReasons: DocumentFreshnessReason[];
  unresolvedApprovals: UnresolvedApprovalSnapshot[];
  unresolvedApprovalIds: string[];
  invalidationIds: string[];
  blockingIssues: DocumentBlockingIssueSnapshot[];
  prePublicationReadiness: DocumentPrePublicationReadiness;
  prePublicationSummary: string;
}

export interface DeriveDocumentStateInput {
  documentId: string;
  currentStatus: DocumentStatus;
  ownerMembershipId: string;
  actorMembershipId: string | null;
  timestamp: string;
  approvals: ApprovalSnapshot[];
  invalidations: InvalidationSnapshot[];
  preservedMissingApprovals?: UnresolvedApprovalSnapshot[];
}

export function buildDocumentMarkdown(
  title: string,
  template: TemplateSnapshot,
  providedMarkdown?: string,
) {
  if (providedMarkdown && providedMarkdown.trim().length > 0) {
    return providedMarkdown;
  }

  const sections = template.sections
    .map((section) => `## ${section.title}\n\n${section.defaultMarkdown}`)
    .join("\n\n");

  return [`# ${title}`, "", template.description, "", sections].join("\n");
}

function buildBlockingIssues(unresolved: UnresolvedApprovalSnapshot[]) {
  return unresolved
    .filter((entry) => entry.status === "missing")
    .map((entry) => ({
      id: `issue-${entry.id}`,
      kind: "approval_missing" as const,
      severity: "blocking" as const,
      label: entry.label,
      summary: entry.summary,
      requiredAction: entry.requiredAction,
      relatedApprovalIds: entry.approvalId ? [entry.approvalId] : [],
      relatedInvalidationIds: [...entry.invalidationIds],
    }));
}

function buildUnresolvedApprovals(
  documentId: string,
  approvals: ApprovalSnapshot[],
  invalidations: InvalidationSnapshot[],
  preservedMissingApprovals: UnresolvedApprovalSnapshot[],
) {
  const derived = approvals
    .filter((approval) => ["pending", "changes_requested", "invalidated"].includes(approval.state))
    .map(
      (approval) =>
        ({
          id: `unresolved-${approval.id}`,
          status: approval.state === "pending" ? "pending" : "rejected",
          documentId,
          label: approval.reviewerLabel,
          authority: approval.authority,
          summary:
            approval.decisionNote ??
            (approval.state === "pending"
              ? `${approval.reviewerLabel} has not responded yet.`
              : `${approval.reviewerLabel} still requires follow-up before the document is fully current.`),
          requiredAction:
            approval.state === "pending"
              ? "Collect the reviewer decision or preserve the open approval in the publish record."
              : "Resolve the approval issue in-app or disclose the unresolved state during publish.",
          approvalId: approval.id,
          membershipId: approval.membershipId,
          invalidationIds: invalidations
            .filter((invalidation) => invalidation.affectsApprovalIds.includes(approval.id))
            .map((invalidation) => invalidation.id),
        }) satisfies UnresolvedApprovalSnapshot,
    );

  return dedupeByKey(
    [...derived, ...preservedMissingApprovals.filter((entry) => entry.status === "missing")],
    (entry) => entry.id,
  );
}

function buildFreshnessSummary(invalidations: InvalidationSnapshot[]) {
  if (invalidations.length === 0) {
    return "No linked invalidation is currently attached to this draft.";
  }

  if (invalidations.length === 1) {
    return invalidations[0]?.summary ?? "A linked document invalidation requires review.";
  }

  return `${invalidations.length} linked document invalidations require stale publish disclosure.`;
}

export function deriveDocumentState(input: DeriveDocumentStateInput): DocumentDerivedState {
  const unresolvedApprovals = buildUnresolvedApprovals(
    input.documentId,
    input.approvals,
    input.invalidations,
    input.preservedMissingApprovals ?? [],
  );
  const hasInvalidated = input.approvals.some((approval) => approval.state === "invalidated");
  const hasChangesRequested = input.approvals.some(
    (approval) => approval.state === "changes_requested",
  );
  const hasPending = input.approvals.some((approval) => approval.state === "pending");
  const hasRestored = input.approvals.some((approval) => approval.state === "restored");
  const hasApproved = input.approvals.some((approval) =>
    ["approved", "restored"].includes(approval.state),
  );
  const requestedApprovals = input.approvals.filter((approval) => approval.requestedAt != null);
  const respondedApprovals = input.approvals
    .filter((approval) => approval.respondedAt != null)
    .sort((left, right) => (left.respondedAt ?? "").localeCompare(right.respondedAt ?? ""));
  const latestReviewedApproval = respondedApprovals[respondedApprovals.length - 1] ?? null;
  const freshnessStatus: PublishStalenessStatus =
    input.invalidations.length > 0 ? "stale" : "current";
  const blockingIssues = buildBlockingIssues(unresolvedApprovals);

  const reviewStatus: DocumentReviewStatus =
    input.approvals.length === 0
      ? "idle"
      : hasInvalidated || hasChangesRequested
        ? "changes_requested"
        : hasPending
          ? "review_requested"
          : hasApproved
            ? "approved"
            : "idle";
  const approvalState: DocumentApprovalState =
    input.approvals.length === 0
      ? "not_requested"
      : hasInvalidated
        ? "invalidated"
        : hasChangesRequested
          ? "changes_requested"
          : hasPending
            ? "pending"
            : hasRestored
              ? "restored"
              : "approved";

  let status = input.currentStatus;

  if (!["published", "archived"].includes(input.currentStatus)) {
    status =
      reviewStatus === "approved"
        ? "approved"
        : input.approvals.length > 0
          ? "in_review"
          : input.currentStatus;
  }

  const prePublicationReadiness: DocumentPrePublicationReadiness =
    blockingIssues.length > 0
      ? "blocked"
      : unresolvedApprovals.length > 0 || freshnessStatus === "stale"
        ? "attention_required"
        : "ready";

  return {
    status,
    reviewStatus,
    approvalState,
    reviewRequestedAt: requestedApprovals[0]?.requestedAt ?? null,
    requestedByMembershipId: requestedApprovals[0]?.requestedByMembershipId ?? null,
    lastReviewedAt: latestReviewedApproval?.respondedAt ?? null,
    lastReviewedByMembershipId: latestReviewedApproval?.decisionByMembershipId ?? null,
    approvedAt: reviewStatus === "approved" ? (latestReviewedApproval?.respondedAt ?? null) : null,
    freshnessStatus,
    staleRationaleRequired: freshnessStatus === "stale",
    staleEvaluatedAt: input.timestamp,
    staleSummary: buildFreshnessSummary(input.invalidations),
    staleReasons: dedupeStrings(
      input.invalidations.map((entry) => entry.reason),
    ) as DocumentFreshnessReason[],
    unresolvedApprovals,
    unresolvedApprovalIds: dedupeStrings(unresolvedApprovals.map((entry) => entry.approvalId)),
    invalidationIds: input.invalidations.map((entry) => entry.id),
    blockingIssues,
    prePublicationReadiness,
    prePublicationSummary:
      unresolvedApprovals.length > 0
        ? `This document retains ${unresolvedApprovals.length} unresolved approval item${unresolvedApprovals.length === 1 ? "" : "s"} in the app-native review log.`
        : freshnessStatus === "stale"
          ? "This document is stale and requires rationale before GitHub publication begins."
          : "No unresolved approval or freshness issue is currently attached to this document.",
  };
}
