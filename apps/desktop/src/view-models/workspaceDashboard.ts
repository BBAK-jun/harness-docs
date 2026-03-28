import type { AITaskEntryPoint, WorkspaceGraph, WorkspaceSummary } from "../types";
import { getMemberSummaryByMembershipId, listWorkspaceMembers, type MemberSummaryView } from "./mockAdapters";

export interface DashboardStatCard {
  label: string;
  value: number;
}

export interface RecentDocumentItemView {
  id: string;
  title: string;
  type: string;
  freshnessStatus: string;
  updatedAt: string;
  owner: MemberSummaryView | null;
}

export interface PendingReviewItemView {
  id: string;
  title: string;
  approvalCount: number;
  unresolvedApprovalCount: number;
}

export interface WorkspaceDashboardView {
  workspace: {
    id: string;
    name: string;
    description: string;
    repo: string;
    memberCount: number;
    documentCount: number;
  };
  stats: DashboardStatCard[];
  recentDocuments: RecentDocumentItemView[];
  pendingReviews: PendingReviewItemView[];
  teamMembers: MemberSummaryView[];
  aiTaskCount: number;
}

export function buildWorkspaceDashboardView(
  graph: WorkspaceGraph,
  summary: WorkspaceSummary,
  aiEntryPoints: AITaskEntryPoint[],
): WorkspaceDashboardView {
  const documents = [...graph.documents];
  const teamMembers = listWorkspaceMembers(graph);

  const recentDocuments = documents
    .sort(
      (left, right) =>
        new Date(right.lifecycle.updatedAt).getTime() - new Date(left.lifecycle.updatedAt).getTime(),
    )
    .slice(0, 5)
    .map((document) => ({
      id: document.id,
      title: document.title,
      type: document.type,
      freshnessStatus: document.lifecycle.review.freshness.status,
      updatedAt: document.lifecycle.updatedAt,
      owner: getMemberSummaryByMembershipId(graph, document.ownerMembershipId),
    }));

  const pendingReviews = documents
    .filter((document) => document.lifecycle.review.status === "review_requested")
    .slice(0, 5)
    .map((document) => ({
      id: document.id,
      title: document.title,
      approvalCount: document.lifecycle.review.approverIds.length,
      unresolvedApprovalCount: document.prePublication.unresolvedApprovalIds.length,
    }));

  return {
    workspace: {
      id: graph.workspace.id,
      name: graph.workspace.name,
      description: graph.workspace.description,
      repo: summary.repo,
      memberCount: teamMembers.length,
      documentCount: documents.length,
    },
    stats: [
      { label: "Total Documents", value: documents.length },
      { label: "Drafts", value: documents.filter((document) => document.lifecycle.status === "draft").length },
      { label: "In Review", value: documents.filter((document) => document.lifecycle.review.status === "review_requested").length },
      { label: "Approved", value: documents.filter((document) => document.lifecycle.status === "approved").length },
      { label: "Published", value: documents.filter((document) => document.lifecycle.status === "published").length },
      { label: "Stale", value: documents.filter((document) => document.lifecycle.review.freshness.status === "stale").length },
    ],
    recentDocuments,
    pendingReviews,
    teamMembers,
    aiTaskCount: aiEntryPoints.length,
  };
}
