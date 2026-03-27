import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { AITaskExecutionResult } from "../domain/aiTasks";
import type { PublishExecutionResult } from "../domain/publishing";
import { buildAITaskEntryPoints } from "../lib/aiTaskEntryPoints";
import { buildAITaskExecutionInput, buildPublishExecutionInput } from "../lib/runtimePayloads";
import { desktopMutationKeys, desktopQueryKeys } from "../queries/queryKeys";
import { useHarnessDocsServices } from "../services/HarnessDocsServicesProvider";
import type {
  AppSessionSnapshot,
  AppPreferences,
  AuthenticationSessionSnapshot,
  DesktopShellMetadata,
  WorkspaceSessionSnapshot,
} from "../services/contracts";
import { fallbackAppPreferences } from "../services/mockHarnessDocsServices";
import type {
  AITaskEntryPoint,
  CommentBlockKind,
  ContentSectionKind,
  DocumentBlockCommentAnchor,
  NavigationArea,
  WorkspaceDocument,
  WorkspaceGraph,
} from "../types";
import { useDocumentComments } from "./useDocumentComments";
import { useDocumentEditingLocks } from "./useDocumentEditingLocks";

const defaultArea: NavigationArea = "documents";

interface HarnessDocsBootstrapData {
  desktopShell: DesktopShellMetadata | null;
  appSession: AppSessionSnapshot | null;
  preferences: AppPreferences;
}

type AsyncTaskState<TResult> = {
  status: "idle" | "running" | "succeeded" | "failed";
  error: string | null;
  result: TResult | null;
  entryId?: string | null;
};

function mapSectionKindToBlockKind(kind: ContentSectionKind | undefined): CommentBlockKind {
  switch (kind) {
    case "list":
      return "list_item";
    case "checklist":
      return "checklist_item";
    case "decision":
      return "decision";
    default:
      return "paragraph";
  }
}

function buildDefaultBlockCommentAnchor(
  workspaceGraph: WorkspaceGraph,
  document: WorkspaceDocument,
): DocumentBlockCommentAnchor {
  const template = workspaceGraph.templates.find((entry) => entry.id === document.templateId);
  const section = template?.sections[0];
  const excerpt =
    document.markdownSource
      .split("\n")
      .map((line) => line.trim())
      .find((line) => line.length > 0 && !line.startsWith("#")) ?? document.title;

  return {
    documentId: document.id,
    kind: "block",
    blockId: section?.id ?? `${document.slug}_block`,
    blockKind: mapSectionKindToBlockKind(section?.kind),
    headingPath: [section?.title ?? document.title],
    excerpt,
    startOffset: null,
    endOffset: null,
  };
}

function buildSelectedDocumentMap(snapshot: WorkspaceSessionSnapshot) {
  return Object.fromEntries(
    snapshot.workspaceGraphs.map((graph) => [graph.workspace.id, graph.documents[0]?.id ?? ""]),
  );
}

interface HarnessDocsAppRouteState {
  activeWorkspaceId: string | null;
  activeArea: NavigationArea;
  selectedDocumentId: string | null;
}

interface HarnessDocsAppNavigation {
  onAreaChange: (area: NavigationArea) => void;
  onSelectedDocumentChange: (documentId: string) => void;
  onWorkspaceEnter: (workspaceId: string) => void;
  onWorkspaceLeave: () => void;
}

async function loadBootstrapState(
  services: ReturnType<typeof useHarnessDocsServices>,
): Promise<HarnessDocsBootstrapData> {
  const [desktopShell, appSession, preferences] = await Promise.all([
    services.desktopShell.getMetadata(),
    services.appSession.getSnapshot(),
    services.preferences.read(),
  ]);

  return {
    desktopShell,
    appSession,
    preferences,
  };
}

