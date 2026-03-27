import type {
  PublishGovernanceAdapter,
  PublishGovernanceDocumentSnapshot,
  PublishGovernancePublishRecordSnapshot,
} from "@harness-docs/contracts";
import { projectPublishPreflightView } from "./publishGovernanceProjection.ts";

interface ApiDocumentLike {
  id: string;
  workspaceId: string;
  title: string;
  type: "PRD" | "UX Flow" | "Technical Spec" | "Policy/Decision";
  lifecycle: {
    status: string;
    updatedAt: string;
    review: {
      freshness: {
        status: "current" | "stale";
        evaluatedAt?: string | null;
        rationaleRequired: boolean;
        summary: string;
      };
    };
  };
  prePublication: {
    summary: string;
    staleRationaleRequired: boolean;
    evaluatedAt: string;
    blockingIssues: Array<{
      kind: string;
      severity: "warning" | "blocking";
      summary: string;
      requiredAction: string;
    }>;
  };
}

interface ApiPublishRecordLike {
  id: string;
  lifecycle: {
    status: "draft" | "ready_for_publish" | "publishing" | "published";
  };
  publication: {
    repository: {
      branchName: string;
    };
    pullRequest: {
      number?: number | null;
      url?: string | null;
    };
  };
  staleDocumentIds: string[];
}

interface ApiWorkspaceGraphLike {
  publishRecords?: ApiPublishRecordLike[];
}

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

function toDocumentSnapshot(document: ApiDocumentLike): PublishGovernanceDocumentSnapshot {
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

function toPublishRecordSnapshot(
  publishRecord: ApiPublishRecordLike | null,
): PublishGovernancePublishRecordSnapshot | null {
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
      const typedDocuments = documents as ApiDocumentLike[];
      const typedWorkspaceGraph = workspaceGraph as ApiWorkspaceGraphLike;
      const document = typedDocuments.find((entry) => entry.id === documentId) ?? null;

      if (!document) {
        return null;
      }

      const publishRecord =
        typedWorkspaceGraph.publishRecords?.find((record) =>
          record.staleDocumentIds.includes(documentId),
        ) ?? null;

      return projectPublishPreflightView(
        toDocumentSnapshot(document),
        toPublishRecordSnapshot(publishRecord),
      );
    },
  };
}
