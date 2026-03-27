import {
  type DocumentStatusView,
  type DocumentStaleReason,
  type PublishBlockingIssue,
  type PublishAttemptResult,
  type PublishEligibility,
  type PublishFlowState,
  type PublishFlowTransition,
  type PublishPreflightView,
  publishFlowTransitionMap,
} from "@harness-docs/contracts";
import type { PublishRecord, WorkspaceDocument, WorkspaceGraph } from "../types";

const STALE_THRESHOLD_DAYS = 7;

function isoDaysBetween(fromIso: string, toIso: string) {
  const from = new Date(fromIso).getTime();
  const to = new Date(toIso).getTime();

  return Math.floor((to - from) / (1000 * 60 * 60 * 24));
}

function buildStaleReasons(document: WorkspaceDocument, nowIso: string): DocumentStaleReason[] {
  const reasons: DocumentStaleReason[] = [];
  const ageInDays = isoDaysBetween(document.lifecycle.updatedAt, nowIso);

  if (ageInDays > STALE_THRESHOLD_DAYS) {
    reasons.push({
      code: "updated_at_older_than_7_days",
      summary: `The document was last updated ${ageInDays} days ago.`,
      detectedAt: nowIso,
      thresholdDays: STALE_THRESHOLD_DAYS,
    });
  }

  if (document.lifecycle.review.freshness.status === "stale") {
    reasons.push({
      code: "source_has_newer_changes_than_last_synced_at",
      summary: document.lifecycle.review.freshness.summary,
      detectedAt: document.lifecycle.review.freshness.evaluatedAt ?? nowIso,
      sourceUpdatedAt: document.lifecycle.updatedAt,
    });
  }

  if (reasons.length === 0 && document.lifecycle.review.freshness.rationaleRequired) {
    reasons.push({
      code: "last_synced_at_missing",
      summary: "The document requires rationale before publish because sync evidence is missing.",
      detectedAt: document.lifecycle.review.freshness.evaluatedAt ?? nowIso,
    });
  }

  return reasons;
}

function toEligibility(document: WorkspaceDocument, staleReasons: DocumentStaleReason[]): PublishEligibility {
  const blockingIssues: PublishBlockingIssue[] = document.prePublication.blockingIssues.map(
    (issue) => ({
      code:
        issue.kind === "approval_missing"
          ? "approval_missing"
          : issue.kind === "changes_requested"
            ? "approval_changes_requested"
            : issue.kind === "stale_rationale_required"
              ? "metadata_refresh_required"
              : "validation_failed",
      summary: issue.summary,
      requiredAction: issue.requiredAction,
    }),
  );

  if (document.prePublication.readiness === "blocked") {
    return {
      status: "blocked",
      canPublish: false,
      requiresRationale: false,
      staleReasons,
      blockingIssues,
      summary: document.prePublication.summary,
    };
  }

  if (document.prePublication.staleRationaleRequired) {
    return {
      status: "requires_rationale",
      canPublish: true,
      requiresRationale: true,
      staleReasons,
      blockingIssues,
      summary: document.prePublication.summary,
    };
  }

  return {
    status: "allowed",
    canPublish: true,
    requiresRationale: false,
    staleReasons,
    blockingIssues,
    summary: document.prePublication.summary,
  };
}

export function toDocumentStatusView(document: WorkspaceDocument, nowIso: string): DocumentStatusView {
  const staleReasons = buildStaleReasons(document, nowIso);
  const publishEligibility = toEligibility(document, staleReasons);

  return {
    id: document.id,
    workspaceId: document.workspaceId,
    title: document.title,
    type: document.type,
    updatedAt: document.lifecycle.updatedAt,
    lastSyncedAt: document.lifecycle.review.freshness.evaluatedAt ?? null,
    storedStatus:
      document.lifecycle.status === "published" ? "published_pr_created" : "draft",
    freshnessStatus:
      document.lifecycle.review.freshness.status === "stale"
        ? "stale"
        : document.prePublication.blockingIssues.some((issue) => issue.kind === "stale_rationale_required")
          ? "sync_required"
          : "fresh",
    isStale: staleReasons.length > 0,
    staleReasons,
    validation: {
      status: document.prePublication.blockingIssues.some((issue) => issue.kind === "review_request_required")
        ? "failed"
        : "passed",
      checkedAt: document.prePublication.evaluatedAt,
      issues: document.prePublication.blockingIssues.map((issue) => ({
        code: issue.kind,
        message: issue.summary,
        severity: issue.severity === "blocking" ? "blocking" : "warning",
      })),
    },
    metadata: {
      status: document.prePublication.staleRationaleRequired ? "outdated" : "current",
      checkedAt: document.prePublication.evaluatedAt,
      issues: document.prePublication.staleRationaleRequired
        ? [
            {
              code: "stale_rationale_required",
              message: "Publish requires rationale because the document is stale.",
              severity: "warning",
            },
          ]
        : [],
    },
    publishEligibility,
    activePullRequest: null,
  };
}

