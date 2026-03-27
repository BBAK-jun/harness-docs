import type {
  ApprovalDecisionDto,
  ApprovalMutationEnvelopeDto,
  ApprovalRequestDto,
  DocumentCreateRequestDto,
  DocumentMutationEnvelopeDto,
  DocumentUpdateRequestDto,
  PublishExecutionEnvelopeDto,
  PublishRecordCreateRequestDto,
  PublishRecordExecuteRequestDto,
  PublishRecordMutationEnvelopeDto,
  WorkspaceMutationEnvelopeDto,
  WorkspaceSessionDataSource,
  WorkspaceSummaryDto,
} from "@harness-docs/contracts";
import { mockSession } from "../../../desktop/src/data/mockSession.ts";
import { createPublishRecordWithPreflight } from "../../../desktop/src/lib/publishPreflight.ts";
import type {
  DocumentApproval,
  PublishFlowStage,
  PublishRecord,
  PublishStaleRationaleEntry,
  UnresolvedApprovalSnapshot,
  WorkspaceDocument,
  WorkspaceGraph,
  WorkspaceMembership,
} from "../../../desktop/src/types.ts";

type MutableSessionState = typeof mockSession;

const state: MutableSessionState = structuredClone(mockSession);
const workspaceAreaMap = new Map(
  state.workspaces.map((workspace) => [workspace.id, workspace.areas]),
);

function nowIso() {
  return new Date().toISOString();
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}

function buildId(prefix: string) {
  return `${prefix}_${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}`;
}

function dedupeStrings(values: string[]) {
  return Array.from(new Set(values));
}

function dedupeUnresolvedApprovals(values: UnresolvedApprovalSnapshot[]) {
  return Array.from(new Map(values.map((entry) => [entry.id, entry])).values());
}

function countOpenReviews(documents: WorkspaceDocument[]) {
  return documents.filter((document) => document.lifecycle.review.status === "review_requested")
    .length;
}

function countPendingDrafts(documents: WorkspaceDocument[]) {
  return documents.filter((document) => ["draft", "in_review"].includes(document.lifecycle.status))
    .length;
}

function countStaleDocuments(documents: WorkspaceDocument[]) {
  return documents.filter((document) => document.lifecycle.review.freshness.status === "stale")
    .length;
}

function summarizeWorkspace(graph: WorkspaceGraph, userId: string): WorkspaceSummaryDto {
  const activeMembership =
    graph.memberships.find(
      (membership) => membership.userId === userId && membership.lifecycle.status === "active",
    ) ?? graph.memberships[0];

  return {
    id: graph.workspace.id,
    name: graph.workspace.name,
    repo: `github.com/${graph.workspace.docsRepository.owner}/${graph.workspace.docsRepository.name}`,
    role: activeMembership.role,
    description: graph.workspace.description,
    openReviews: countOpenReviews(graph.documents),
    pendingDrafts: countPendingDrafts(graph.documents),
    staleDocuments: countStaleDocuments(graph.documents),
    areas:
      workspaceAreaMap.get(graph.workspace.id) ??
      state.workspaces[0]?.areas ??
      mockSession.workspaces[0].areas,
  };
}

function refreshWorkspaceSummaries() {
  state.workspaces = state.workspaceGraphs.map((graph) => summarizeWorkspace(graph, state.user.id));
}

function findWorkspaceGraph(workspaceId: string) {
  return state.workspaceGraphs.find((graph) => graph.workspace.id === workspaceId) ?? null;
}

function findWorkspaceSummary(workspaceId: string) {
  return state.workspaces.find((workspace) => workspace.id === workspaceId) ?? null;
}

function findDocument(graph: WorkspaceGraph, documentId: string) {
  return graph.documents.find((document) => document.id === documentId) ?? null;
}

function findApproval(graph: WorkspaceGraph, approvalId: string) {
  return graph.approvals.find((approval) => approval.id === approvalId) ?? null;
}

function findPublishRecord(graph: WorkspaceGraph, publishRecordId: string) {
  return graph.publishRecords.find((record) => record.id === publishRecordId) ?? null;
}

function findTemplate(graph: WorkspaceGraph, templateId: string) {
  return graph.templates.find((template) => template.id === templateId) ?? null;
}

function findMembership(graph: WorkspaceGraph, membershipId: string) {
  return graph.memberships.find((membership) => membership.id === membershipId) ?? null;
}

