import { useEffect, useMemo, useRef, useState } from "react";
import type { AITaskExecutionResult } from "../domain/aiTasks";
import type { PublishExecutionResult } from "../domain/publishing";
import { buildAITaskEntryPoints } from "../lib/aiTaskEntryPoints";
import {
  buildAITaskExecutionInput,
  buildPublishExecutionInput
} from "../lib/runtimePayloads";
import { useHarnessDocsServices } from "../services/HarnessDocsServicesProvider";
import type {
  AppSessionSnapshot,
  AppPreferences,
  AuthenticationSessionSnapshot,
  DesktopShellMetadata,
  WorkspaceSessionSnapshot
} from "../services/contracts";
import { fallbackAppPreferences } from "../services/mockHarnessDocsServices";
import type {
  AITaskEntryPoint,
  CommentBlockKind,
  ContentSectionKind,
  DocumentBlockCommentAnchor,
  NavigationArea,
  WorkspaceDocument,
  WorkspaceGraph
} from "../types";
import { useDocumentComments } from "./useDocumentComments";
import { useDocumentEditingLocks } from "./useDocumentEditingLocks";

const defaultArea: NavigationArea = "documents";

interface HarnessDocsBootstrapState {
  desktopShell: DesktopShellMetadata | null;
  appSession: AppSessionSnapshot | null;
  preferences: AppPreferences;
  isReady: boolean;
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
  document: WorkspaceDocument
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
    endOffset: null
  };
}

function buildSelectedDocumentMap(snapshot: WorkspaceSessionSnapshot) {
  return Object.fromEntries(
    snapshot.workspaceGraphs.map((graph) => [graph.workspace.id, graph.documents[0]?.id ?? ""])
  );
}