export function useHarnessDocsApp(
  routeState: HarnessDocsAppRouteState,
  navigation: HarnessDocsAppNavigation,
) {
  const services = useHarnessDocsServices();
  const queryClient = useQueryClient();
  const bootstrapQuery = useQuery({
    queryKey: desktopQueryKeys.bootstrap(),
    queryFn: () => loadBootstrapState(services),
  });
  const [preferences, setPreferences] = useState<AppPreferences>(fallbackAppPreferences);
  const [selectedDocumentIds, setSelectedDocumentIds] = useState<Record<string, string>>({});
  const [documentDrafts, setDocumentDrafts] = useState<Record<string, string>>({});
  const lastInteractionTouchMsRef = useRef(0);

  useEffect(() => {
    if (!bootstrapQuery.data) {
      return;
    }

    setPreferences(bootstrapQuery.data.preferences);
  }, [bootstrapQuery.data]);

  useEffect(() => {
    const workspaceSession = bootstrapQuery.data?.appSession?.workspace;

    if (!workspaceSession) {
      setSelectedDocumentIds({});
      return;
    }

    setSelectedDocumentIds(buildSelectedDocumentMap(workspaceSession));
  }, [bootstrapQuery.data?.appSession?.workspace]);

  const writePreferencesMutation = useMutation({
    mutationKey: desktopMutationKeys.preferences.write(),
    mutationFn: async (nextPreferences: AppPreferences) => {
      await services.preferences.write(nextPreferences);
    },
  });

  const authenticationMutation = useMutation({
    mutationKey: desktopMutationKeys.authentication.session(),
    mutationFn: async (
      action:
        | {
            type: "sign-in";
            provider: AuthenticationSessionSnapshot["provider"]["id"];
          }
        | { type: "sign-out" },
    ) => {
      if (action.type === "sign-in") {
        await services.authentication.startSignIn(action.provider);
      } else {
        await services.authentication.signOut();
      }

      const nextBootstrap = await loadBootstrapState(services);
      queryClient.setQueryData(desktopQueryKeys.bootstrap(), nextBootstrap);

      return nextBootstrap;
    },
  });

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

  const isReady = bootstrapQuery.isSuccess;
  const authentication = bootstrapQuery.data?.appSession?.authentication ?? null;
  const session = bootstrapQuery.data?.appSession?.workspace ?? null;
  const workspaces = session?.workspaces ?? [];
  const user = authentication?.user ?? null;
  const { workspaceGraphs, createBlockCommentThread } = useDocumentComments(
    session?.workspaceGraphs ?? [],
  );
  const {
    getDocumentLockForDocument,
    getActiveLockForDocument,
    acquireDocumentEditingLock,
    releaseDocumentEditingLock,
    touchDocumentEditingLock,
  } = useDocumentEditingLocks(workspaceGraphs);

  const activeWorkspace = useMemo(
    () => workspaces.find((workspace) => workspace.id === routeState.activeWorkspaceId) ?? null,
    [routeState.activeWorkspaceId, workspaces],
  );
  const activeWorkspaceGraph = useMemo(
    () =>
      workspaceGraphs.find((graph) => graph.workspace.id === routeState.activeWorkspaceId) ?? null,
    [routeState.activeWorkspaceId, workspaceGraphs],
  );
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
  const activeDocument = useMemo(() => {
    if (!activeWorkspaceGraph) {
      return null;
    }

    const selectedDocumentId =
      routeState.selectedDocumentId ?? selectedDocumentIds[activeWorkspaceGraph.workspace.id];

    return (
      activeWorkspaceGraph.documents.find((document) => document.id === selectedDocumentId) ??
      activeWorkspaceGraph.documents[0] ??
      null
    );
  }, [activeWorkspaceGraph, selectedDocumentIds]);
  const activeDocumentSource = useMemo(() => {
    if (!activeDocument) {
      return "";
    }

    return documentDrafts[activeDocument.id] ?? activeDocument.markdownSource;
  }, [activeDocument, documentDrafts]);
  const activeDocumentLock = useMemo(() => {
    if (!activeDocument) {
      return null;
    }

    return getDocumentLockForDocument(activeDocument.id);
  }, [activeDocument, getDocumentLockForDocument]);
  const aiEntryPoints = useMemo(
    () =>
      activeWorkspaceGraph
        ? buildAITaskEntryPoints({
            workspaceGraph: activeWorkspaceGraph,
            activeDocument,
            preferredProvider: preferences.preferredAIProvider,
            activeMembershipId: activeMembership?.id ?? null,
          })
        : [],
    [activeDocument, activeMembership, activeWorkspaceGraph, preferences.preferredAIProvider],
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

      if (now - lastInteractionTouchMsRef.current < 60_000) {
        return;
      }

      lastInteractionTouchMsRef.current = now;
      touchDocumentEditingLock({
        documentId: activeDocument.id,
        membershipId: activeMembership.id,
      });
    };

    return services.desktopWindow.subscribeToUserActivity(touchActiveLock);
  }, [activeDocument, activeDocumentLock, activeMembership, services, touchDocumentEditingLock]);

  const handleWorkspaceEnter = (workspaceId: string) => {
    navigation.onWorkspaceEnter(workspaceId);
  };

  const handleWorkspaceLeave = () => {
    navigation.onWorkspaceLeave();
  };

  const handleSignIn = async (provider: AuthenticationSessionSnapshot["provider"]["id"]) => {
    await authenticationMutation.mutateAsync({
      type: "sign-in",
      provider,
    });
  };

  const handleSignOut = async () => {
    await authenticationMutation.mutateAsync({
      type: "sign-out",
    });
    navigation.onWorkspaceLeave();
  };

  const handleDocumentSelect = (documentId: string) => {
    if (!activeWorkspaceGraph) {
      return;
    }

    setSelectedDocumentIds((current) => ({
      ...current,
      [activeWorkspaceGraph.workspace.id]: documentId,
    }));
    navigation.onSelectedDocumentChange(documentId);
  };

  const handleDocumentSourceChange = (document: WorkspaceDocument, nextSource: string) => {
    const workspaceGraph = workspaceGraphs.find(
      (graph) => graph.workspace.id === document.workspaceId,
    );
    const currentMembership =
      workspaceGraph?.memberships.find(
        (membership) => membership.userId === user?.id && membership.lifecycle.status === "active",
      ) ?? null;
    const activeLock = getActiveLockForDocument(document.id);

    if (!currentMembership || activeLock?.lockedByMembershipId !== currentMembership.id) {
      return;
    }

    touchDocumentEditingLock({
      documentId: document.id,
      membershipId: currentMembership.id,
    });

    setDocumentDrafts((current) => ({
      ...current,
      [document.id]: nextSource,
    }));
  };

  const handleStartEditing = (document: WorkspaceDocument) => {
    if (!activeMembership) {
      return;
    }

    acquireDocumentEditingLock({
      document,
      membershipId: activeMembership.id,
      area: "editor",
    });
  };

  const handleReleaseEditing = (document: WorkspaceDocument) => {
    if (!activeMembership) {
      return;
    }

    releaseDocumentEditingLock({
      documentId: document.id,
      membershipId: activeMembership.id,
      reason: "manual_release",
    });
  };

  const handleCreateBlockComment = (document: WorkspaceDocument, bodyMarkdown: string) => {
    if (!activeMembership || !activeWorkspaceGraph || bodyMarkdown.trim().length === 0) {
      return;
    }

    createBlockCommentThread({
      workspaceId: document.workspaceId,
      documentId: document.id,
      authorMembershipId: activeMembership.id,
      bodyMarkdown,
      anchor: buildDefaultBlockCommentAnchor(activeWorkspaceGraph, document),
      linkedDocumentIds: document.linkedDocumentIds,
      triggeredReviewDocumentIds: document.linkedDocumentIds,
    });
  };

  const handlePreferredAIProviderChange = (
    preferredAIProvider: AppPreferences["preferredAIProvider"],
  ) => {
    const nextPreferences = {
      ...preferences,
      preferredAIProvider,
    };

    setPreferences(nextPreferences);
    writePreferencesMutation.mutate(nextPreferences);
  };

  const handleAppearanceModeChange = (appearanceMode: AppPreferences["appearanceMode"]) => {
    const nextPreferences = {
      ...preferences,
      appearanceMode,
    };

    setPreferences(nextPreferences);
    writePreferencesMutation.mutate(nextPreferences);
  };

  const handleLaunchAITaskEntryPoint = async (entry: AITaskEntryPoint) => {
    if (entry.documentId && activeWorkspaceGraph) {
      setSelectedDocumentIds((current) => ({
        ...current,
        [activeWorkspaceGraph.workspace.id]: entry.documentId ?? "",
      }));
      navigation.onSelectedDocumentChange(entry.documentId);
    }

    handlePreferredAIProviderChange(entry.provider);
    navigation.onAreaChange("ai");

    if (!activeWorkspaceGraph) {
      return;
    }

    await aiTaskMutation.mutateAsync({
      entry,
      workspaceGraph: activeWorkspaceGraph,
      drafts: documentDrafts,
    });
  };

  const handleExecutePublish = async () => {
    if (!activeWorkspaceGraph) {
      return;
    }

    try {
      await publishMutation.mutateAsync({
        workspaceGraph: activeWorkspaceGraph,
        drafts: documentDrafts,
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
    isReady,
    desktopShell: bootstrapQuery.data?.desktopShell ?? null,
    authentication,
    user,
    workspaces,
    activeWorkspaceId: routeState.activeWorkspaceId,
    activeWorkspace,
    activeWorkspaceGraph,
    activeArea: routeState.activeArea,
    appearanceMode: preferences.appearanceMode,
    preferredAIProvider: preferences.preferredAIProvider,
    aiEntryPoints,
    aiTaskState,
    publishState,
    activeDocument,
    activeMembershipId: activeMembership?.id ?? null,
    activeDocumentSource,
    activeDocumentLock,
    handlePreferredAIProviderChange,
    handleAppearanceModeChange,
    handleSignIn,
    handleSignOut,
    handleWorkspaceEnter,
    handleWorkspaceLeave,
    handleDocumentSelect,
    handleLaunchAITaskEntryPoint,
    handleExecutePublish,
    handleDocumentSourceChange,
    handleStartEditing,
    handleReleaseEditing,
    handleCreateBlockComment,
    handleAreaChange: navigation.onAreaChange,
  };
}