function buildDocumentMarkdown(
  title: string,
  template: NonNullable<ReturnType<typeof findTemplate>>,
  providedMarkdown?: string,
) {
  if (providedMarkdown && providedMarkdown.trim().length > 0) {
    return providedMarkdown;
  }

  const sections = template.sections
    .map((section) => `## ${section.title}\n\n${section.defaultMarkdown}`)
    .join("\n\n");

  return [`# ${title}`, "", template.description, "", sections].join("\n");
}

function buildBlockingIssues(
  document: WorkspaceDocument,
  unresolved: UnresolvedApprovalSnapshot[],
) {
  return unresolved
    .filter((entry) => entry.status === "missing")
    .map((entry) => ({
      id: `issue-${entry.id}`,
      kind: "approval_missing" as const,
      severity: "blocking" as const,
      label: entry.label,
      summary: entry.summary,
      requiredAction: entry.requiredAction,
      relatedApprovalIds: entry.approvalId ? [entry.approvalId] : [],
      relatedInvalidationIds: [...entry.invalidationIds],
    }));
}

function buildUnresolvedApprovals(
  document: WorkspaceDocument,
  approvals: DocumentApproval[],
): UnresolvedApprovalSnapshot[] {
  const derived = approvals
    .filter((approval) =>
      ["pending", "changes_requested", "invalidated"].includes(approval.lifecycle.state),
    )
    .map((approval) => {
      const invalidationIds = document.lifecycle.review.freshness.invalidations
        .filter((entry) => entry.affectsApprovalIds.includes(approval.id))
        .map((entry) => entry.id);

      return {
        id: `unresolved-${approval.id}`,
        status: approval.lifecycle.state === "pending" ? "pending" : "rejected",
        documentId: document.id,
        label: approval.reviewerLabel,
        authority: approval.authority,
        summary:
          approval.decisionNote ??
          (approval.lifecycle.state === "pending"
            ? `${approval.reviewerLabel} has not responded yet.`
            : `${approval.reviewerLabel} still requires follow-up before the document is fully current.`),
        requiredAction:
          approval.lifecycle.state === "pending"
            ? "Collect the reviewer decision or preserve the open approval in the publish record."
            : "Resolve the approval issue in-app or disclose the unresolved state during publish.",
        approvalId: approval.id,
        membershipId: approval.membershipId ?? null,
        invalidationIds,
      } satisfies UnresolvedApprovalSnapshot;
    });

  const preservedMissing = (document.prePublication.unresolvedApprovals ?? []).filter(
    (entry) => entry.status === "missing" && entry.approvalId == null,
  );

  return dedupeUnresolvedApprovals([...derived, ...preservedMissing]);
}

