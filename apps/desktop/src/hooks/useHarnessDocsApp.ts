import { useEffect, useMemo } from "react";
import { useMutation } from "@tanstack/react-query";
import type { AITaskExecutionResult } from "../domain/aiTasks";
import type { PublishExecutionResult } from "../domain/publishing";
import { buildAITaskEntryPoints } from "../lib/aiTaskEntryPoints";
import { buildAITaskExecutionInput, buildPublishExecutionInput } from "../lib/runtimePayloads";
import { desktopMutationKeys } from "../queries/queryKeys";
import type {
  AppPreferences,
} from "../services/contracts";
import type {
  AITaskEntryPoint,
  NavigationArea,
  WorkspaceGraph,
} from "../types";
import { useAppBootstrap } from "./useAppBootstrap";
import { useWorkspaceLocalState } from "./useWorkspaceLocalState";

type AsyncTaskState<TResult> = {
  status: "idle" | "running" | "succeeded" | "failed";
  error: string | null;
  result: TResult | null;
  entryId?: string | null;
};

export interface HarnessDocsAppRouteState {
  activeWorkspaceId: string | null;
  activeArea: NavigationArea;
  selectedDocumentId: string | null;
}

export interface HarnessDocsAppNavigation {
  onAreaChange: (area: NavigationArea) => void;
  onSelectedDocumentChange: (documentId: string) => void;
  onWorkspaceEnter: (workspaceId: string) => void;
  onWorkspaceLeave: () => void;
}

