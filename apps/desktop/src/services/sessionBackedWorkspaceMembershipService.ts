import type {
  WorkspaceMemberProfile,
  WorkspaceMembershipCapabilities,
  WorkspaceMembershipService,
  WorkspaceMembershipSnapshot,
} from "../domain/workspaceMembership";
import type { SessionUser, UserId, WorkspaceGraph, WorkspaceId, WorkspaceMembership } from "../types";

interface SessionBackedWorkspaceMembershipServiceOptions {
  getWorkspaceGraph: (
    workspaceId: WorkspaceId,
  ) => Promise<WorkspaceGraph | null> | WorkspaceGraph | null;
  listWorkspaceGraphsForUser: (userId: UserId) => Promise<WorkspaceGraph[]> | WorkspaceGraph[];
  getCurrentSessionUser?: () => Promise<SessionUser | null> | SessionUser | null;
}

function formatDisplayName(userId: UserId) {
  return userId
    .replace(/^usr_/, "")
    .split("_")
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
}

function formatGitHubLogin(userId: UserId) {
  return userId.replace(/^usr_/, "").replace(/_/g, "-");
}

function getMembershipCapabilities(
  role: WorkspaceMembership["role"],
): WorkspaceMembershipCapabilities {
  switch (role) {
    case "Lead":
      return {
        canEditDocuments: true,
        canManageApprovals: true,
        canPublish: true,
        canAdministerWorkspace: true,
      };
    case "Editor":
      return {
        canEditDocuments: true,
        canManageApprovals: false,
        canPublish: true,
        canAdministerWorkspace: false,
      };
    case "Reviewer":
      return {
        canEditDocuments: false,
        canManageApprovals: true,
        canPublish: false,
        canAdministerWorkspace: false,
      };
  }
}

async function buildWorkspaceMemberProfile(
  membership: WorkspaceMembership,
  currentUserId: UserId,
  currentSessionUser: SessionUser | null,
): Promise<WorkspaceMemberProfile> {
  const isCurrentUser = membership.userId === currentUserId;
  const displayName =
    isCurrentUser && currentSessionUser ? currentSessionUser.name : formatDisplayName(membership.userId);
  const githubLogin =
    isCurrentUser && currentSessionUser
      ? currentSessionUser.githubLogin
      : formatGitHubLogin(membership.userId);

  return {
    membership,
    displayName,
    githubLogin,
    isCurrentUser,
    capabilities: getMembershipCapabilities(membership.role),
  };
}

async function buildWorkspaceMembershipSnapshot(
  graph: WorkspaceGraph,
  userId: UserId,
  currentSessionUser: SessionUser | null,
): Promise<WorkspaceMembershipSnapshot> {
  const activeMembership =
    graph.memberships.find(
      (membership) => membership.userId === userId && membership.lifecycle.status === "active",
    ) ?? null;

  return {
    workspaceId: graph.workspace.id,
    repository: graph.workspace.docsRepository,
    leadMembershipId: graph.workspace.leadMembershipId,
    currentUserMembershipId: activeMembership?.id ?? null,
    roles: ["Lead", "Editor", "Reviewer"],
    members: await Promise.all(
      graph.memberships.map((membership) =>
        buildWorkspaceMemberProfile(membership, userId, currentSessionUser),
      ),
    ),
  };
}

export function createSessionBackedWorkspaceMembershipService({
  getWorkspaceGraph,
  listWorkspaceGraphsForUser,
  getCurrentSessionUser,
}: SessionBackedWorkspaceMembershipServiceOptions): WorkspaceMembershipService {
  return {
    async listForUser(userId) {
      const [graphs, currentSessionUser] = await Promise.all([
        listWorkspaceGraphsForUser(userId),
        getCurrentSessionUser?.() ?? null,
      ]);

      return Promise.all(
        graphs.map((graph) => buildWorkspaceMembershipSnapshot(graph, userId, currentSessionUser)),
      );
    },
    async getWorkspaceMemberships(workspaceId, userId) {
      const [graph, currentSessionUser] = await Promise.all([
        getWorkspaceGraph(workspaceId),
        getCurrentSessionUser?.() ?? null,
      ]);

      if (!graph) {
        throw new Error(`Workspace graph not found for ${workspaceId}.`);
      }

      return buildWorkspaceMembershipSnapshot(graph, userId, currentSessionUser);
    },
  };
}