function syncDocumentDerivedState(
  graph: WorkspaceGraph,
  documentId: string,
  actorMembershipId: string | null,
  timestamp: string,
) {
  const document = findDocument(graph, documentId);

  if (!document) {
    return;
  }

  const documentApprovals = graph.approvals.filter(
    (approval) => approval.documentId === document.id,
  );
  const unresolvedApprovals = buildUnresolvedApprovals(document, documentApprovals);
  const hasInvalidated = documentApprovals.some(
    (approval) => approval.lifecycle.state === "invalidated",
  );
  const hasChangesRequested = documentApprovals.some(
    (approval) => approval.lifecycle.state === "changes_requested",
  );
  const hasPending = documentApprovals.some((approval) => approval.lifecycle.state === "pending");
  const hasRestored = documentApprovals.some((approval) => approval.lifecycle.state === "restored");
  const hasApproved = documentApprovals.some((approval) =>
    ["approved", "restored"].includes(approval.lifecycle.state),
  );
  const requestedApprovals = documentApprovals.filter(
    (approval) => approval.lifecycle.requestedAt != null,
  );
  const respondedApprovals = documentApprovals.filter(
    (approval) => approval.lifecycle.respondedAt != null,
  );
  const latestReviewedApproval =
    [...respondedApprovals].sort((left, right) =>
      (left.lifecycle.respondedAt ?? "").localeCompare(right.lifecycle.respondedAt ?? ""),
    )[respondedApprovals.length - 1] ?? null;

  const reviewStatus =
    documentApprovals.length === 0
      ? "idle"
      : hasInvalidated || hasChangesRequested
        ? "changes_requested"
        : hasPending
          ? "review_requested"
          : hasApproved
            ? "approved"
            : "idle";
  const approvalState =
    documentApprovals.length === 0
      ? "not_requested"
      : hasInvalidated
        ? "invalidated"
        : hasChangesRequested
          ? "changes_requested"
          : hasPending
            ? "pending"
            : hasRestored
              ? "restored"
              : "approved";
  const freshness = {
    ...document.lifecycle.review.freshness,
    evaluatedAt: timestamp,
    evaluatedByMembershipId: actorMembershipId ?? document.ownerMembershipId,
  };

  document.lifecycle.review = {
    ...document.lifecycle.review,
    status: reviewStatus,
    approvalState,
    requestedAt: requestedApprovals[0]?.lifecycle.requestedAt ?? null,
    requestedByMembershipId: requestedApprovals[0]?.requestedByMembershipId ?? null,
    lastReviewedAt: latestReviewedApproval?.lifecycle.respondedAt ?? null,
    lastReviewedByMembershipId: latestReviewedApproval?.decisionByMembershipId ?? null,
    approvedAt:
      reviewStatus === "approved" ? (latestReviewedApproval?.lifecycle.respondedAt ?? null) : null,
    approverIds: documentApprovals.map((approval) => approval.id),
    freshness,
  };
  document.lifecycle.reviewStatus = reviewStatus;
  document.lifecycle.stalenessStatus = freshness.status;
  document.lifecycle.staleRationaleRequired = freshness.rationaleRequired;
  document.lifecycle.staleEvaluatedAt = freshness.evaluatedAt ?? timestamp;
  document.lifecycle.updatedAt = timestamp;

  if (!["published", "archived"].includes(document.lifecycle.status)) {
    document.lifecycle.status =
      reviewStatus === "approved"
        ? "approved"
        : documentApprovals.length > 0
          ? "in_review"
          : document.lifecycle.status;
  }

  document.prePublication = {
    ...document.prePublication,
    readiness: unresolvedApprovals.some((entry) => entry.status === "missing")
      ? "blocked"
      : unresolvedApprovals.length > 0 || freshness.status === "stale"
        ? "attention_required"
        : "ready",
    summary:
      unresolvedApprovals.length > 0
        ? `This document retains ${unresolvedApprovals.length} unresolved approval item${unresolvedApprovals.length === 1 ? "" : "s"} in the app-native review log.`
        : freshness.status === "stale"
          ? "This document is stale and requires rationale before GitHub publication begins."
          : "No unresolved approval or freshness issue is currently attached to this document.",
    evaluatedAt: timestamp,
    evaluatedByMembershipId: actorMembershipId ?? document.ownerMembershipId,
    stalePublishAllowed: true,
    staleRationaleRequired: freshness.status === "stale",
    unresolvedApprovalIds: dedupeStrings(
      unresolvedApprovals
        .map((entry) => entry.approvalId)
        .filter((entry): entry is string => entry != null),
    ),
    unresolvedApprovals,
    invalidationIds: dedupeStrings(freshness.invalidations.map((entry) => entry.id)),
    blockingIssues: buildBlockingIssues(document, unresolvedApprovals),
    github: {
      ...document.prePublication.github,
      repository: graph.workspace.docsRepository,
    },
  };
}

function buildPublishNotificationTargets(graph: WorkspaceGraph) {
  const inAppTargets = graph.memberships
    .filter((membership) => membership.lifecycle.status === "active")
    .map((membership) => ({
      id: buildId("pub_notify"),
      kind: "in_app" as const,
      label: `${membership.role} inbox`,
      membershipId: membership.id,
      destination: null,
      status: "pending" as const,
    }));
  const webhookTargets = graph.memberships
    .filter(
      (membership) =>
        membership.lifecycle.status === "active" && membership.notificationWebhookUrl != null,
    )
    .map((membership) => ({
      id: buildId("pub_notify"),
      kind: "webhook" as const,
      label: `${membership.role} webhook`,
      membershipId: membership.id,
      destination: membership.notificationWebhookUrl ?? null,
      status: "queued" as const,
    }));

  return [...inAppTargets, ...webhookTargets];
}

function buildPublishStages(template: PublishFlowStage[] | undefined) {
  if (template && template.length > 0) {
    return structuredClone(template);
  }

  return [
    {
      id: "scope",
      title: "Confirm scope",
      description: "Choose artifacts for this publish batch.",
      status: "complete",
      primaryAction: "Review scope",
      guidance: ["Keep the publish batch explicit and traceable."],
    },
    {
      id: "freshness",
      title: "Review freshness",
      description: "Check stale documents and invalidations.",
      status: "ready",
      primaryAction: "Inspect freshness",
      guidance: ["Record stale rationale when linked docs invalidate the batch."],
    },
    {
      id: "approvals",
      title: "Capture approval snapshot",
      description: "Freeze unresolved app-native approval state.",
      status: "ready",
      primaryAction: "Review approvals",
      guidance: ["Preserve unresolved approval state before GitHub automation."],
    },
    {
      id: "memo",
      title: "Prepare publish memo",
      description: "Draft the rationale that travels into the PR.",
      status: "pending",
      primaryAction: "Draft memo",
      guidance: ["Carry stale rationale and unresolved approvals into the memo."],
    },
    {
      id: "github",
      title: "Open GitHub PR",
      description: "Create branch, commit, and pull request.",
      status: "pending",
      primaryAction: "Execute publish",
      guidance: ["The app owns the publication snapshot before GitHub handoff."],
    },
  ] satisfies PublishFlowStage[];
}

