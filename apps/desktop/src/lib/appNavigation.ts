import { useNavigate } from "@tanstack/react-router";
import type {
  WorkspaceShellNavigation,
  WorkspaceShellRouteState,
} from "../hooks/useWorkspaceShell";
import type { NavigationArea } from "../types";

function workspaceAreaPath(area: NavigationArea, documentId: string | null) {
  if (area === "documents") {
    return documentId ? "/$workspaceId/documents/$documentId" : "/$workspaceId/documents";
  }

  if (area === "editor") {
    return documentId ? "/$workspaceId/documents/$documentId/edit" : "/$workspaceId/documents";
  }

  if (area === "comments") {
    return documentId ? "/$workspaceId/documents/$documentId/comments" : "/$workspaceId/documents";
  }

  if (area === "approvals") {
    return documentId ? "/$workspaceId/documents/$documentId/approvals" : "/$workspaceId/documents";
  }

  if (area === "publish") {
    return "/$workspaceId/publish";
  }

  return "/$workspaceId/ai";
}

function documentPath(area: NavigationArea) {
  if (area === "editor") {
    return "/$workspaceId/documents/$documentId/edit";
  }

  if (area === "comments") {
    return "/$workspaceId/documents/$documentId/comments";
  }

  if (area === "approvals") {
    return "/$workspaceId/documents/$documentId/approvals";
  }

  return "/$workspaceId/documents/$documentId";
}

export function buildHarnessDocsNavigation(
  navigate: ReturnType<typeof useNavigate>,
  routeState: WorkspaceShellRouteState,
): WorkspaceShellNavigation {
  return {
    onAreaChange: (area: NavigationArea) => {
      if (!routeState.activeWorkspaceId) {
        void navigate({ to: "/workspaces" });
        return;
      }

      const to = workspaceAreaPath(area, routeState.selectedDocumentId);

      if (to.includes("$documentId") && routeState.selectedDocumentId) {
        void navigate({
          to,
          params: {
            workspaceId: routeState.activeWorkspaceId,
            documentId: routeState.selectedDocumentId,
          },
        });
        return;
      }

      void navigate({
        to,
        params: {
          workspaceId: routeState.activeWorkspaceId,
        },
      });
    },
    onSelectedDocumentChange: (documentId: string) => {
      if (!routeState.activeWorkspaceId) {
        return;
      }

      void navigate({
        to: documentPath(routeState.activeArea),
        params: {
          workspaceId: routeState.activeWorkspaceId,
          documentId,
        },
      });
    },
    onWorkspaceEnter: (workspaceId: string) => {
      void navigate({
        to: "/$workspaceId/documents",
        params: {
          workspaceId,
        },
      });
    },
    onWorkspaceLeave: () => {
      void navigate({
        to: "/workspaces",
      });
    },
  };
}
