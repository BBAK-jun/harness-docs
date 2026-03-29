import type { WorkspaceDocument, WorkspaceGraph } from "../types/contracts";
import { getMemberSummaryByMembershipId, type MemberSummaryView } from "./memberSummaries";

export interface DocumentListItemView {
  id: string;
  title: string;
  type: string;
  status: string;
  freshnessStatus: string;
  owner: MemberSummaryView | null;
  updatedAt: string;
  unresolvedApprovalCount: number;
  linkedDocumentCount: number;
  shortSummary: string;
}

export interface ReviewThreadItemView {
  id: string;
  status: string;
  anchorLabel: string;
  excerpt: string;
  participantCount: number;
  linkedDocumentCount: number;
}

export interface ApprovalQueueItemView {
  id: string;
  reviewerLabel: string;
  authority: string;
  state: string;
  source: string;
  requestedAt?: string | null;
}

export interface DocumentDetailHeaderView {
  id: string;
  title: string;
  type: string;
  status: string;
  freshnessStatus: string;
  owner: MemberSummaryView | null;
  updatedAt: string;
  linkedDocumentCount: number;
  reviewThreadCount: number;
  unresolvedApprovalCount: number;
  freshnessSummary: string;
  githubStatus: string;
}

export interface DocumentOverviewView {
  header: DocumentDetailHeaderView;
  linkedDocuments: DocumentListItemView[];
  reviewThreads: ReviewThreadItemView[];
  approvals: ApprovalQueueItemView[];
  markdownPreview: string;
}

export function buildDocumentListItemView(
  document: WorkspaceDocument,
  graph: WorkspaceGraph,
): DocumentListItemView {
  return {
    id: document.id,
    title: document.title,
    type: document.type,
    status: document.lifecycle.status,
    freshnessStatus: document.lifecycle.review.freshness.status,
    owner: getMemberSummaryByMembershipId(graph, document.ownerMembershipId),
    updatedAt: document.lifecycle.updatedAt,
    unresolvedApprovalCount: document.prePublication.unresolvedApprovalIds.length,
    linkedDocumentCount: document.linkedDocumentIds.length,
    shortSummary: document.prePublication.summary,
  };
}

export function buildDocumentOverviewView(
  document: WorkspaceDocument,
  graph: WorkspaceGraph,
): DocumentOverviewView {
  const linkedDocuments = graph.documents
    .filter((entry) => document.linkedDocumentIds.includes(entry.id))
    .map((entry) => buildDocumentListItemView(entry, graph));

  const reviewThreads = graph.commentThreads
    .filter((thread) => thread.documentId === document.id)
    .map((thread) => ({
      id: thread.id,
      status: thread.lifecycle.status,
      anchorLabel: thread.anchor.headingPath.join(" / "),
      excerpt: thread.anchor.excerpt,
      participantCount: thread.participantMembershipIds.length,
      linkedDocumentCount: thread.linkedDocumentIds.length,
    }));

  const approvals = graph.approvals
    .filter((approval) => approval.documentId === document.id)
    .map((approval) => ({
      id: approval.id,
      reviewerLabel: approval.reviewerLabel,
      authority: approval.authority,
      state: approval.lifecycle.state,
      source: approval.source,
      requestedAt: approval.lifecycle.requestedAt,
    }));

  return {
    header: {
      id: document.id,
      title: document.title,
      type: document.type,
      status: document.lifecycle.status,
      freshnessStatus: document.lifecycle.review.freshness.status,
      owner: getMemberSummaryByMembershipId(graph, document.ownerMembershipId),
      updatedAt: document.lifecycle.updatedAt,
      linkedDocumentCount: document.linkedDocumentIds.length,
      reviewThreadCount: reviewThreads.length,
      unresolvedApprovalCount: document.prePublication.unresolvedApprovalIds.length,
      freshnessSummary: document.lifecycle.review.freshness.summary,
      githubStatus: document.prePublication.github.status,
    },
    linkedDocuments,
    reviewThreads,
    approvals,
    markdownPreview: document.markdownSource,
  };
}
