import { z } from "zod";

/**
 * Document identity and timestamps are repeated across read models so the
 * desktop can render policy decisions without re-shaping the payload.
 */
export interface DocumentReference {
  id: string;
  workspaceId: string;
  title: string;
  type: "PRD" | "UX Flow" | "Technical Spec" | "Policy/Decision";
  updatedAt: string;
  lastSyncedAt: string | null;
}

/**
 * Persisted document lifecycle owned by the server.
 * These are facts stored by the system, not policy interpretations.
 */
export const documentStoredStatusSchema = z.enum(["draft", "publishing", "published_pr_created"]);

export type DocumentStoredStatus = z.infer<typeof documentStoredStatusSchema>;

/**
 * Computed freshness policy derived by API at read time.
 * This is the main policy surface the desktop should show to users.
 */
export const documentFreshnessStatusSchema = z.enum([
  "fresh",
  "stale",
  "sync_required",
  "validation_required",
  "metadata_refresh_required",
]);

export type DocumentFreshnessStatus = z.infer<typeof documentFreshnessStatusSchema>;

/**
 * Fine-grained reasons explaining why a document is stale or why a rationale is needed.
 * These reason codes are intended to be stable across UI, API, and persisted records.
 */
export const staleReasonCodeSchema = z.enum([
  "updated_at_older_than_7_days",
  "source_has_newer_changes_than_last_synced_at",
  "last_synced_at_missing",
]);

export type StaleReasonCode = z.infer<typeof staleReasonCodeSchema>;

export interface DocumentStaleReason {
  code: StaleReasonCode;
  summary: string;
  detectedAt: string;
  thresholdDays?: number;
  sourceUpdatedAt?: string | null;
}

/**
 * Validation and metadata are explicit snapshots so the caller can see why a
 * document is not yet "clean" even if stale publish is allowed with rationale.
 */
export interface DocumentValidationIssue {
  code: string;
  message: string;
  severity: "info" | "warning" | "blocking";
}

export interface DocumentValidationSnapshot {
  status: "not_run" | "passed" | "failed";
  checkedAt: string | null;
  issues: DocumentValidationIssue[];
}

export interface DocumentMetadataIssue {
  code: string;
  message: string;
  severity: "info" | "warning" | "blocking";
}

export interface DocumentMetadataSnapshot {
  status: "not_checked" | "current" | "outdated";
  checkedAt: string | null;
  issues: DocumentMetadataIssue[];
}

/**
 * This view is the authoritative policy snapshot returned by API for a single document.
 * The type itself is intended to be readable enough to serve as living documentation.
 */
export interface DocumentStatusView extends DocumentReference {
  storedStatus: DocumentStoredStatus;
  freshnessStatus: DocumentFreshnessStatus;
  isStale: boolean;
  staleReasons: DocumentStaleReason[];
  validation: DocumentValidationSnapshot;
  metadata: DocumentMetadataSnapshot;
  publishEligibility: PublishEligibility;
  activePullRequest: PublishPullRequestRef | null;
}

export interface PublishPullRequestRef {
  id: string;
  number: number;
  url: string;
  branchName: string;
}

/**
 * `blocked` means publish cannot proceed even with rationale.
 * `requires_rationale` means stale publish is allowed, but only with user explanation.
 * `allowed` means publish can proceed immediately.
 */
export const publishEligibilityStatusSchema = z.enum(["allowed", "requires_rationale", "blocked"]);

export type PublishEligibilityStatus = z.infer<typeof publishEligibilityStatusSchema>;

export interface PublishBlockingIssue {
  code:
    | "validation_failed"
    | "metadata_refresh_required"
    | "approval_missing"
    | "approval_changes_requested"
    | "document_not_found";
  summary: string;
  requiredAction: string;
}

/**
 * Projection input snapshots are the only inputs that API/Desktop adapters may
 * pass into governance projection code. This prevents cross-app type leakage.
 */
export interface PublishGovernanceBlockingIssueSnapshot {
  code:
    | "validation_failed"
    | "metadata_refresh_required"
    | "approval_missing"
    | "approval_changes_requested"
    | "document_not_found";
  summary: string;
  requiredAction: string;
  severity: "warning" | "blocking";
}

export interface PublishGovernanceValidationSnapshot {
  status: "not_run" | "passed" | "failed";
  checkedAt: string | null;
  issues: DocumentValidationIssue[];
}

export interface PublishGovernanceMetadataSnapshot {
  status: "not_checked" | "current" | "outdated";
  checkedAt: string | null;
  issues: DocumentMetadataIssue[];
}

export interface PublishGovernanceDocumentSnapshot extends DocumentReference {
  storedStatus: DocumentStoredStatus;
  freshnessStatus: DocumentFreshnessStatus;
  staleReasons: DocumentStaleReason[];
  validation: PublishGovernanceValidationSnapshot;
  metadata: PublishGovernanceMetadataSnapshot;
  blockingIssues: PublishGovernanceBlockingIssueSnapshot[];
  summary: string;
  requiresRationale: boolean;
}