export function useHarnessDocsApp() {
  const services = useHarnessDocsServices();
  const [bootstrap, setBootstrap] = useState<HarnessDocsBootstrapState>({
    desktopShell: null,
    appSession: null,
    preferences: fallbackAppPreferences,
    isReady: false
  });
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string | null>(null);
  const [activeArea, setActiveArea] = useState<NavigationArea>(defaultArea);
  const [selectedDocumentIds, setSelectedDocumentIds] = useState<Record<string, string>>({});
  const [documentDrafts, setDocumentDrafts] = useState<Record<string, string>>({});
  const [aiTaskState, setAITaskState] = useState<AsyncTaskState<AITaskExecutionResult>>({
    status: "idle",
    error: null,
    result: null,
    entryId: null
  });
  const [publishState, setPublishState] = useState<AsyncTaskState<PublishExecutionResult>>({
    status: "idle",
    error: null,
    result: null
  });
  const lastInteractionTouchMsRef = useRef(0);

  const loadBootstrapState = async (preserveWorkspaceSelection = false) => {
    const [desktopShell, appSession, preferences] = await Promise.all([
      services.desktopShell.getMetadata(),
      services.appSession.getSnapshot(),
      services.preferences.read()
    ]);

    setBootstrap({
      desktopShell,
      appSession,
      preferences,
      isReady: true
    });

    if (appSession.workspace) {
      setSelectedDocumentIds(buildSelectedDocumentMap(appSession.workspace));
      setActiveWorkspaceId((current) =>
        preserveWorkspaceSelection && current ? current : appSession.workspace.lastActiveWorkspaceId
      );
    } else {
      setSelectedDocumentIds({});
      setActiveWorkspaceId(null);
    }
  };

  useEffect(() => {
    let isMounted = true;

    void loadBootstrapState().then(() => {
      if (!isMounted) {
        return;
      }
    });

    return () => {
      isMounted = false;
    };
  }, [services]);

  useEffect(() => {
    if (!bootstrap.isReady) {
      return;
    }

    void services.preferences.write(bootstrap.preferences);
  }, [bootstrap.isReady, bootstrap.preferences, services]);

  const authentication = bootstrap.appSession?.authentication ?? null;
  const session = bootstrap.appSession?.workspace ?? null;
  const workspaces = session?.workspaces ?? [];
  const user = authentication?.user ?? null;
  const { workspaceGraphs, createBlockCommentThread } = useDocumentComments(
    session?.workspaceGraphs ?? []
  );
  const {
    getDocumentLockForDocument,
    getActiveLockForDocument,
    acquireDocumentEditingLock,
    releaseDocumentEditingLock,
    touchDocumentEditingLock
  } = useDocumentEditingLocks(workspaceGraphs);

  const activeWorkspace = useMemo(
    () => workspaces.find((workspace) => workspace.id === activeWorkspaceId) ?? null,
    [activeWorkspaceId, workspaces]
  );
  const activeWorkspaceGraph = useMemo(
    () => workspaceGraphs.find((graph) => graph.workspace.id === activeWorkspaceId) ?? null,
    [activeWorkspaceId, workspaceGraphs]
  );
  const activeMembership = useMemo(() => {
    if (!activeWorkspaceGraph || !user) {
      return null;
    }

    return (
      activeWorkspaceGraph.memberships.find(
        (membership) =>
          membership.userId === user.id && membership.lifecycle.status === "active"
      ) ?? null
    );
  }, [activeWorkspaceGraph, user]);
  const activeDocument = useMemo(() => {
    if (!activeWorkspaceGraph) {
      return null;
    }

    const selectedDocumentId = selectedDocumentIds[activeWorkspaceGraph.workspace.id];

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
            preferredProvider: bootstrap.preferences.preferredAIProvider,
            activeMembershipId: activeMembership?.id ?? null
          })
        : [],
    [activeDocument, activeMembership, activeWorkspaceGraph, bootstrap.preferences.preferredAIProvider]
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
        membershipId: activeMembership.id
      });
    };

    return services.desktopWindow.subscribeToUserActivity(touchActiveLock);
  }, [activeDocument, activeDocumentLock, activeMembership, services, touchDocumentEditingLock]);

  const handleWorkspaceEnter = (workspaceId: string) => {
    setActiveWorkspaceId(workspaceId);
    setActiveArea(defaultArea);
  };

  const handleWorkspaceLeave = () => {
    setActiveWorkspaceId(null);
    setActiveArea(defaultArea);
  };

  const handleSignIn = async (provider: AuthenticationSessionSnapshot["provider"]["id"]) => {
    await services.authentication.startSignIn(provider);
    await loadBootstrapState();
  };

  const handleSignOut = async () => {
    await services.authentication.signOut();
    await loadBootstrapState();
  };

  const handleDocumentSelect = (documentId: string) => {
    if (!activeWorkspaceGraph) {
      return;
    }

    setSelectedDocumentIds((current) => ({
      ...current,
      [activeWorkspaceGraph.workspace.id]: documentId
    }));
  };

  const handleDocumentSourceChange = (document: WorkspaceDocument, nextSource: string) => {
    const workspaceGraph = workspaceGraphs.find(
      (graph) => graph.workspace.id === document.workspaceId
    );
    const currentMembership =
      workspaceGraph?.memberships.find(
        (membership) =>
          membership.userId === user?.id && membership.lifecycle.status === "active"
      ) ?? null;
    const activeLock = getActiveLockForDocument(document.id);

    if (!currentMembership || activeLock?.lockedByMembershipId !== currentMembership.id) {
      return;
    }

    touchDocumentEditingLock({
      documentId: document.id,
      membershipId: currentMembership.id
    });

    setDocumentDrafts((current) => ({
      ...current,
      [document.id]: nextSource
    }));
  };

  const handleStartEditing = (document: WorkspaceDocument) => {
    if (!activeMembership) {
      return;
    }

    acquireDocumentEditingLock({
      document,
      membershipId: activeMembership.id,
      area: "editor"
    });
  };

  const handleReleaseEditing = (document: WorkspaceDocument) => {
    if (!activeMembership) {
      return;
    }

    releaseDocumentEditingLock({
      documentId: document.id,
      membershipId: activeMembership.id,
      reason: "manual_release"
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
      triggeredReviewDocumentIds: document.linkedDocumentIds
    });
  };

  const handlePreferredAIProviderChange = (
    preferredAIProvider: AppPreferences["preferredAIProvider"]
  ) => {
    setBootstrap((current) => ({
      ...current,
      preferences: {
        ...current.preferences,
        preferredAIProvider
      }
    }));
  };

  const handleLaunchAITaskEntryPoint = (entry: AITaskEntryPoint) => {
    if (entry.documentId && activeWorkspaceGraph) {
      setSelectedDocumentIds((current) => ({
        ...current,
        [activeWorkspaceGraph.workspace.id]: entry.documentId ?? ""
      }));
    }

    handlePreferredAIProviderChange(entry.provider);
    setActiveArea("ai");

    if (!activeWorkspaceGraph) {
      return;
    }

    setAITaskState({
      status: "running",
      error: null,
      result: null,
      entryId: entry.id
    });

    void services.aiTasks
      .runEntryPoint(buildAITaskExecutionInput(entry, activeWorkspaceGraph, documentDrafts))
      .then((result) => {
        setAITaskState({
          status: "succeeded",
          error: null,
          result,
          entryId: entry.id
        });
      })
      .catch((error: unknown) => {
        setAITaskState({
          status: "failed",
          error: error instanceof Error ? error.message : "AI task execution failed.",
          result: null,
          entryId: entry.id
        });
      });
  };

  const handleExecutePublish = async () => {
    if (!activeWorkspaceGraph) {
      return;
    }

    const input = buildPublishExecutionInput(
      activeWorkspaceGraph,
      documentDrafts,
      activeMembership?.id ?? null
    );

    if (!input) {
      setPublishState({
        status: "failed",
        error: "No publish record is available for the active workspace.",
        result: null
      });
      return;
    }

    setPublishState({
      status: "running",
      error: null,
      result: null
    });

    try {
      const result = await services.publishing.executePublish(input);

      setPublishState({
        status: "succeeded",
        error: null,
        result
      });
      setActiveArea("publish");
    } catch (error) {
      setPublishState({
        status: "failed",
        error: error instanceof Error ? error.message : "GitHub publish failed.",
        result: null
      });
    }
  };

  return {
    isReady: bootstrap.isReady,
    desktopShell: bootstrap.desktopShell,
    authentication,
    user,
    workspaces,
    activeWorkspaceId,
    activeWorkspace,
    activeWorkspaceGraph,
    activeArea,
    preferredAIProvider: bootstrap.preferences.preferredAIProvider,
    aiEntryPoints,
    aiTaskState,
    publishState,
    activeDocument,
    activeMembershipId: activeMembership?.id ?? null,
    activeDocumentSource,
    activeDocumentLock,
    setActiveArea,
    handlePreferredAIProviderChange,
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
    handleCreateBlockComment
  };
}