function refreshPublishRecordPreflight(record: PublishRecord, documents: WorkspaceDocument[]) {
  const { preflight: _preflight, ...publication } = record.publication;

  return createPublishRecordWithPreflight(
    {
      ...record,
      publication,
    },
    documents,
  );
}

function refreshPublishRecords(graph: WorkspaceGraph) {
  graph.publishRecords = graph.publishRecords.map((record) => {
    const artifacts = record.artifacts.map((artifact) => {
      if (artifact.kind !== "document") {
        return artifact;
      }

      const document = findDocument(graph, artifact.targetId);

      if (!document) {
        return artifact;
      }

      return {
        ...artifact,
        label: document.title,
        linkedDocumentIds: [...document.linkedDocumentIds],
        stalenessStatus: document.lifecycle.review.freshness.status,
        unresolvedApprovalIds: [...document.prePublication.unresolvedApprovalIds],
        unresolvedApprovals: [...(document.prePublication.unresolvedApprovals ?? [])],
        invalidationIds: [...document.prePublication.invalidationIds],
      };
    });

    const unresolvedApprovals = dedupeUnresolvedApprovals(
      artifacts.flatMap((artifact) => artifact.unresolvedApprovals ?? []),
    );
    const staleDocumentIds = artifacts
      .filter((artifact) => artifact.kind === "document" && artifact.stalenessStatus === "stale")
      .map((artifact) => artifact.targetId);
    const unresolvedApprovalIds = dedupeStrings(
      unresolvedApprovals
        .map((entry) => entry.approvalId)
        .filter((entry): entry is string => entry != null),
    );
    const invalidationIds = dedupeStrings(
      artifacts.flatMap((artifact) => artifact.invalidationIds),
    );

    return refreshPublishRecordPreflight(
      {
        ...record,
        artifacts,
        staleDocumentIds,
        unresolvedApprovalIds,
        unresolvedApprovals,
        invalidationIds,
      },
      graph.documents,
    );
  });
}

function buildCommittedFiles(record: PublishRecord, graph: WorkspaceGraph) {
  return record.artifacts.flatMap((artifact) => {
    if (artifact.kind === "document") {
      const document = findDocument(graph, artifact.targetId);
      return document ? [`documents/${document.slug}.md`] : [];
    }

    return [`templates/${artifact.targetId}.md`];
  });
}

function touchWorkspace(graph: WorkspaceGraph, timestamp: string) {
  graph.workspace.lifecycle.updatedAt = timestamp;
}

function buildWorkspaceMutationEnvelope(
  graph: WorkspaceGraph,
): WorkspaceMutationEnvelopeDto | null {
  const workspace = findWorkspaceSummary(graph.workspace.id);

  if (!workspace) {
    return null;
  }

  return {
    workspace,
    workspaceGraph: graph,
    lastActiveWorkspaceId: state.lastActiveWorkspaceId,
  };
}

function buildDocumentMutationEnvelope(
  graph: WorkspaceGraph,
  documentId: string,
): DocumentMutationEnvelopeDto | null {
  const document = findDocument(graph, documentId);

  if (!document) {
    return null;
  }

  return {
    document,
    workspaceGraph: graph,
  };
}

function buildApprovalMutationEnvelope(
  graph: WorkspaceGraph,
  approvalId: string,
): ApprovalMutationEnvelopeDto | null {
  const approval = findApproval(graph, approvalId);

  if (!approval) {
    return null;
  }

  return {
    approval,
    workspaceGraph: graph,
  };
}

function buildPublishRecordMutationEnvelope(
  graph: WorkspaceGraph,
  publishRecordId: string,
): PublishRecordMutationEnvelopeDto | null {
  const publishRecord = findPublishRecord(graph, publishRecordId);

  if (!publishRecord) {
    return null;
  }

  return {
    publishRecord,
    workspaceGraph: graph,
  };
}

