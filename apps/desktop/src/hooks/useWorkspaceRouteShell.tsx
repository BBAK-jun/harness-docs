import { createContext, useContext, useMemo, type ReactNode } from "react";
import { useMatches } from "@tanstack/react-router";
import type { NavigationArea } from "../types/contracts";
import type { WorkspaceShellModel, WorkspaceShellRouteState } from "./useWorkspaceShell";

type WorkspaceRouteMatchSnapshot = {
  params: Record<string, string | undefined>;
  routeId: string;
};

const documentRouteIds = new Set([
  "/$workspaceId/documents",
  "/$workspaceId/documents/",
  "/$workspaceId/documents/$documentId",
  "/$workspaceId/documents/$documentId/",
]);

const WorkspaceRouteShellContext = createContext<WorkspaceShellModel | null>(null);

function activeAreaForRoute(routeId: string | undefined): NavigationArea {
  if (!routeId) {
    return "dashboard";
  }

  if (documentRouteIds.has(routeId)) {
    return "documents";
  }

  if (routeId === "/$workspaceId/documents/$documentId/edit") {
    return "editor";
  }

  if (routeId === "/$workspaceId/documents/$documentId/comments") {
    return "comments";
  }

  if (routeId === "/$workspaceId/documents/$documentId/approvals") {
    return "approvals";
  }

  if (routeId === "/$workspaceId/publish") {
    return "publish";
  }

  if (routeId === "/$workspaceId/ai") {
    return "ai";
  }

  return "dashboard";
}

export function WorkspaceRouteShellProvider({
  children,
  shell,
}: {
  children: ReactNode;
  shell: WorkspaceShellModel;
}) {
  return (
    <WorkspaceRouteShellContext.Provider value={shell}>
      {children}
    </WorkspaceRouteShellContext.Provider>
  );
}

export function useWorkspaceRouteShell() {
  const shell = useContext(WorkspaceRouteShellContext);

  if (!shell) {
    throw new Error("Workspace route shell is missing.");
  }

  return shell;
}

export function useWorkspaceRouteState(workspaceId: string): WorkspaceShellRouteState {
  const matches = useMatches({
    select: (entries) =>
      entries.map(
        (entry): WorkspaceRouteMatchSnapshot => ({
          params: entry.params as Record<string, string | undefined>,
          routeId: entry.routeId,
        }),
      ),
    structuralSharing: true,
  });

  return useMemo(() => {
    const leafRouteId = matches[matches.length - 1]?.routeId;
    let selectedDocumentId: string | null = null;

    for (let index = matches.length - 1; index >= 0; index -= 1) {
      const candidate = matches[index]?.params.documentId;

      if (candidate) {
        selectedDocumentId = candidate;
        break;
      }
    }

    return {
      activeArea: activeAreaForRoute(leafRouteId),
      activeWorkspaceId: workspaceId,
      selectedDocumentId,
    };
  }, [matches, workspaceId]);
}
