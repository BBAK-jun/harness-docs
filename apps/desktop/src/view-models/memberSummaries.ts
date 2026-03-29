import type { WorkspaceGraph, WorkspaceMembership, WorkspaceRole } from "../types/contracts";
import type { MembershipId, UserId } from "../types/domain-ui";

export interface MemberSummaryView {
  id: string;
  name: string;
  avatarInitials: string;
  role: WorkspaceRole | "Contributor";
  githubLogin?: string;
}

const fallbackUserDirectory: Record<UserId, Omit<MemberSummaryView, "id">> = {
  usr_mina_cho: {
    name: "Sarah Chen",
    avatarInitials: "SC",
    role: "Lead",
    githubLogin: "sarah-chen",
  },
  usr_lee_park: {
    name: "Marcus Rivera",
    avatarInitials: "MR",
    role: "Editor",
    githubLogin: "marcus-rivera",
  },
  usr_sam_kim: {
    name: "Aisha Patel",
    avatarInitials: "AP",
    role: "Reviewer",
    githubLogin: "aisha-patel",
  },
  usr_james_okafor: {
    name: "James Okafor",
    avatarInitials: "JO",
    role: "Lead",
    githubLogin: "james-okafor",
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
