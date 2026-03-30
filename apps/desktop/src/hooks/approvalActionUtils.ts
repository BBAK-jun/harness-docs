import type {
  DocumentApproval,
  DocumentApprovalAuthority,
  WorkspaceGraph,
} from "../types/contracts";
import type { MembershipId } from "../types/domain-ui";
import { getMemberSummaryByMembershipId } from "../view-models/memberSummaries";

export interface SuggestedApprovalReviewer {
  membershipId: MembershipId;
  reviewerLabel: string;
  authority: DocumentApprovalAuthority;
}

function isActiveMembership(graph: WorkspaceGraph, membershipId: MembershipId | null | undefined) {
  if (!membershipId) {
    return false;
  }

  return graph.memberships.some(
    (membership) => membership.id === membershipId && membership.lifecycle.status === "active",
  );
}

function buildOrderedMembershipIds(
  graph: WorkspaceGraph,
  activeMembershipId: MembershipId | null,
): MembershipId[] {
  const activeMembershipIds = graph.memberships
    .filter((membership) => membership.lifecycle.status === "active")
    .map((membership) => membership.id);
  const reviewerIds = graph.memberships
    .filter(
      (membership) =>
        membership.lifecycle.status === "active" &&
        membership.role === "Reviewer" &&
        membership.id !== activeMembershipId,
    )
    .map((membership) => membership.id);
  const leadId = isActiveMembership(graph, graph.workspace.leadMembershipId)
    ? graph.workspace.leadMembershipId
    : null;
  const otherLeadIds = graph.memberships
    .filter(
      (membership) =>
        membership.lifecycle.status === "active" &&
        membership.role === "Lead" &&
        membership.id !== leadId &&
        membership.id !== activeMembershipId,
    )
    .map((membership) => membership.id);
  const editorIds = graph.memberships
    .filter(
      (membership) =>
        membership.lifecycle.status === "active" &&
        membership.role === "Editor" &&
        membership.id !== activeMembershipId,
    )
    .map((membership) => membership.id);

  return Array.from(
    new Set([
      ...(leadId && leadId !== activeMembershipId ? [leadId] : []),
      ...reviewerIds,
      ...otherLeadIds,
      ...editorIds,
    ]),
  );
}

export function pickSuggestedApprovalReviewer(
  graph: WorkspaceGraph,
  activeMembershipId: MembershipId | null,
): SuggestedApprovalReviewer | null {
  const membershipId = buildOrderedMembershipIds(graph, activeMembershipId)[0] ?? null;

  if (!membershipId) {
    return null;
  }

  const membership = graph.memberships.find((entry) => entry.id === membershipId) ?? null;
  const summary = getMemberSummaryByMembershipId(graph, membershipId);

  if (!membership || !summary) {
    return null;
  }

  return {
    membershipId,
    reviewerLabel: summary.name,
    authority: membership.role === "Lead" ? "lead" : "required_reviewer",
  };
}

export function canCurrentMembershipDecideApproval(
  approval: DocumentApproval,
  activeMembershipId: MembershipId | null,
) {
  return (
    approval.membershipId != null &&
    approval.membershipId === activeMembershipId &&
    ["pending", "changes_requested", "invalidated"].includes(approval.lifecycle.state)
  );
}

export function hasOpenApprovalForMembership(
  approvals: DocumentApproval[],
  membershipId: MembershipId,
) {
  return approvals.some(
    (approval) =>
      approval.membershipId === membershipId &&
      ["pending", "changes_requested", "invalidated"].includes(approval.lifecycle.state),
  );
}
