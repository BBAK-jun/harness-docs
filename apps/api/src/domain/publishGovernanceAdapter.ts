import type {
  PublishGovernanceDocumentSnapshot,
  PublishGovernancePublishRecordSnapshot,
  PublishRecord,
  WorkspaceDocument,
  WorkspaceGraph,
} from "@harness-docs/contracts";
import type { PublishGovernanceAdapter } from "../application/ports.ts";
import { projectPublishPreflightView } from "./publishGovernanceProjection.ts";

function toBlockingIssueCode(kind: string) {
  switch (kind) {
    case "approval_missing":
      return "approval_missing";
    case "changes_requested":
      return "approval_changes_requested";
    case "stale_rationale_required":
      return "metadata_refresh_required";
    default:
      return "validation_failed";
  }
}

function toDocumentSnapshot(document: WorkspaceDocument): PublishGovernanceDocumentSnapshot {
  const staleReasons = [];

  if (document.lifecycle.review.freshness.status === "stale") {
    staleReasons.push({
      code: "source_has_newer_changes_than_last_synced_at" as const,
      summary: document.lifecycle.review.freshness.summary,
      detectedAt:
        document.lifecycle.review.freshness.evaluatedAt ?? document.prePublication.evaluatedAt,
      sourceUpdatedAt: document.lifecycle.updatedAt,
    });
  }

  return {
    id: document.id,
    workspaceId: document.workspaceId,
    title: document.title,
    type: document.type,
    updatedAt: document.lifecycle.updatedAt,
    lastSyncedAt: document.lifecycle.review.freshness.evaluatedAt ?? null,
    storedStatus: document.lifecycle.status === "published" ? "published_pr_created" : "draft",
    freshnessStatus: document.lifecycle.review.freshness.status === "stale" ? "stale" : "fresh",
    staleReasons,
    validation: {
      status: document.prePublication.blockingIssues.length > 0 ? "failed" : "passed",
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
    blockingIssues: document.prePublication.blockingIssues.map((issue) => ({
      code: toBlockingIssueCode(issue.kind),
      summary: issue.summary,
      requiredAction: issue.requiredAction,
      severity: issue.severity,
    })),
    summary: document.prePublication.summary,
    requiresRationale: document.prePublication.staleRationaleRequired,
  };
}

function toPublishRecordSnapshot(publishRecord: PublishRecord | null): PublishGovernancePublishRecordSnapshot | null {
  if (!publishRecord) {
    return null;
  }

  return {
    status:
      publishRecord.lifecycle.status === "published"
        ? "published_pr_created"
        : publishRecord.lifecycle.status === "ready_for_publish"
          ? "draft"
          : publishRecord.lifecycle.status,
    pullRequest:
      publishRecord.publication.pullRequest.number != null &&
      publishRecord.publication.pullRequest.url != null
        ? {
            id: `${publishRecord.id}-pr`,
            number: publishRecord.publication.pullRequest.number,
            url: publishRecord.publication.pullRequest.url,
            branchName: publishRecord.publication.repository.branchName,
          }
        : null,
  };
}

export function createPublishGovernanceAdapter(): PublishGovernanceAdapter {
  return {
    projectDocumentPublishPreflight({ documentId, workspaceGraph, documents }) {
      const document = documents.find((entry) => entry.id === documentId) ?? null;

      if (!document) {
        return null;
      }

      const publishRecord = workspaceGraph.publishRecords.find((record) =>
        record.staleDocumentIds.includes(documentId),
      ) ?? null;

      return projectPublishPreflightView(
        toDocumentSnapshot(document),
        toPublishRecordSnapshot(publishRecord),
      );
    },
  };
}