export function useHarnessDocsApp(
  routeState: HarnessDocsAppRouteState,
  navigation: HarnessDocsAppNavigation,
) {
  const bootstrap = useAppBootstrap();
  const { services } = bootstrap;

  const aiTaskMutation = useMutation({
    mutationKey: desktopMutationKeys.ai.runEntryPoint(),
    mutationFn: async ({
      entry,
      workspaceGraph,
      drafts,
    }: {
      entry: AITaskEntryPoint;
      workspaceGraph: WorkspaceGraph;
      drafts: Record<string, string>;
    }) => services.aiTasks.runEntryPoint(buildAITaskExecutionInput(entry, workspaceGraph, drafts)),
  });

  const publishMutation = useMutation({
    mutationKey: desktopMutationKeys.publishing.execute(),
    mutationFn: async ({
      workspaceGraph,
      drafts,
      membershipId,
    }: {
      workspaceGraph: WorkspaceGraph;
      drafts: Record<string, string>;
      membershipId: string | null;
    }) => {
      const input = buildPublishExecutionInput(workspaceGraph, drafts, membershipId);

      if (!input) {
        throw new Error("No publish record is available for the active workspace.");
      }

      return services.publishing.executePublish(input);
    },
  });

  const authentication = bootstrap.authentication;
  const session = bootstrap.session;
  const workspaces = session?.workspaces ?? [];
  const user = authentication?.user ?? null;
  const activeWorkspace = useMemo(
    () => workspaces.find((workspace) => workspace.id === routeState.activeWorkspaceId) ?? null,
    [routeState.activeWorkspaceId, workspaces],
  );
  const activeMembershipId = useMemo(() => {
    if (!activeWorkspace || !user) {
      return null;
    }

    const graph = session?.workspaceGraphs.find((entry) => entry.workspace.id === activeWorkspace.id);
    return (
      graph?.memberships.find(
        (membership) => membership.userId === user.id && membership.lifecycle.status === "active",
      )?.id ?? null
    );
  }, [activeWorkspace, session?.workspaceGraphs, user]);
  const localState = useWorkspaceLocalState(session?.workspaceGraphs ?? [], {
    activeWorkspaceId: routeState.activeWorkspaceId,
    selectedDocumentId: routeState.selectedDocumentId,
    userId: user?.id ?? null,
    activeMembershipId,
    onSelectedDocumentChange: navigation.onSelectedDocumentChange,
  });
  const {
    workspaceGraphs,
    activeWorkspaceGraph,
    activeDocument,
    activeDocumentSource,
    activeDocumentLock,
  } =
    localState;
  const activeMembership = useMemo(() => {
    if (!activeWorkspaceGraph || !user) {
      return null;
    }

    return (
      activeWorkspaceGraph.memberships.find(
        (membership) => membership.userId === user.id && membership.lifecycle.status === "active",
      ) ?? null
    );
  }, [activeWorkspaceGraph, user]);
  const aiEntryPoints = useMemo(
    () =>
      activeWorkspaceGraph
        ? buildAITaskEntryPoints({
            workspaceGraph: activeWorkspaceGraph,
            activeDocument,
            preferredProvider: bootstrap.preferredAIProvider,
            activeMembershipId: activeMembership?.id ?? null,
          })
        : [],
    [activeDocument, activeMembership, activeWorkspaceGraph, bootstrap.preferredAIProvider],
  );

  useEffect(() => {
    if (
      !activeDocument ||
      !activeMembership ||
      !activeDocumentLock ||
      activeDocumentLock.lifecycle.status !== "active" ||
      activeDocumentLock.lockedByMembershipId !== activeMembership.id
    ) {
      return;
    }

    const touchActiveLock = () => {
      const now = Date.now();

      if (now - localState.lastInteractionTouchMsRef.current < 60_000) {
        return;
      }

      localState.lastInteractionTouchMsRef.current = now;
      localState.touchDocumentEditingLock({
        documentId: activeDocument.id,
        membershipId: activeMembership.id,
      });
    };

    return services.desktopWindow.subscribeToUserActivity(touchActiveLock);
  }, [
    activeDocument,
    activeDocumentLock,
    activeMembership,
    localState.lastInteractionTouchMsRef,
    localState.touchDocumentEditingLock,
    services,
  ]);

  const handleLaunchAITaskEntryPoint = async (entry: AITaskEntryPoint) => {
    if (entry.documentId && activeWorkspaceGraph) {
      navigation.onSelectedDocumentChange(entry.documentId);
    }

    bootstrap.handlePreferredAIProviderChange(entry.provider);
    navigation.onAreaChange("ai");

    if (!activeWorkspaceGraph) {
      return;
    }

    await aiTaskMutation.mutateAsync({
      entry,
      workspaceGraph: activeWorkspaceGraph,
      drafts: localState.documentDrafts,
    });
  };

  const handleExecutePublish = async () => {
    if (!activeWorkspaceGraph) {
      return;
    }

    try {
      await publishMutation.mutateAsync({
        workspaceGraph: activeWorkspaceGraph,
        drafts: localState.documentDrafts,
        membershipId: activeMembership?.id ?? null,
      });
      navigation.onAreaChange("publish");
    } catch (error) {
      void error;
    }
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

  return {
    isReady: bootstrap.isReady,
    desktopShell: bootstrap.desktopShell,
    authentication,
    user,
    workspaces,
    activeWorkspaceId: routeState.activeWorkspaceId,
    activeWorkspace,
    activeWorkspaceGraph,
    activeArea: routeState.activeArea,
    appearanceMode: bootstrap.appearanceMode,
    preferredAIProvider: bootstrap.preferredAIProvider,
    aiEntryPoints,
    aiTaskState,
    publishState,
    activeDocument,
    activeMembershipId: activeMembership?.id ?? null,
    activeDocumentSource,
    activeDocumentLock,
    handlePreferredAIProviderChange: bootstrap.handlePreferredAIProviderChange,
    handleAppearanceModeChange: bootstrap.handleAppearanceModeChange,
    handleSignIn: bootstrap.handleSignIn,
    handleSignOut: async () => {
      await bootstrap.handleSignOut();
      navigation.onWorkspaceLeave();
    },
    handleWorkspaceEnter: navigation.onWorkspaceEnter,
    handleWorkspaceLeave: navigation.onWorkspaceLeave,
    handleDocumentSelect: localState.handleDocumentSelect,
    handleLaunchAITaskEntryPoint,
    handleExecutePublish,
    handleDocumentSourceChange: localState.handleDocumentSourceChange,
    handleStartEditing: localState.handleStartEditing,
    handleReleaseEditing: localState.handleReleaseEditing,
    handleCreateBlockComment: localState.handleCreateBlockComment,
    handleAreaChange: navigation.onAreaChange,
  };
}

export type HarnessDocsAppModel = ReturnType<typeof useHarnessDocsApp>;
