import { useEffect, useMemo } from "react";
import type { NavigationArea } from "../types";
import { useAppBootstrap } from "./useAppBootstrap";
import { useWorkspaceLocalState } from "./useWorkspaceLocalState";

export interface WorkspaceShellRouteState {
  activeWorkspaceId: string | null;
  activeArea: NavigationArea;
  selectedDocumentId: string | null;
}

export interface WorkspaceShellNavigation {
  onAreaChange: (area: NavigationArea) => void;
  onSelectedDocumentChange: (documentId: string) => void;
  onWorkspaceEnter: (workspaceId: string) => void;
  onWorkspaceLeave: () => void;
}

export function useWorkspaceShell(
  routeState: WorkspaceShellRouteState,
  navigation: WorkspaceShellNavigation,
) {
  const bootstrap = useAppBootstrap();
  const { services } = bootstrap;
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

  const activeMembership = useMemo(() => {
    if (!localState.activeWorkspaceGraph || !user) {
      return null;
    }

    return (
      localState.activeWorkspaceGraph.memberships.find(
        (membership) => membership.userId === user.id && membership.lifecycle.status === "active",
      ) ?? null
    );
  }, [localState.activeWorkspaceGraph, user]);

  useEffect(() => {
    const activeDocument = localState.activeDocument;
    const activeDocumentLock = localState.activeDocumentLock;

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
  }, [activeMembership, localState, services]);

  return {
    services,
    isReady: bootstrap.isReady,
    desktopShell: bootstrap.desktopShell,
    authentication,
    session,
    user,
    workspaces,
    activeWorkspaceId: routeState.activeWorkspaceId,
    activeWorkspace,
    activeWorkspaceGraph: localState.activeWorkspaceGraph,
    activeArea: routeState.activeArea,
    appearanceMode: bootstrap.appearanceMode,
    preferredAIProvider: bootstrap.preferredAIProvider,
    activeDocument: localState.activeDocument,
    activeMembershipId: activeMembership?.id ?? null,
    activeDocumentSource: localState.activeDocumentSource,
    activeDocumentLock: localState.activeDocumentLock,
    documentDrafts: localState.documentDrafts,
    handlePreferredAIProviderChange: bootstrap.handlePreferredAIProviderChange,
    handleAppearanceModeChange: bootstrap.handleAppearanceModeChange,
    handleSignIn: bootstrap.handleSignIn,
    handleSignOut: bootstrap.handleSignOut,
    handleWorkspaceEnter: navigation.onWorkspaceEnter,
    handleWorkspaceLeave: navigation.onWorkspaceLeave,
    handleDocumentSelect: localState.handleDocumentSelect,
    handleDocumentSourceChange: localState.handleDocumentSourceChange,
    handleStartEditing: localState.handleStartEditing,
    handleReleaseEditing: localState.handleReleaseEditing,
    handleCreateBlockComment: localState.handleCreateBlockComment,
    handleAreaChange: navigation.onAreaChange,
  };
}

export type WorkspaceShellModel = ReturnType<typeof useWorkspaceShell>;
