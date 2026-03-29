import { useMemo } from "react";
import { useMutation } from "@tanstack/react-query";
import type { AITaskExecutionResult } from "../domain/aiTasks";
import { buildAITaskEntryPoints } from "../lib/aiTaskEntryPoints";
import { buildAITaskExecutionInput } from "../lib/runtimePayloads";
import { desktopMutationKeys } from "../queries/queryKeys";
import type { AITaskEntryPoint } from "../types/domain-ui";
import type { WorkspaceShellModel } from "./useWorkspaceShell";

type AsyncTaskState<TResult> = {
  status: "idle" | "running" | "succeeded" | "failed";
  error: string | null;
  result: TResult | null;
  entryId?: string | null;
};

export function useAIPage(shell: WorkspaceShellModel) {
  const aiTaskMutation = useMutation({
    mutationKey: desktopMutationKeys.ai.runEntryPoint(),
    mutationFn: async ({
      entry,
      workspaceGraph,
      drafts,
    }: {
      entry: AITaskEntryPoint;
      workspaceGraph: NonNullable<WorkspaceShellModel["activeWorkspaceGraph"]>;
      drafts: Record<string, string>;
    }) =>
      shell.services.aiTasks.runEntryPoint(buildAITaskExecutionInput(entry, workspaceGraph, drafts)),
  });

  const aiEntryPoints = useMemo(
    () =>
      shell.activeWorkspaceGraph
        ? buildAITaskEntryPoints({
            workspaceGraph: shell.activeWorkspaceGraph,
            activeDocument: shell.activeDocument,
            preferredProvider: shell.preferredAIProvider,
            activeMembershipId: shell.activeMembershipId,
          })
        : [],
    [
      shell.activeDocument,
      shell.activeMembershipId,
      shell.activeWorkspaceGraph,
      shell.preferredAIProvider,
    ],
  );

  const handleLaunchAITaskEntryPoint = async (entry: AITaskEntryPoint) => {
    if (entry.documentId && shell.activeWorkspaceGraph) {
      shell.handleDocumentSelect(entry.documentId);
    }

    shell.handlePreferredAIProviderChange(entry.provider);
    shell.handleAreaChange("ai");

    if (!shell.activeWorkspaceGraph) {
      return;
    }

    await aiTaskMutation.mutateAsync({
      entry,
      workspaceGraph: shell.activeWorkspaceGraph,
      drafts: shell.documentDrafts,
    });
  };

  const aiTaskState: AsyncTaskState<AITaskExecutionResult> = aiTaskMutation.isPending
    ? {
        status: "running",
        error: null,
        result: null,
        entryId: aiTaskMutation.variables?.entry.id ?? null,
      }
    : aiTaskMutation.isError
      ? {
          status: "failed",
          error:
            aiTaskMutation.error instanceof Error
              ? aiTaskMutation.error.message
              : "AI task execution failed.",
          result: null,
          entryId: aiTaskMutation.variables?.entry.id ?? null,
        }
      : aiTaskMutation.isSuccess
        ? {
            status: "succeeded",
            error: null,
            result: aiTaskMutation.data,
            entryId: aiTaskMutation.variables?.entry.id ?? null,
          }
        : {
            status: "idle",
            error: null,
            result: null,
            entryId: null,
          };

  return {
    aiEntryPoints,
    aiTaskState,
    handleLaunchAITaskEntryPoint,
  };
}
