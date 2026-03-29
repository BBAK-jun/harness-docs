import type { PublishAttemptResult, PublishPreflightView, StaleReasonCode } from "@harness-docs/contracts";
import type { PublishRecord } from "../types/contracts";

export interface PublishFlowViewModel {
  subjectTitle: string;
  currentState: string;
  eligibilityStatus: string;
  freshnessStatus: string;
  stageCount: number;
  staleReasonCount: number;
  blockingIssueCount: number;
  rationaleRequired: boolean;
  rationaleDraft: {
    summary: string;
    details: string;
    acknowledgedReasonCodes: StaleReasonCode[];
  };
  latestAttemptKind: PublishAttemptResult["kind"] | null;
}

export function buildPublishFlowViewModel({
  publishRecord,
  preflight,
  attemptPreview,
  rationaleDraft,
  isRationaleRequired,
}: {
  publishRecord: PublishRecord | null;
  preflight: PublishPreflightView | null;
  attemptPreview: PublishAttemptResult | null;
  rationaleDraft: {
    summary: string;
    details: string;
    acknowledgedReasonCodes: StaleReasonCode[];
  };
  isRationaleRequired: boolean;
}): PublishFlowViewModel | null {
  if (!publishRecord || !preflight) {
    return null;
  }

  return {
    subjectTitle: preflight.document.title,
    currentState: preflight.currentState,
    eligibilityStatus: preflight.document.publishEligibility.status,
    freshnessStatus: preflight.document.freshnessStatus,
    stageCount: publishRecord.stages.length,
    staleReasonCount: preflight.document.staleReasons.length,
    blockingIssueCount: preflight.document.publishEligibility.blockingIssues.length,
    rationaleRequired: isRationaleRequired,
    rationaleDraft,
    latestAttemptKind: attemptPreview?.kind ?? null,
  };
}
