import type {
  PublishGovernanceDocumentSnapshot,
  PublishGovernancePublishRecordSnapshot,
  PublishAttemptResult,
  PublishEligibility,
  PublishFlowState,
  PublishFlowTransition,
  PublishPreflightView,
  DocumentStatusView,
} from "@harness-docs/contracts";
import { publishFlowTransitionMap } from "@harness-docs/contracts";

function projectEligibility(document: PublishGovernanceDocumentSnapshot): PublishEligibility {
  const blockingIssues = document.blockingIssues.map(({ code, summary, requiredAction }) => ({
    code,
    summary,
    requiredAction,
  }));

  if (document.blockingIssues.some((issue) => issue.severity === "blocking")) {
    return {
      status: "blocked",
      canPublish: false,
      requiresRationale: false,
      staleReasons: document.staleReasons,
      blockingIssues,
      summary: document.summary,
    };
  }

  if (document.requiresRationale) {
    return {
      status: "requires_rationale",
      canPublish: true,
      requiresRationale: true,
      staleReasons: document.staleReasons,
      blockingIssues,
      summary: document.summary,
    };
  }

  return {
    status: "allowed",
    canPublish: true,
    requiresRationale: false,
    staleReasons: document.staleReasons,
    blockingIssues,
    summary: document.summary,
  };
}

export function projectDocumentStatusView(
  document: PublishGovernanceDocumentSnapshot,
  publishRecord: PublishGovernancePublishRecordSnapshot | null,
): DocumentStatusView {
  const eligibility = projectEligibility(document);

  return {
    id: document.id,
    workspaceId: document.workspaceId,
    title: document.title,
    type: document.type,
    updatedAt: document.updatedAt,
    lastSyncedAt: document.lastSyncedAt,
    storedStatus: publishRecord?.status ?? document.storedStatus,
    freshnessStatus: document.freshnessStatus,
    isStale: document.staleReasons.length > 0,
    staleReasons: document.staleReasons,
    validation: document.validation,
    metadata: document.metadata,
    publishEligibility: eligibility,
    activePullRequest: publishRecord?.pullRequest ?? null,
  };
}

export function projectPublishFlowState(documentView: DocumentStatusView): PublishFlowState {
  if (documentView.storedStatus === "published_pr_created") {
    return "published_pr_created";
  }

  if (documentView.storedStatus === "publishing") {
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

export function projectAllowedTransitions(currentState: PublishFlowState): PublishFlowTransition[] {
  const stateTransitions = publishFlowTransitionMap[currentState];

  return Object.entries(stateTransitions).flatMap(([trigger, nextStates]) =>
    (nextStates ?? []).map((to: PublishFlowState) => ({
      from: currentState,
      trigger: trigger as PublishFlowTransition["trigger"],
      to,
    })),
  );
}

export function projectPublishPreflightView(
  document: PublishGovernanceDocumentSnapshot,
  publishRecord: PublishGovernancePublishRecordSnapshot | null,
): PublishPreflightView {
  const documentView = projectDocumentStatusView(document, publishRecord);
  const currentState = projectPublishFlowState(documentView);

  return {
    document: documentView,
    currentState,
    allowedTransitions: projectAllowedTransitions(currentState),
  };
}

export function projectPublishAttemptResult(preflight: PublishPreflightView): PublishAttemptResult {
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
      trigger: "publish_started",
      to: "publishing",
    },
    publishRecordId: preflight.document.activePullRequest?.id ?? "pending",
    pullRequest: preflight.document.activePullRequest ?? {
      id: "pending",
      number: 0,
      url: "pending",
      branchName: "pending",
    },
  };
}