function buildPublishExecutionEnvelope(
  graph: WorkspaceGraph,
  publishRecordId: string,
  execution: PublishExecutionEnvelopeDto["execution"],
): PublishExecutionEnvelopeDto | null {
  const publishRecord = findPublishRecord(graph, publishRecordId);

  if (!publishRecord) {
    return null;
  }

  return {
    publishRecord,
    execution,
    workspaceGraph: graph,
  };
}

export function createMockWorkspaceSessionSource(): WorkspaceSessionDataSource {
  return {
    async getBootstrapSession() {
      return {
        user: state.user,
        workspaces: state.workspaces,
        workspaceGraphs: state.workspaceGraphs,
        lastActiveWorkspaceId: state.lastActiveWorkspaceId,
      };
    },
    async getWorkspaceGraph(workspaceId) {
      return findWorkspaceGraph(workspaceId);
    },
    async getWorkspaceDocuments(workspaceId) {
      return findWorkspaceGraph(workspaceId)?.documents ?? null;
    },
    async getWorkspaceApprovals(workspaceId) {
      return findWorkspaceGraph(workspaceId)?.approvals ?? null;
    },
    async getWorkspacePublishRecords(workspaceId) {
      return findWorkspaceGraph(workspaceId)?.publishRecords ?? null;
    },
    async updateWorkspace(workspaceId, input) {
      const graph = findWorkspaceGraph(workspaceId);

      if (!graph) {
        return null;
      }

      const timestamp = nowIso();

      if (input.name != null) {
        graph.workspace.name = input.name;
      }

      if (input.description != null) {
        graph.workspace.description = input.description;
      }

      if (input.defaultBranch != null) {
        const defaultBranch = input.defaultBranch;

        graph.workspace.docsRepository.defaultBranch = defaultBranch;
        graph.publishRecords = graph.publishRecords.map((record) => ({
          ...record,
          publication: {
            ...record.publication,
            repository: {
              ...record.publication.repository,
              defaultBranch,
              baseBranch: defaultBranch,
            },
          },
        }));
      }

      if (input.lastActive) {
        state.lastActiveWorkspaceId = workspaceId;
        graph.workspace.lifecycle.lastOpenedAt = timestamp;
      }

      touchWorkspace(graph, timestamp);
      refreshWorkspaceSummaries();

      return buildWorkspaceMutationEnvelope(graph);
    },
    async createDocument(workspaceId, input) {
      const graph = findWorkspaceGraph(workspaceId);

      if (!graph) {
        return null;
      }

      if (
        !findMembership(graph, input.ownerMembershipId) ||
        !findMembership(graph, input.createdByMembershipId)
      ) {
        return null;
      }

      const template = findTemplate(graph, input.templateId);

      if (!template) {
        return null;
      }

      const timestamp = nowIso();
      const slug = slugify(input.title);
      const documentId = buildId("doc");
      const document: WorkspaceDocument = {
        id: documentId,
        workspaceId,
        title: input.title,
        slug: slug.length > 0 ? slug : documentId,
        type: input.type,
        ownerMembershipId: input.ownerMembershipId,
        createdByMembershipId: input.createdByMembershipId,
        templateId: input.templateId,
        aiDraftSuggestionIds: [],
        commentThreadIds: [],
        markdownSource: buildDocumentMarkdown(input.title, template, input.markdownSource),
        mentions: [],
        linkedDocumentIds: [...input.linkedDocumentIds],
        prePublication: {
          readiness: "ready",
          summary:
            "No unresolved approval or freshness issue is currently attached to this document.",
          evaluatedAt: timestamp,
          evaluatedByMembershipId: input.createdByMembershipId,
          publishRecordId: null,
          stalePublishAllowed: true,
          staleRationaleRequired: false,
          unresolvedApprovalIds: [],
          unresolvedApprovals: [],
          invalidationIds: [],
          blockingIssues: [],
          github: {
            status: "eligible",
            summary: "Repository binding is available for GitHub publication.",
            repository: graph.workspace.docsRepository,
            missingCapabilities: [],
          },
        },
        lifecycle: {
          status: "draft",
          createdAt: timestamp,
          updatedAt: timestamp,
          archivedAt: null,
          reviewStatus: "idle",
          reviewRequestedAt: null,
          stalenessStatus: "current",
          staleRationaleRequired: false,
          staleEvaluatedAt: timestamp,
          review: {
            status: "idle",
            approvalState: "not_requested",
            requestedAt: null,
            requestedByMembershipId: null,
            lastReviewedAt: null,
            lastReviewedByMembershipId: null,
            approvedAt: null,
            approverIds: [],
            freshness: {
              status: "current",
              evaluatedAt: timestamp,
              evaluatedByMembershipId: input.createdByMembershipId,
              staleSince: null,
              rationaleRequired: false,
              summary: "No linked invalidation is currently attached to this draft.",
              reasons: [],
              invalidations: [],
            },
          },
          lastPublishedAt: null,
          lastPublishedCommitSha: null,
          activeEditLock: null,
        },
      };

      graph.documents.unshift(document);
      graph.workspace.documentIds = graph.documents.map((entry) => entry.id);
      touchWorkspace(graph, timestamp);
      refreshPublishRecords(graph);
      refreshWorkspaceSummaries();

      return buildDocumentMutationEnvelope(graph, documentId);
    },
    async updateDocument(workspaceId, documentId, input) {
      const graph = findWorkspaceGraph(workspaceId);

      if (!graph) {
        return null;
      }

      const document = findDocument(graph, documentId);

      if (!document) {
        return null;
      }

      const timestamp = nowIso();

      if (input.title != null) {
        document.title = input.title;
        const slug = slugify(input.title);
        document.slug = slug.length > 0 ? slug : document.slug;
      }

      if (input.markdownSource != null) {
        document.markdownSource = input.markdownSource;
      }

      if (input.linkedDocumentIds != null) {
        document.linkedDocumentIds = [...input.linkedDocumentIds];
      }

      document.lifecycle.updatedAt = timestamp;
      syncDocumentDerivedState(graph, documentId, document.ownerMembershipId, timestamp);
      refreshPublishRecords(graph);
      touchWorkspace(graph, timestamp);
      refreshWorkspaceSummaries();

      return buildDocumentMutationEnvelope(graph, documentId);
    },
    async requestApproval(workspaceId, documentId, input) {
      const graph = findWorkspaceGraph(workspaceId);

      if (!graph || !findDocument(graph, documentId)) {
        return null;
      }

      if (input.membershipId && !findMembership(graph, input.membershipId)) {
        return null;
      }

      const timestamp = nowIso();
      const approvalId = buildId("apr");
      const approval: DocumentApproval = {
        id: approvalId,
        workspaceId,
        documentId,
        authority: input.authority,
        source: input.source,
        membershipId: input.membershipId ?? null,
        githubCandidateLogin: input.githubCandidateLogin ?? null,
        reviewerLabel: input.reviewerLabel,
        requestedByMembershipId: input.requestedByMembershipId ?? null,
        decision: null,
        decisionByMembershipId: null,
        restorationByMembershipId: null,
        restoredFromApprovalId: null,
        invalidatedByDocumentId: null,
        decisionNote: input.decisionNote ?? null,
        lifecycle: {
          state: "pending",
          createdAt: timestamp,
          updatedAt: timestamp,
          archivedAt: null,
          requestedAt: timestamp,
          respondedAt: null,
          invalidatedAt: null,
          restoredAt: null,
        },
      };

      graph.approvals.push(approval);
      syncDocumentDerivedState(
        graph,
        documentId,
        input.requestedByMembershipId ?? input.membershipId ?? null,
        timestamp,
      );
      refreshPublishRecords(graph);
      touchWorkspace(graph, timestamp);
      refreshWorkspaceSummaries();

      return buildApprovalMutationEnvelope(graph, approvalId);
    },
    async decideApproval(workspaceId, approvalId, input) {
      const graph = findWorkspaceGraph(workspaceId);

      if (!graph) {
        return null;
      }

      const approval = findApproval(graph, approvalId);

      if (!approval || !findMembership(graph, input.decisionByMembershipId)) {
        return null;
      }

      const timestamp = nowIso();

      approval.decision = input.decision;
      approval.decisionByMembershipId = input.decisionByMembershipId;
      approval.decisionNote = input.decisionNote ?? approval.decisionNote ?? null;
      approval.lifecycle.updatedAt = timestamp;
      approval.lifecycle.respondedAt = timestamp;
      approval.lifecycle.state =
        input.decision === "approved"
          ? "approved"
          : input.decision === "changes_requested"
            ? "changes_requested"
            : "restored";

      if (input.decision === "restored") {
        approval.restorationByMembershipId = input.decisionByMembershipId;
        approval.lifecycle.restoredAt = timestamp;
      }

      syncDocumentDerivedState(graph, approval.documentId, input.decisionByMembershipId, timestamp);
      refreshPublishRecords(graph);
      touchWorkspace(graph, timestamp);
      refreshWorkspaceSummaries();

      return buildApprovalMutationEnvelope(graph, approvalId);
    },
    async createPublishRecord(workspaceId, input) {
      const graph = findWorkspaceGraph(workspaceId);

      if (!graph || !findMembership(graph, input.initiatedByMembershipId)) {
        return null;
      }

      const selectedDocuments = input.artifactDocumentIds
        .map((documentId) => findDocument(graph, documentId))
        .filter((document): document is WorkspaceDocument => document !== null);
      const selectedTemplates = input.artifactTemplateIds
        .map((templateId) => findTemplate(graph, templateId))
        .filter(
          (template): template is NonNullable<ReturnType<typeof findTemplate>> => template !== null,
        );

      if (selectedDocuments.length === 0 && selectedTemplates.length === 0) {
        return null;
      }

      const templateRecord = graph.publishRecords[0] ?? null;
      const timestamp = nowIso();
      const branchSlug = slugify(input.source.label) || "publish-batch";
      const branchName = `publish/${graph.workspace.slug}/${branchSlug}-${timestamp.slice(0, 10).replace(/-/g, "")}`;
      const unresolvedApprovals = dedupeUnresolvedApprovals(
        selectedDocuments.flatMap((document) => document.prePublication.unresolvedApprovals ?? []),
      );
      const unresolvedApprovalIds = dedupeStrings(
        unresolvedApprovals
          .map((entry) => entry.approvalId)
          .filter((entry): entry is string => entry != null),
      );
      const invalidationIds = dedupeStrings(
        selectedDocuments.flatMap((document) => document.prePublication.invalidationIds),
      );
      const staleDocumentIds = selectedDocuments
        .filter((document) => document.lifecycle.review.freshness.status === "stale")
        .map((document) => document.id);
      const staleRationaleEntries: PublishStaleRationaleEntry[] =
        input.staleRationale.trim().length > 0
          ? staleDocumentIds.map((documentId) => {
              const document = findDocument(graph, documentId);
              const invalidationId = document?.prePublication.invalidationIds[0] ?? null;
              const approvalId =
                document?.prePublication.unresolvedApprovals?.[0]?.approvalId ?? null;

              return {
                id: buildId("pub_rationale"),
                label: document ? `${document.title} stale rationale` : "Stale rationale",
                summary: input.staleRationale,
                status: "current",
                recordedAt: timestamp,
                recordedByMembershipId: input.initiatedByMembershipId,
                relatedDocumentId: documentId,
                relatedInvalidationId: invalidationId,
                relatedApprovalId: approvalId,
                supersededAt: null,
                supersededByDocumentId: null,
                supersededReason: null,
              };
            })
          : [];

      const publishRecordId = buildId("pub");
      const publishRecord = refreshPublishRecordPreflight(
        {
          id: publishRecordId,
          workspaceId,
          source: {
            kind: input.source.kind,
            workspaceId,
            documentId: input.source.documentId ?? null,
            templateId: input.source.templateId ?? null,
            label: input.source.label,
            changeSummary: input.source.changeSummary,
          },
          currentStageId:
            unresolvedApprovals.length > 0
              ? "approvals"
              : staleDocumentIds.length > 0
                ? "memo"
                : "github",
          memoSuggestionId: null,
          staleRationale: input.staleRationale,
          staleRationaleEntries,
          stages: buildPublishStages(templateRecord?.stages),
          artifacts: [
            ...selectedDocuments.map((document) => ({
              id: buildId("pub_artifact"),
              kind: "document" as const,
              targetId: document.id,
              label: document.title,
              documentType: document.type,
              changeSummary: input.source.changeSummary,
              linkedDocumentIds: [...document.linkedDocumentIds],
              stalenessStatus: document.lifecycle.review.freshness.status,
              unresolvedApprovalIds: [...document.prePublication.unresolvedApprovalIds],
              unresolvedApprovals: [...(document.prePublication.unresolvedApprovals ?? [])],
              invalidationIds: [...document.prePublication.invalidationIds],
            })),
            ...selectedTemplates.map((template) => ({
              id: buildId("pub_artifact"),
              kind: "template" as const,
              targetId: template.id,
              label: template.name,
              documentType: template.documentType,
              changeSummary: input.source.changeSummary,
              linkedDocumentIds: [],
              stalenessStatus: null,
              unresolvedApprovalIds: [],
              unresolvedApprovals: [],
              invalidationIds: [],
            })),
          ],
          staleDocumentIds,
          unresolvedApprovalIds,
          unresolvedApprovals,
          invalidationIds,
          notificationTargets: buildPublishNotificationTargets(graph),
          publication: {
            initiatedByMembershipId: input.initiatedByMembershipId,
            repository: {
              owner: graph.workspace.docsRepository.owner,
              name: graph.workspace.docsRepository.name,
              defaultBranch: graph.workspace.docsRepository.defaultBranch,
              baseBranch: graph.workspace.docsRepository.defaultBranch,
              branchName,
              installationId: graph.workspace.docsRepository.installationId ?? null,
            },
            commit: {
              sha: null,
              message: `docs: ${input.source.changeSummary}`,
              authoredByMembershipId: input.initiatedByMembershipId,
              authoredAt: null,
            },
            pullRequest: {
              number: null,
              title: `docs: ${input.source.label}`,
              url: null,
              openedByMembershipId: null,
              openedAt: null,
            },
            preflight: {
              status: "ready",
              summary: "",
              staleDocumentIds: [],
              unresolvedApprovalIds: [],
              findings: [],
            },
          },
          lifecycle: {
            status: "draft",
            createdAt: timestamp,
            updatedAt: timestamp,
            archivedAt: null,
            validatedAt: timestamp,
            branchCreatedAt: null,
            commitCreatedAt: null,
            pullRequestCreatedAt: null,
            pullRequestNumber: null,
            publishedAt: null,
          },
        },
        graph.documents,
      );

      publishRecord.lifecycle.status =
        publishRecord.publication.preflight.status === "blocked" ? "draft" : "ready_for_publish";

      for (const document of selectedDocuments) {
        document.prePublication.publishRecordId = publishRecordId;
        document.lifecycle.updatedAt = timestamp;
      }

      graph.publishRecords.unshift(publishRecord);
      refreshPublishRecords(graph);
      touchWorkspace(graph, timestamp);
      refreshWorkspaceSummaries();

      return buildPublishRecordMutationEnvelope(graph, publishRecordId);
    },
    async executePublishRecord(workspaceId, publishRecordId, input) {
      const graph = findWorkspaceGraph(workspaceId);

      if (!graph || !findMembership(graph, input.initiatedByMembershipId)) {
        return null;
      }

      const publishRecord = findPublishRecord(graph, publishRecordId);

      if (!publishRecord) {
        return null;
      }

      const startedAt = nowIso();
      const completedAt = nowIso();
      const pullRequestNumber = Math.floor(Math.random() * 900) + 100;
      const commitSha = `mock-${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}`;

      if (input.staleRationale != null) {
        publishRecord.staleRationale = input.staleRationale;
      }

      publishRecord.currentStageId = "github";
      publishRecord.stages = publishRecord.stages.map((stage) => ({
        ...stage,
        status: "complete",
      }));
      publishRecord.publication = {
        ...publishRecord.publication,
        initiatedByMembershipId: input.initiatedByMembershipId,
        commit: {
          ...publishRecord.publication.commit,
          sha: commitSha,
          message: input.commitMessage ?? publishRecord.publication.commit.message,
          authoredByMembershipId: input.initiatedByMembershipId,
          authoredAt: completedAt,
        },
        pullRequest: {
          ...publishRecord.publication.pullRequest,
          number: pullRequestNumber,
          title: input.pullRequestTitle ?? publishRecord.publication.pullRequest.title,
          url: `https://github.com/${publishRecord.publication.repository.owner}/${publishRecord.publication.repository.name}/pull/${pullRequestNumber}`,
          openedByMembershipId: input.initiatedByMembershipId,
          openedAt: completedAt,
        },
      };
      publishRecord.lifecycle = {
        ...publishRecord.lifecycle,
        status: "published",
        updatedAt: completedAt,
        branchCreatedAt: startedAt,
        commitCreatedAt: completedAt,
        pullRequestCreatedAt: completedAt,
        pullRequestNumber,
        publishedAt: completedAt,
      };

      const refreshedPublishRecord = refreshPublishRecordPreflight(publishRecord, graph.documents);
      const publishRecordIndex = graph.publishRecords.findIndex(
        (record) => record.id === publishRecordId,
      );

      if (publishRecordIndex >= 0) {
        graph.publishRecords[publishRecordIndex] = refreshedPublishRecord;
      }

      touchWorkspace(graph, completedAt);
      refreshWorkspaceSummaries();

      return buildPublishExecutionEnvelope(graph, publishRecordId, {
        repository: `${publishRecord.publication.repository.owner}/${publishRecord.publication.repository.name}`,
        localRepoPath: `/mock/github/${graph.workspace.slug}`,
        branchName: publishRecord.publication.repository.branchName,
        commitSha,
        pullRequestNumber,
        pullRequestUrl: refreshedPublishRecord.publication.pullRequest.url ?? null,
        committedFiles: buildCommittedFiles(refreshedPublishRecord, graph),
        startedAt,
        completedAt,
      });
    },
  };
}
