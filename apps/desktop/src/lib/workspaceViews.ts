import type { WorkspaceGraph, WorkspaceMembership, WorkspaceSummary } from "../types";

export interface MemberSummaryView {
  id: string;
  name: string;
  role: string;
  avatarInitials: string;
}

export interface DashboardDocumentView {
  id: string;
  title: string;
  type: string;
  status: string;
  version: string;
  updatedAt: string;
  isStale: boolean;
  author: MemberSummaryView;
  approvalProgress: {
    approved: number;
    required: number;
  };
}

export interface WorkspaceDashboardView {
  workspace: WorkspaceSummary;
  stats: {
    totalDocuments: number;
    drafts: number;
    inReview: number;
    approved: number;
    published: number;
    stale: number;
  };
  recentDocuments: DashboardDocumentView[];
  pendingReviews: DashboardDocumentView[];
  teamMembers: MemberSummaryView[];
}

function titleCaseFromId(raw: string) {
  return raw
    .replace(/^usr_/, "")
    .split("_")
    .filter(Boolean)
    .map((part) => part[0]?.toUpperCase() + part.slice(1))
    .join(" ");
}

function initialsFromName(name: string) {
  return name
    .split(" ")
    .map((part) => part[0] ?? "")
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function toMemberSummary(membership: WorkspaceMembership): MemberSummaryView {
  const name = titleCaseFromId(membership.userId);

  return {
    id: membership.id,
    name,
    role: membership.role,
    avatarInitials: initialsFromName(name),
  };
}

export function buildWorkspaceDashboardView(graph: WorkspaceGraph): WorkspaceDashboardView {
  const teamMembers = graph.memberships.map(toMemberSummary);

  const documents = graph.documents.map((document) => {
    const authorMembership =
      graph.memberships.find((membership) => membership.id === document.ownerMembershipId) ??
      graph.memberships.find((membership) => membership.id === document.createdByMembershipId) ??
      graph.memberships[0];

    const approvalIds = document.lifecycle.review.approverIds;
    const approvedCount = graph.approvals.filter(
      (approval) =>
        approval.documentId === document.id &&
        approval.decision === "approved" &&
        approval.lifecycle.state === "approved",
    ).length;

    return {
      id: document.id,
      title: document.title,
      type: document.type,
      status: document.lifecycle.status,
      version: document.lifecycle.lastPublishedCommitSha ? "Published" : "Draft",
      updatedAt: document.lifecycle.updatedAt,
      isStale: document.lifecycle.review.freshness.status === "stale",
      author: authorMembership ? toMemberSummary(authorMembership) : teamMembers[0],
      approvalProgress: {
        approved: approvedCount,
        required: approvalIds.length,
      },
    } satisfies DashboardDocumentView;
  });

  return {
    workspace: {
      id: graph.workspace.id,
      name: graph.workspace.name,
      repo: `${graph.workspace.docsRepository.owner}/${graph.workspace.docsRepository.name}`,
      role:
        graph.memberships.find((membership) => membership.userId === graph.workspace.createdByUserId)?.role ??
        "Reviewer",
      description: graph.workspace.description,
      openReviews: graph.commentThreads.filter((thread) => thread.lifecycle.status === "open").length,
      pendingDrafts: documents.filter((document) => document.status === "draft").length,
      staleDocuments: documents.filter((document) => document.isStale).length,
      areas: {} as WorkspaceSummary["areas"],
    },
    stats: {
      totalDocuments: documents.length,
      drafts: documents.filter((document) => document.status === "draft").length,
      inReview: documents.filter((document) => document.status === "in_review").length,
      approved: documents.filter((document) => document.status === "approved").length,
      published: documents.filter((document) => document.status === "published").length,
      stale: documents.filter((document) => document.isStale).length,
    },
    recentDocuments: [...documents]
      .sort((left, right) => Date.parse(right.updatedAt) - Date.parse(left.updatedAt))
      .slice(0, 5),
    pendingReviews: documents.filter((document) => document.status === "in_review").slice(0, 5),
    teamMembers,
  };
}