export interface PublishGovernancePublishRecordSnapshot {
  status: "draft" | "publishing" | "published_pr_created" | null;
  pullRequest: PublishPullRequestRef | null;
}

export interface PublishEligibility {
  status: PublishEligibilityStatus;
  canPublish: boolean;
  requiresRationale: boolean;
  staleReasons: DocumentStaleReason[];
  blockingIssues: PublishBlockingIssue[];
  summary: string;
}

/**
 * User-provided rationale for stale publish.
 * Keep this explicit so it can be stored in publish records and shown back later.
 */
export const stalePublishRationaleSchema = z.object({
  summary: z.string().min(1),
  details: z.string().min(1),
  acknowledgedReasonCodes: z.array(staleReasonCodeSchema).min(1),
});

export type StalePublishRationaleDto = z.infer<typeof stalePublishRationaleSchema>;

/**
 * Explicit state machine for the publish interaction.
 * The stored document state and the computed policy state are different concerns,
 * so publish UI gets its own state machine.
 */
export const publishFlowStateSchema = z.enum([
  "idle",
  "ready_to_publish",
  "stale_requires_rationale",
  "blocked",
  "publishing",
  "published_pr_created",
]);

export type PublishFlowState = z.infer<typeof publishFlowStateSchema>;

export const publishFlowTriggerSchema = z.enum([
  "document_loaded",
  "publish_attempted",
  "rationale_provided",
  "sync_requested",
  "sync_completed",
  "publish_started",
  "publish_succeeded",
  "publish_failed",
]);

export type PublishFlowTrigger = z.infer<typeof publishFlowTriggerSchema>;

/**
 * Transition table doubles as documentation.
 * It expresses which next states are legal for each current state and trigger.
 */
export const publishFlowTransitionMap = {
  idle: {
    document_loaded: ["ready_to_publish", "stale_requires_rationale", "blocked"],
  },
  ready_to_publish: {
    publish_attempted: ["publishing"],
    sync_requested: ["blocked", "ready_to_publish", "stale_requires_rationale"],
  },
  stale_requires_rationale: {
    rationale_provided: ["ready_to_publish"],
    sync_requested: ["blocked", "ready_to_publish", "stale_requires_rationale"],
  },
  blocked: {
    sync_completed: ["ready_to_publish", "stale_requires_rationale", "blocked"],
    document_loaded: ["ready_to_publish", "stale_requires_rationale", "blocked"],
  },
  publishing: {
    publish_succeeded: ["published_pr_created"],
    publish_failed: ["ready_to_publish", "stale_requires_rationale", "blocked"],
  },
  published_pr_created: {
    document_loaded: ["published_pr_created", "stale_requires_rationale"],
  },
} as const satisfies Record<
  PublishFlowState,
  Partial<Record<PublishFlowTrigger, readonly PublishFlowState[]>>
>;

export type PublishFlowTransitionMap = typeof publishFlowTransitionMap;

export interface PublishFlowTransition {
  from: PublishFlowState;
  trigger: PublishFlowTrigger;
  to: PublishFlowState;
}

/**
 * Preflight response is the server's explanation of where the publish flow stands
 * before any Git automation is started.
 */
export interface PublishPreflightView {
  document: DocumentStatusView;
  currentState: PublishFlowState;
  allowedTransitions: PublishFlowTransition[];
}

export const publishAttemptRequestSchema = z.object({
  initiatedByMembershipId: z.string().min(1),
  commitMessage: z.string().min(1).optional(),
  pullRequestTitle: z.string().min(1).optional(),
  staleRationale: stalePublishRationaleSchema.optional(),
});

export type PublishAttemptRequestDto = z.infer<typeof publishAttemptRequestSchema>;

export interface PublishSuccessResult {
  kind: "publish_succeeded";
  transition: PublishFlowTransition;
  publishRecordId: string;
  pullRequest: PublishPullRequestRef;
}

export interface PublishRationaleRequiredResult {
  kind: "rationale_required";
  transition: PublishFlowTransition;
  staleReasons: DocumentStaleReason[];
  requiredRationaleFields: Array<keyof StalePublishRationaleDto>;
}

export interface PublishBlockedResult {
  kind: "publish_blocked";
  transition: PublishFlowTransition;
  blockingIssues: PublishBlockingIssue[];
}

export type PublishAttemptResult =
  | PublishSuccessResult
  | PublishRationaleRequiredResult
  | PublishBlockedResult;

export interface DocumentStatusEnvelopeDto {
  document: DocumentStatusView;
}

export interface PublishPreflightEnvelopeDto {
  preflight: PublishPreflightView;
}

export interface PublishAttemptEnvelopeDto {
  result: PublishAttemptResult;
}