export function getPublishFlowState(
  documentView: DocumentStatusView,
  publishRecord: PublishRecord | null,
): PublishFlowState {
  if (publishRecord?.lifecycle.status === "published") {
    return "published_pr_created";
  }

  if (publishRecord?.lifecycle.status === "publishing") {
    return "publishing";
  }

  if (documentView.publishEligibility.status === "blocked") {
    return "blocked";
  }

  if (documentView.publishEligibility.status === "requires_rationale") {
    return "stale_requires_rationale";
  }

  return "ready_to_publish";
}

export function getAllowedTransitions(currentState: PublishFlowState): PublishFlowTransition[] {
  const transitions = publishFlowTransitionMap[currentState];

  return Object.entries(transitions).flatMap(([trigger, nextStates]) =>
    (nextStates ?? []).map((to: PublishFlowState) => ({
      from: currentState,
      trigger: trigger as PublishFlowTransition["trigger"],
      to,
    })),
  );
}

export function toPublishPreflightView(
  document: WorkspaceDocument,
  publishRecord: PublishRecord | null,
  nowIso: string,
): PublishPreflightView {
  const documentView = toDocumentStatusView(document, nowIso);
  const currentState = getPublishFlowState(documentView, publishRecord);

  return {
    document: documentView,
    currentState,
    allowedTransitions: getAllowedTransitions(currentState),
  };
}

export function buildPublishAttemptPreview(
  preflight: PublishPreflightView,
  publishRecord: PublishRecord | null,
): PublishAttemptResult {
  if (preflight.document.publishEligibility.status === "blocked") {
    return {
      kind: "publish_blocked",
      transition: {
        from: preflight.currentState,
        trigger: "publish_attempted",
        to: "blocked",
      },
      blockingIssues: preflight.document.publishEligibility.blockingIssues,
    };
  }

  if (preflight.document.publishEligibility.status === "requires_rationale") {
    return {
      kind: "rationale_required",
      transition: {
        from: preflight.currentState,
        trigger: "publish_attempted",
        to: "stale_requires_rationale",
      },
      staleReasons: preflight.document.staleReasons,
      requiredRationaleFields: ["summary", "details", "acknowledgedReasonCodes"],
    };
  }

  return {
    kind: "publish_succeeded",
    transition: {
      from: preflight.currentState,
      trigger: "publish_succeeded",
      to: publishRecord?.lifecycle.status === "published" ? "published_pr_created" : "publishing",
    },
    publishRecordId: publishRecord?.id ?? "preview",
    pullRequest:
      publishRecord?.publication.pullRequest.url != null &&
      publishRecord.publication.pullRequest.number != null
        ? {
            id: `${publishRecord.id}-pr`,
            number: publishRecord.publication.pullRequest.number,
            url: publishRecord.publication.pullRequest.url,
            branchName: publishRecord.publication.repository.branchName,
          }
        : {
            id: "preview-pr",
            number: 0,
            url: "pending",
            branchName: publishRecord?.publication.repository.branchName ?? "pending",
          },
  };
}

export function getDefaultPublishGovernanceSnapshot(workspaceGraph: WorkspaceGraph) {
  const publishRecord = workspaceGraph.publishRecords[0] ?? null;
  const document =
    workspaceGraph.documents.find((entry) =>
      publishRecord ? publishRecord.staleDocumentIds.includes(entry.id) : false,
    ) ??
    workspaceGraph.documents.find((entry) => entry.prePublication.publishRecordId === publishRecord?.id) ??
    workspaceGraph.documents[0];

  if (!document) {
    return null;
  }

  const nowIso = new Date().toISOString();
  const preflight = toPublishPreflightView(document, publishRecord, nowIso);

  return {
    document,
    publishRecord,
    preflight,
    attemptPreview: buildPublishAttemptPreview(preflight, publishRecord),
  };
}
