import type { MembershipId, UserId, WorkspaceGraph, WorkspaceMembership, WorkspaceRole } from "../types";

export interface MemberSummaryView {
  id: string;
  name: string;
  avatarInitials: string;
  role: WorkspaceRole | "Contributor";
  githubLogin?: string;
}

const fallbackUserDirectory: Record<UserId, Omit<MemberSummaryView, "id">> = {
  usr_mina_cho: {
    name: "Mina Cho",
    avatarInitials: "MC",
    role: "Lead",
    githubLogin: "mina-cho",
  },
  usr_lee_park: {
    name: "Lee Park",
    avatarInitials: "LP",
    role: "Editor",
    githubLogin: "lee-park",
  },
  usr_sam_kim: {
    name: "Sam Kim",
    avatarInitials: "SK",
    role: "Reviewer",
    githubLogin: "sam-kim",
  },
};

function membershipToSummary(membership: WorkspaceMembership): MemberSummaryView {
  const fallback = fallbackUserDirectory[membership.userId];

  return {
    id: membership.id,
    name: fallback?.name ?? membership.userId,
    avatarInitials: fallback?.avatarInitials ?? membership.userId.slice(0, 2).toUpperCase(),
    role: fallback?.role ?? membership.role,
    githubLogin: fallback?.githubLogin,
  };
}

export function getMemberSummaryByMembershipId(
  graph: WorkspaceGraph,
  membershipId: MembershipId | null | undefined,
): MemberSummaryView | null {
  if (!membershipId) {
    return null;
  }

  const membership = graph.memberships.find((entry) => entry.id === membershipId);
  return membership ? membershipToSummary(membership) : null;
}

export function listWorkspaceMembers(graph: WorkspaceGraph): MemberSummaryView[] {
  return graph.memberships
    .filter((membership) => membership.lifecycle.status === "active")
    .map(membershipToSummary);
}
