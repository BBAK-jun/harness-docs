import { useEffect, useMemo, useRef, useState } from "react";
import type {
  PublishAttemptResult,
  PublishPreflightView,
  StalePublishRationaleDto,
  StaleReasonCode,
} from "@harness-docs/contracts";
import { useMutation, useQuery } from "@tanstack/react-query";
import type { PublishExecutionResult } from "../domain/publishing";
import { buildPublishAttemptPreview, getDefaultPublishGovernanceSnapshot } from "../lib/publishGovernanceView";
import { buildPublishExecutionInput } from "../lib/runtimePayloads";
import { desktopMutationKeys, desktopQueryKeys } from "../queries/queryKeys";
import type { WorkspaceShellModel } from "./useWorkspaceShell";

type AsyncTaskState<TResult> = {
  status: "idle" | "running" | "succeeded" | "failed";
  error: string | null;
  result: TResult | null;
};

type PreflightQueryState = {
  status: "loading" | "error" | "ready";
  error: string | null;
};

type StalePublishRationaleDraft = {
  summary: string;
  details: string;
  acknowledgedReasonCodes: StaleReasonCode[];
};

export function usePublishPage(shell: WorkspaceShellModel) {
  const fallbackSnapshot = useMemo(() => {
    if (!shell.activeWorkspaceGraph) {
      return null;
    }

    return getDefaultPublishGovernanceSnapshot(shell.activeWorkspaceGraph);
  }, [shell.activeWorkspaceGraph]);
  const [rationaleDraft, setRationaleDraft] = useState<StalePublishRationaleDraft>({
    summary: "",
    details: "",
    acknowledgedReasonCodes: [],
  });
  const initializedRationaleDocumentIdRef = useRef<string | null>(null);
  const publishRecord =
    shell.activeWorkspaceGraph?.publishRecords[0] ?? fallbackSnapshot?.publishRecord ?? null;
  const targetDocumentId = shell.activeDocument?.id ?? fallbackSnapshot?.document.id ?? null;
  const workspaceId = shell.activeWorkspaceId;
  const preflightQuery = useQuery({
    queryKey: desktopQueryKeys.publishing.preflight(workspaceId ?? "unknown", targetDocumentId ?? "unknown"),
    enabled: Boolean(workspaceId && targetDocumentId),
    queryFn: async (): Promise<PublishPreflightView> => {
      if (!workspaceId || !targetDocumentId) {
        throw new Error("A document must be selected before publish preflight can load.");
      }

      const preflight = await shell.services.publishing.getDocumentPublishPreflight(
        workspaceId,
        targetDocumentId,
      );

      if (!preflight) {
        throw new Error("The selected document is not available for publish preflight.");
      }

      return preflight;
    },
  });
  const preflight = preflightQuery.data ?? null;
  const attemptPreview = useMemo<PublishAttemptResult | null>(() => {
    if (!preflight) {
      return null;
    }

    return buildPublishAttemptPreview(preflight, publishRecord);
  }, [preflight, publishRecord]);
  const isRationaleRequired = preflight?.document.publishEligibility.status === "requires_rationale";
  const isRationaleComplete =
    !isRationaleRequired ||
    (rationaleDraft.summary.trim().length > 0 &&
      rationaleDraft.details.trim().length > 0 &&
      rationaleDraft.acknowledgedReasonCodes.length > 0);
  const staleRationale: StalePublishRationaleDto | null = isRationaleRequired
    ? isRationaleComplete
      ? {
          summary: rationaleDraft.summary.trim(),
          details: rationaleDraft.details.trim(),
          acknowledgedReasonCodes: rationaleDraft.acknowledgedReasonCodes,
        }
      : null
    : null;

  useEffect(() => {
    if (!targetDocumentId) {
      initializedRationaleDocumentIdRef.current = null;
      setRationaleDraft({
        summary: "",
        details: "",
        acknowledgedReasonCodes: [],
      });
      return;
    }

    if (!preflight || initializedRationaleDocumentIdRef.current === targetDocumentId) {
      return;
    }

    initializedRationaleDocumentIdRef.current = targetDocumentId;
    setRationaleDraft({
      summary: publishRecord?.staleRationale ?? "",
      details: "",
      acknowledgedReasonCodes: preflight.document.staleReasons.map((reason) => reason.code),
    });
  }, [preflight, publishRecord?.staleRationale, targetDocumentId]);

  const publishMutation = useMutation({
    mutationKey: desktopMutationKeys.publishing.execute(),
    mutationFn: async ({
      workspaceGraph,
      drafts,
      membershipId,
    }: {
      workspaceGraph: NonNullable<WorkspaceShellModel["activeWorkspaceGraph"]>;
      drafts: Record<string, string>;
      membershipId: string | null;
    }) => {
      const publishInput = buildPublishExecutionInput(
        workspaceGraph,
        drafts,
        membershipId,
        staleRationale,
      );

      if (!publishInput) {
        throw new Error("No publish record is available for the active workspace.");
      }

      return shell.services.publishing.executePublish(publishInput);
    },
  });

  const handleExecutePublish = async () => {
    if (!shell.activeWorkspaceGraph || !preflight || preflight.document.publishEligibility.status === "blocked") {
      return;
    }

    if (isRationaleRequired && !isRationaleComplete) {
      return;
    }

    try {
      await publishMutation.mutateAsync({
        workspaceGraph: shell.activeWorkspaceGraph,
        drafts: shell.documentDrafts,
        membershipId: shell.activeMembershipId,
      });
      shell.handleAreaChange("publish");
    } catch (error) {
      void error;
    }
  };

  const publishState: AsyncTaskState<PublishExecutionResult> = publishMutation.isPending
    ? {
        status: "running",
        error: null,
        result: null,
      }
    : publishMutation.isError
      ? {
          status: "failed",
          error:
            publishMutation.error instanceof Error
              ? publishMutation.error.message
              : "GitHub publish failed.",
          result: null,
        }
      : publishMutation.isSuccess
        ? {
            status: "succeeded",
            error: null,
            result: publishMutation.data,
          }
        : {
            status: "idle",
            error: null,
            result: null,
          };

  const executeDisabledReason = !publishRecord
    ? "A publish record must exist before GitHub automation can start."
    : preflightQuery.isLoading && !preflight
      ? "Publish preflight is loading."
      : preflightQuery.isError && !preflight
        ? preflightQuery.error instanceof Error
          ? preflightQuery.error.message
          : "Publish preflight could not be loaded."
        : preflight?.document.publishEligibility.status === "blocked"
          ? "Publish is blocked until the blocking issues are resolved."
          : isRationaleRequired && !isRationaleComplete
            ? "Record a stale publish rationale before starting GitHub automation."
            : null;
  const preflightState: PreflightQueryState = {
    status: preflightQuery.isPending ? "loading" : preflightQuery.isError ? "error" : "ready",
    error:
      preflightQuery.error instanceof Error
        ? preflightQuery.error.message
        : preflightQuery.isError
          ? "Publish preflight failed."
          : null,
  };

  return {
    publishRecord,
    preflight,
    attemptPreview,
    targetDocumentId,
    preflightState,
    rationaleDraft,
    isRationaleRequired,
    isRationaleComplete,
    executeDisabledReason,
    handleRationaleSummaryChange: (summary: string) =>
      setRationaleDraft((current) => ({
        ...current,
        summary,
      })),
    handleRationaleDetailsChange: (details: string) =>
      setRationaleDraft((current) => ({
        ...current,
        details,
      })),
    handleReasonCodeToggle: (code: StaleReasonCode) =>
      setRationaleDraft((current) => ({
        ...current,
        acknowledgedReasonCodes: current.acknowledgedReasonCodes.includes(code)
          ? current.acknowledgedReasonCodes.filter((entry) => entry !== code)
          : [...current.acknowledgedReasonCodes, code],
      })),
    retryPreflight: async () => {
      await preflightQuery.refetch();
    },
    publishState,
    handleExecutePublish,
  };
}
