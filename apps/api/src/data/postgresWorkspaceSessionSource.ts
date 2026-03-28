import {
  approvalEvents,
  createDatabase,
  type HarnessDocsDatabase,
  aiDrafts,
  approvalRequests,
  documentInvalidations,
  documentLinks,
  documentLocks,
  documents,
  documentVersions,
  publishNotifications,
  publishRecordArtifacts,
  publishRecords,
  templates,
  users,
  workspaceMemberships,
  workspaces,
} from "@harness-docs/db";
import type {
  BootstrapSessionDto,
  SessionUserDto,
  WorkspaceCreateRequestDto,
  WorkspaceInvitationAcceptRequestDto,
  WorkspaceOnboardingEnvelopeDto,
  WorkspaceSessionDataSource,
  WorkspaceSummaryDto,
} from "@harness-docs/contracts";
import { defaultWorkspaceCatalog } from "@harness-docs/contracts";
import { and, desc, eq, inArray } from "drizzle-orm";
import { buildDocumentMarkdown, deriveDocumentState } from "../domain/documentAggregate.ts";
import type {
  PublishDocumentSnapshot,
  PublishPreflightStatus,
  PublishRecordStatus,
  PublishStageId,
} from "../domain/publishAggregate.ts";
import {
  buildPublishPreflightResult,
  buildPublishStages,
  createPublishDraft,
} from "../domain/publishAggregate.ts";
import { buildId, isDefined, nowIso, slugify, toDate } from "../domain/shared.ts";

const fallbackSessionUser: SessionUserDto = {
  id: "usr_demo",
  name: "Demo User",
  handle: "@demo",
  avatarInitials: "DU",
  githubLogin: "demo",
  primaryEmail: "demo@example.com",
};

const workspaceAreaMap = new Map(
  defaultWorkspaceCatalog.map((workspace) => [workspace.id, workspace.areas]),
);

type UserRow = typeof users.$inferSelect;
type WorkspaceRow = typeof workspaces.$inferSelect;
type MembershipRow = typeof workspaceMemberships.$inferSelect;
type TemplateRow = typeof templates.$inferSelect;
type DocumentRow = typeof documents.$inferSelect;
type LinkRow = typeof documentLinks.$inferSelect;
type InvalidationRow = typeof documentInvalidations.$inferSelect;
type ApprovalRow = typeof approvalRequests.$inferSelect;
type LockRow = typeof documentLocks.$inferSelect;
type DraftRow = typeof aiDrafts.$inferSelect;
type PublishRecordRow = typeof publishRecords.$inferSelect;
type PublishArtifactRow = typeof publishRecordArtifacts.$inferSelect;
type PublishNotificationRow = typeof publishNotifications.$inferSelect;

function asIso(value: Date | string | null | undefined) {
  if (value == null) {
    return null;
  }

  return value instanceof Date ? value.toISOString() : value;
}

function castJsonArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function castJsonObject<T extends object>(value: unknown, fallback: T): T {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as T) : fallback;
}

function mapUser(userRow: UserRow | undefined): SessionUserDto {
  if (!userRow) {
    return fallbackSessionUser;
  }

  return {
    id: userRow.id,
    name: userRow.name,
    handle: userRow.handle,
    avatarInitials: userRow.avatarInitials,
    githubLogin: userRow.githubLogin,
    primaryEmail: userRow.primaryEmail,
  };
}

function getWorkspaceAreas(workspaceId: string) {
  return (
    workspaceAreaMap.get(workspaceId) ??
    defaultWorkspaceCatalog[0]?.areas ?? {
      documents: {
        title: "Document Library",
        description: "Browse workspace documents.",
        primaryAction: "Open document queue",
        highlights: [],
      },
      editor: {
        title: "Markdown Editor",
        description: "Edit markdown documents.",
        primaryAction: "Resume latest draft",
        highlights: [],
      },
      comments: {
        title: "Comments and Mentions",
        description: "Review paragraph and block feedback.",
        primaryAction: "Open review threads",
        highlights: [],
      },
      approvals: {
        title: "Approvals",
        description: "Manage app-native approvals.",
        primaryAction: "Review approver matrix",
        highlights: [],
      },
      publish: {
        title: "Publish Flow",
        description: "Prepare GitHub publication.",
        primaryAction: "Prepare publish memo",
        highlights: [],
      },
      ai: {
        title: "AI Harness",
        description: "Launch AI tasks against workspace docs.",
        primaryAction: "Start AI task",
        highlights: [],
      },
    }
  );
}

function groupBy<T extends Record<string, unknown>, K extends keyof T>(items: T[], key: K) {
  const grouped = new Map<string, T[]>();

  for (const item of items) {
    const value = item[key];

    if (typeof value !== "string") {
      continue;
    }

    const bucket = grouped.get(value) ?? [];
    bucket.push(item);
    grouped.set(value, bucket);
  }

  return grouped;
}

function buildWorkspaceSummary(
  graph: any,
  membership: MembershipRow | undefined,
): WorkspaceSummaryDto {
  return {
    id: graph.workspace.id,
    name: graph.workspace.name,
    repo: `github.com/${graph.workspace.docsRepository.owner}/${graph.workspace.docsRepository.name}`,
    role: membership?.role ?? "Lead",
    description: graph.workspace.description,
    openReviews: graph.documents.filter(
      (document: any) => document.lifecycle.review.status === "review_requested",
    ).length,
    pendingDrafts: graph.documents.filter((document: any) =>
      ["draft", "in_review"].includes(document.lifecycle.status),
    ).length,
    staleDocuments: graph.documents.filter(
      (document: any) => document.lifecycle.review.freshness.status === "stale",
    ).length,
    areas: getWorkspaceAreas(graph.workspace.id),
  };
}

export function createPostgresWorkspaceSessionSource(
  db: HarnessDocsDatabase = createDatabase(),
): WorkspaceSessionDataSource {
  async function buildWorkspaceGraph(workspaceId: string) {
    const [workspaceRow] = await db
      .select()
      .from(workspaces)
      .where(eq(workspaces.id, workspaceId))
      .limit(1);

    if (!workspaceRow) {
      return null;
    }

    const [
      membershipRows,
      templateRows,
      documentRows,
      invalidationRows,
      approvalRows,
      lockRows,
      draftRows,
      publishRecordRows,
    ] = await Promise.all([
      db
        .select()
        .from(workspaceMemberships)
        .where(eq(workspaceMemberships.workspaceId, workspaceId)),
      db.select().from(templates).where(eq(templates.workspaceId, workspaceId)),
      db.select().from(documents).where(eq(documents.workspaceId, workspaceId)),
      db
        .select()
        .from(documentInvalidations)
        .where(eq(documentInvalidations.workspaceId, workspaceId)),
      db.select().from(approvalRequests).where(eq(approvalRequests.workspaceId, workspaceId)),
      db.select().from(documentLocks).where(eq(documentLocks.workspaceId, workspaceId)),
      db.select().from(aiDrafts).where(eq(aiDrafts.workspaceId, workspaceId)),
      db
        .select()
        .from(publishRecords)
        .where(eq(publishRecords.workspaceId, workspaceId))
        .orderBy(desc(publishRecords.createdAt)),
    ]);

    const documentIds = documentRows.map((document) => document.id);
    const publishRecordIds = publishRecordRows.map((record) => record.id);

    const [linkRows, publishArtifactRows, publishNotificationRows] = await Promise.all([
      documentIds.length > 0
        ? db
            .select()
            .from(documentLinks)
            .where(inArray(documentLinks.sourceDocumentId, documentIds))
        : Promise.resolve([] as LinkRow[]),
      publishRecordIds.length > 0
        ? db
            .select()
            .from(publishRecordArtifacts)
            .where(inArray(publishRecordArtifacts.publishRecordId, publishRecordIds))
        : Promise.resolve([] as PublishArtifactRow[]),
      publishRecordIds.length > 0
        ? db
            .select()
            .from(publishNotifications)
            .where(inArray(publishNotifications.publishRecordId, publishRecordIds))
        : Promise.resolve([] as PublishNotificationRow[]),
    ]);

    const membershipsById = new Map(
      membershipRows.map((membership) => [membership.id, membership]),
    );
    const templatesById = new Map(templateRows.map((template) => [template.id, template]));
    const linksBySourceDocumentId = groupBy(linkRows, "sourceDocumentId");
    const invalidationsByDocumentId = groupBy(invalidationRows, "documentId");
    const approvalsByDocumentId = groupBy(approvalRows, "documentId");
    const draftsByDocumentId = groupBy(
      draftRows.filter((draft) => draft.documentId != null),
      "documentId",
    );
    const artifactRowsByPublishRecordId = groupBy(publishArtifactRows, "publishRecordId");
    const notificationRowsByPublishRecordId = groupBy(publishNotificationRows, "publishRecordId");
    const artifactPublishRecordByDocumentId = new Map<string, string>();

    for (const artifactRow of publishArtifactRows) {
      if (
        artifactRow.targetDocumentId &&
        !artifactPublishRecordByDocumentId.has(artifactRow.targetDocumentId)
      ) {
        artifactPublishRecordByDocumentId.set(
          artifactRow.targetDocumentId,
          artifactRow.publishRecordId,
        );
      }
    }

    const mappedMemberships = membershipRows.map((membership) => ({
      id: membership.id,
      workspaceId: membership.workspaceId,
      userId: membership.userId,
      role: membership.role,
      invitedByUserId: membership.invitedByUserId,
      notificationWebhookUrl: membership.notificationWebhookUrl,
      lifecycle: {
        status: membership.status,
        createdAt: asIso(membership.createdAt),
        updatedAt: asIso(membership.updatedAt),
        archivedAt: null,
        invitedAt: asIso(membership.invitedAt),
        joinedAt: asIso(membership.joinedAt),
        lastActiveAt: asIso(membership.lastActiveAt),
        removedAt: asIso(membership.removedAt),
      },
    }));

    const mappedTemplates = templateRows.map((template) => ({
      id: template.id,
      workspaceId: template.workspaceId,
      name: template.name,
      description: template.description,
      documentType: template.documentType,
      source: template.source,
      version: template.version,
      createdByMembershipId: template.createdByMembershipId,
      authoringContext: castJsonObject(template.authoringContext, {}),
      sections: castJsonArray(template.sections),
      lifecycle: {
        status: template.status,
        createdAt: asIso(template.createdAt),
        updatedAt: asIso(template.updatedAt),
        archivedAt: null,
        publishedAt: asIso(template.publishedAt),
        lastPublishedCommitSha: template.lastPublishedCommitSha,
      },
    }));

    const mappedApprovals = approvalRows.map((approval) => ({
      id: approval.id,
      workspaceId: approval.workspaceId,
      documentId: approval.documentId,
      authority: approval.authority,
      source: approval.source,
      membershipId: approval.membershipId,
      githubCandidateLogin: approval.githubCandidateLogin,
      reviewerLabel: approval.reviewerLabel,
      requestedByMembershipId: approval.requestedByMembershipId,
      decision: approval.decision,
      decisionByMembershipId: approval.decisionByMembershipId,
      restorationByMembershipId: approval.restorationByMembershipId,
      restoredFromApprovalId: approval.restoredFromApprovalId,
      invalidatedByDocumentId: approval.invalidatedByDocumentId,
      decisionNote: approval.decisionNote,
      lifecycle: {
        state: approval.state,
        createdAt: asIso(approval.createdAt),
        updatedAt: asIso(approval.updatedAt),
        archivedAt: null,
        requestedAt: asIso(approval.requestedAt),
        respondedAt: asIso(approval.respondedAt),
        invalidatedAt: asIso(approval.invalidatedAt),
        restoredAt: asIso(approval.restoredAt),
      },
    }));

    const mappedInvalidations = invalidationRows.map((invalidation) => ({
      id: invalidation.id,
      workspaceId: invalidation.workspaceId,
      documentId: invalidation.documentId,
      sourceDocumentId: invalidation.sourceDocumentId,
      reason: invalidation.reason,
      summary: invalidation.summary,
      detectedAt: asIso(invalidation.detectedAt),
      affectsApprovalIds: castJsonArray<string>(invalidation.affectsApprovalIds),
      requiresReviewRequest: invalidation.requiresReviewRequest,
    }));

    const mappedLocks = lockRows.map((lock) => ({
      id: lock.id,
      workspaceId: lock.workspaceId,
      documentId: lock.documentId,
      lockedByMembershipId: lock.lockedByMembershipId,
      acquiredFromArea: lock.acquiredFromArea,
      inactivityTimeoutMinutes: lock.inactivityTimeoutMinutes,
      acquiredAt: asIso(lock.acquiredAt),
      expiresAt: asIso(lock.expiresAt),
      lastActivityAt: asIso(lock.lastActivityAt),
      releasedByMembershipId: lock.releasedByMembershipId,
      releaseReason: lock.releaseReason,
      lifecycle: {
        status: lock.releasedAt
          ? "released"
          : lock.expiredAt ||
              (lock.expiresAt instanceof Date && lock.expiresAt.getTime() < Date.now())
            ? "expired"
            : "active",
        createdAt: asIso(lock.createdAt),
        updatedAt: asIso(lock.updatedAt),
        archivedAt: null,
        releasedAt: asIso(lock.releasedAt),
        expiredAt: asIso(lock.expiredAt),
      },
    }));

    const activeLockByDocumentId = new Map(
      mappedLocks
        .filter((lock) => lock.lifecycle.status === "active")
        .map((lock) => [lock.documentId, lock]),
    );

    const mappedDrafts = draftRows
      .filter((draft) => draft.documentId && draft.templateId)
      .map((draft) => ({
        id: draft.id,
        workspaceId: draft.workspaceId,
        documentId: draft.documentId,
        templateId: draft.templateId,
        provider: draft.provider,
        kind: draft.kind,
        summary: draft.summary,
        promptLabel: draft.promptLabel,
        authoringContext: castJsonObject(draft.authoringContext, {}),
        sections: castJsonArray(draft.sections),
        suggestedLinkedDocumentIds: castJsonArray<string>(draft.suggestedLinkedDocumentIds),
        lifecycle: {
          status: draft.status,
          createdAt: asIso(draft.createdAt),
          updatedAt: asIso(draft.updatedAt),
          archivedAt: null,
          generatedAt: asIso(draft.generatedAt),
          reviewedAt: asIso(draft.reviewedAt),
          acceptedAt: asIso(draft.acceptedAt),
          rejectedAt: asIso(draft.rejectedAt),
        },
      }));

    const mappedPublishRecords = publishRecordRows.map((record) => {
      const artifactsForRecord = artifactRowsByPublishRecordId.get(record.id) ?? [];
      const unresolvedApprovals = castJsonArray<any>(record.unresolvedApprovalsSnapshot);
      const invalidationIds = castJsonArray<string>(record.invalidationIdsSnapshot);
      const staleRationaleEntries = castJsonArray<any>(record.staleRationaleEntries);
      const artifactApprovalsById = new Map(
        unresolvedApprovals.map((entry) => [
          entry.approvalId ?? `${entry.documentId}:${entry.label}`,
          entry,
        ]),
      );
      const notificationTargets = (notificationRowsByPublishRecordId.get(record.id) ?? []).map(
        (notification) => ({
          id: notification.id,
          kind: notification.kind,
          label: notification.label,
          membershipId: notification.membershipId,
          destination: notification.destination,
          status: notification.status,
        }),
      );
      const artifacts = artifactsForRecord.map((artifact) => {
        const unresolvedApprovalIds = castJsonArray<string>(artifact.unresolvedApprovalIdsSnapshot);
        const unresolvedForArtifact = unresolvedApprovals.filter(
          (entry) =>
            (artifact.targetDocumentId != null && entry.documentId === artifact.targetDocumentId) ||
            (entry.approvalId != null && unresolvedApprovalIds.includes(entry.approvalId)),
        );

        return {
          id: artifact.id,
          kind: artifact.artifactKind,
          targetId: artifact.targetDocumentId ?? artifact.targetTemplateId ?? artifact.id,
          label: artifact.label,
          documentType: artifact.documentType,
          changeSummary: artifact.changeSummary,
          linkedDocumentIds: castJsonArray<string>(artifact.linkedDocumentIdsSnapshot),
          stalenessStatus: artifact.stalenessStatus,
          unresolvedApprovalIds,
          unresolvedApprovals: unresolvedForArtifact.map(
            (entry) =>
              artifactApprovalsById.get(entry.approvalId ?? `${entry.documentId}:${entry.label}`) ??
              entry,
          ),
          invalidationIds: castJsonArray<string>(artifact.invalidationIdsSnapshot),
        };
      });
      const staleDocumentIds = artifacts
        .filter((artifact) => artifact.kind === "document" && artifact.stalenessStatus === "stale")
        .map((artifact) => artifact.targetId);
      const preflight = castJsonObject(record.preflightSnapshot, {
        status: record.preflightStatus,
        summary: record.preflightSummary,
        staleDocumentIds,
        unresolvedApprovalIds: unresolvedApprovals
          .map((entry) => entry.approvalId)
          .filter((entry): entry is string => typeof entry === "string"),
        findings: [],
      });

      return {
        id: record.id,
        workspaceId: record.workspaceId,
        source: {
          kind: record.sourceKind,
          workspaceId: record.workspaceId,
          documentId: record.sourceDocumentId,
          templateId: record.sourceTemplateId,
          label: record.sourceLabel,
          changeSummary: record.changeSummary,
        },
        currentStageId: record.currentStageId,
        memoSuggestionId: record.memoSuggestionId,
        staleRationale: record.staleRationale,
        staleRationaleEntries,
        stages: buildPublishStages(
          record.currentStageId as PublishStageId,
          record.status as PublishRecordStatus,
          record.preflightStatus as PublishPreflightStatus,
        ),
        artifacts,
        staleDocumentIds,
        unresolvedApprovalIds: preflight.unresolvedApprovalIds ?? [],
        unresolvedApprovals,
        invalidationIds,
        notificationTargets,
        publication: {
          initiatedByMembershipId: record.initiatedByMembershipId,
          repository: {
            owner: record.repositoryOwner,
            name: record.repositoryName,
            defaultBranch: record.defaultBranch,
            baseBranch: record.baseBranch,
            branchName: record.branchName,
            installationId: record.githubInstallationId,
          },
          commit: {
            sha: record.commitSha,
            message: record.commitMessage,
            authoredByMembershipId: record.initiatedByMembershipId,
            authoredAt: asIso(record.commitCreatedAt),
          },
          pullRequest: {
            number: record.pullRequestNumber,
            title: record.pullRequestTitle,
            url: record.pullRequestUrl,
            openedByMembershipId: record.initiatedByMembershipId,
            openedAt: asIso(record.pullRequestCreatedAt),
          },
          preflight,
        },
        lifecycle: {
          status: record.status,
          createdAt: asIso(record.createdAt),
          updatedAt: asIso(record.updatedAt),
          archivedAt: null,
          validatedAt: asIso(record.validatedAt),
          branchCreatedAt: asIso(record.branchCreatedAt),
          commitCreatedAt: asIso(record.commitCreatedAt),
          pullRequestCreatedAt: asIso(record.pullRequestCreatedAt),
          pullRequestNumber: record.pullRequestNumber,
          publishedAt: asIso(record.publishedAt),
        },
      };
    });

    const mappedDocuments = documentRows.map((document) => {
      const invalidations = (invalidationsByDocumentId.get(document.id) ?? [])
        .map((row) => mappedInvalidations.find((entry) => entry.id === row.id))
        .filter(isDefined);
      const approvalsForDocument = (approvalsByDocumentId.get(document.id) ?? [])
        .map((row) => mappedApprovals.find((entry) => entry.id === row.id))
        .filter(isDefined);
      const unresolvedApprovals = approvalsForDocument
        .filter((approval) =>
          ["pending", "changes_requested", "invalidated"].includes(approval.lifecycle.state),
        )
        .map((approval) => ({
          id: `unresolved-${approval.id}`,
          status: approval.lifecycle.state === "pending" ? "pending" : "rejected",
          documentId: approval.documentId,
          label: approval.reviewerLabel,
          authority: approval.authority,
          summary:
            approval.decisionNote ??
            (approval.lifecycle.state === "pending"
              ? `${approval.reviewerLabel} has not responded yet.`
              : `${approval.reviewerLabel} still requires follow-up before this document is current.`),
          requiredAction:
            approval.lifecycle.state === "pending"
              ? "Collect the reviewer decision or preserve the unresolved state in the publish record."
              : "Resolve the approval issue in-app or disclose it during publish.",
          approvalId: approval.id,
          membershipId: approval.membershipId,
          invalidationIds: invalidations
            .filter((invalidation) => invalidation.affectsApprovalIds.includes(approval.id))
            .map((invalidation) => invalidation.id),
        }));
      const linkedDocumentIds = (linksBySourceDocumentId.get(document.id) ?? []).map(
        (entry) => entry.targetDocumentId,
      );
      const activePublishRecordId =
        document.activePublishRecordId ??
        artifactPublishRecordByDocumentId.get(document.id) ??
        null;
      const freshnessStatus = document.freshnessStatus;
      const attentionRequired = freshnessStatus === "stale" || unresolvedApprovals.length > 0;
      const requestedByMembershipId =
        approvalsForDocument.find((approval) => approval.requestedByMembershipId != null)
          ?.requestedByMembershipId ?? null;

      return {
        id: document.id,
        workspaceId: document.workspaceId,
        title: document.title,
        slug: document.slug,
        type: document.type,
        ownerMembershipId: document.ownerMembershipId,
        createdByMembershipId: document.createdByMembershipId,
        templateId: document.templateId,
        aiDraftSuggestionIds: (draftsByDocumentId.get(document.id) ?? []).map((draft) => draft.id),
        commentThreadIds: [],
        markdownSource: document.currentMarkdownSource,
        mentions: [],
        linkedDocumentIds,
        prePublication: {
          readiness: attentionRequired ? "attention_required" : "ready",
          summary: attentionRequired
            ? "This document still carries stale or unresolved approval context."
            : "No unresolved approval or freshness issue is currently attached to this document.",
          evaluatedAt: asIso(document.staleEvaluatedAt ?? document.updatedAt),
          evaluatedByMembershipId: document.ownerMembershipId,
          publishRecordId: activePublishRecordId,
          stalePublishAllowed: true,
          staleRationaleRequired: document.staleRationaleRequired,
          unresolvedApprovalIds: unresolvedApprovals
            .map((entry) => entry.approvalId)
            .filter((entry): entry is string => typeof entry === "string"),
          unresolvedApprovals,
          invalidationIds: invalidations.map((invalidation) => invalidation.id),
          blockingIssues: [],
          github: {
            status: attentionRequired ? "eligible_with_warnings" : "eligible",
            summary: attentionRequired
              ? "GitHub publication is possible, but stale or unresolved approval state should travel with the publish record."
              : "Repository binding is intact and no unresolved approval state blocks GitHub publication.",
            repository: {
              owner: workspaceRow.docsRepoOwner,
              name: workspaceRow.docsRepoName,
              defaultBranch: workspaceRow.docsRepoDefaultBranch,
              installationId: workspaceRow.githubInstallationId,
            },
            missingCapabilities: [],
          },
        },
        lifecycle: {
          status: document.status,
          createdAt: asIso(document.createdAt),
          updatedAt: asIso(document.updatedAt),
          archivedAt: null,
          reviewStatus: document.reviewStatus,
          reviewRequestedAt: asIso(document.reviewRequestedAt),
          stalenessStatus: freshnessStatus,
          staleRationaleRequired: document.staleRationaleRequired,
          staleEvaluatedAt: asIso(document.staleEvaluatedAt),
          review: {
            status: document.reviewStatus,
            approvalState: document.approvalState,
            requestedAt: asIso(document.reviewRequestedAt),
            requestedByMembershipId,
            lastReviewedAt: asIso(document.lastReviewedAt),
            lastReviewedByMembershipId: document.lastReviewedByMembershipId,
            approvedAt: asIso(document.approvedAt),
            approverIds: approvalsForDocument.map((approval) => approval.id),
            freshness: {
              status: freshnessStatus,
              evaluatedAt: asIso(document.staleEvaluatedAt),
              evaluatedByMembershipId: document.ownerMembershipId,
              staleSince: freshnessStatus === "stale" ? asIso(document.staleEvaluatedAt) : null,
              rationaleRequired: document.staleRationaleRequired,
              summary:
                document.staleSummary ??
                (freshnessStatus === "stale"
                  ? "Linked document invalidations require a stale publication rationale."
                  : "No linked invalidations are currently attached."),
              reasons: castJsonArray<string>(document.staleReasons),
              invalidations,
            },
          },
          lastPublishedAt: asIso(document.lastPublishedAt),
          lastPublishedCommitSha: document.lastPublishedCommitSha,
          activeEditLock: activeLockByDocumentId.get(document.id) ?? null,
        },
      };
    });

    const leadMembership =
      membershipRows.find((membership) => membership.id === workspaceRow.leadMembershipId) ??
      membershipRows.find((membership) => membership.role === "Lead");

    return {
      workspace: {
        id: workspaceRow.id,
        name: workspaceRow.name,
        slug: workspaceRow.slug,
        description: workspaceRow.description,
        docsRepository: {
          owner: workspaceRow.docsRepoOwner,
          name: workspaceRow.docsRepoName,
          defaultBranch: workspaceRow.docsRepoDefaultBranch,
          installationId: workspaceRow.githubInstallationId,
        },
        createdByUserId: workspaceRow.createdByUserId,
        leadMembershipId: leadMembership?.id ?? workspaceRow.leadMembershipId ?? "",
        membershipIds: mappedMemberships.map((membership) => membership.id),
        documentIds: mappedDocuments.map((document) => document.id),
        templateIds: mappedTemplates.map((template) => template.id),
        lifecycle: {
          status: workspaceRow.status,
          createdAt: asIso(workspaceRow.createdAt),
          updatedAt: asIso(workspaceRow.updatedAt),
          archivedAt: null,
          provisionedAt: asIso(workspaceRow.provisionedAt),
          lastOpenedAt: asIso(workspaceRow.lastOpenedAt),
        },
      },
      memberships: mappedMemberships,
      documents: mappedDocuments,
      approvals: mappedApprovals,
      documentLocks: mappedLocks,
      commentThreads: [],
      comments: [],
      templates: mappedTemplates,
      aiDraftSuggestions: mappedDrafts,
      publishRecords: mappedPublishRecords,
    };
  }

  async function listWorkspaceGraphsForUser(userId: string) {
    const membershipRows = await db
      .select()
      .from(workspaceMemberships)
      .where(
        and(eq(workspaceMemberships.userId, userId), eq(workspaceMemberships.status, "active")),
      );
    const workspaceIds = Array.from(
      new Set(membershipRows.map((membership) => membership.workspaceId)),
    );
    const graphs = (
      await Promise.all(workspaceIds.map((workspaceId) => buildWorkspaceGraph(workspaceId)))
    ).filter(isDefined);
    const membershipByWorkspaceId = new Map(
      membershipRows.map((membership) => [membership.workspaceId, membership]),
    );

    return {
      graphs,
      membershipByWorkspaceId,
    };
  }

  async function getBootstrapSessionSnapshot(viewerUserId?: string) {
    const [userRow] = viewerUserId
      ? await db.select().from(users).where(eq(users.id, viewerUserId)).limit(1)
      : await db.select().from(users).orderBy(users.createdAt).limit(1);

    if (!userRow) {
      return null;
    }

    const sessionUser = mapUser(userRow);
    const { graphs, membershipByWorkspaceId } = await listWorkspaceGraphsForUser(sessionUser.id);
    const workspaceSummaries = graphs.map((graph) =>
      buildWorkspaceSummary(graph, membershipByWorkspaceId.get(graph.workspace.id)),
    );
    const lastActiveWorkspaceId =
      [...graphs].sort((left, right) =>
        (right.workspace.lifecycle.lastOpenedAt ?? "").localeCompare(
          left.workspace.lifecycle.lastOpenedAt ?? "",
        ),
      )[0]?.workspace.id ?? null;

    return {
      user: sessionUser,
      workspaces: workspaceSummaries,
      workspaceGraphs: graphs,
      lastActiveWorkspaceId,
    } satisfies BootstrapSessionDto;
  }

  async function buildWorkspaceMutationEnvelope(workspaceId: string) {
    const [graph, bootstrap] = await Promise.all([
      buildWorkspaceGraph(workspaceId),
      getBootstrapSessionSnapshot(),
    ]);

    if (!graph || !bootstrap) {
      return null;
    }

    const workspace = bootstrap.workspaces.find((entry) => entry.id === workspaceId);

    if (!workspace) {
      return null;
    }

    return {
      workspace,
      workspaceGraph: graph,
      lastActiveWorkspaceId: bootstrap.lastActiveWorkspaceId,
    };
  }

  async function buildWorkspaceOnboardingEnvelope(
    workspaceId: string,
    viewerUserId: string,
  ): Promise<WorkspaceOnboardingEnvelopeDto | null> {
    const [graph, bootstrap] = await Promise.all([
      buildWorkspaceGraph(workspaceId),
      getBootstrapSessionSnapshot(viewerUserId),
    ]);

    if (!graph || !bootstrap) {
      return null;
    }

    const workspace = bootstrap.workspaces.find((entry) => entry.id === workspaceId);

    if (!workspace) {
      return null;
    }

    return {
      workspace,
      bootstrap,
      lastActiveWorkspaceId: bootstrap.lastActiveWorkspaceId,
    };
  }

  async function buildDocumentMutationEnvelope(workspaceId: string, documentId: string) {
    const graph = await buildWorkspaceGraph(workspaceId);

    if (!graph) {
      return null;
    }

    const document = graph.documents.find((entry: any) => entry.id === documentId);

    if (!document) {
      return null;
    }

    return {
      document,
      workspaceGraph: graph,
    };
  }

  async function buildApprovalMutationEnvelope(workspaceId: string, approvalId: string) {
    const graph = await buildWorkspaceGraph(workspaceId);

    if (!graph) {
      return null;
    }

    const approval = graph.approvals.find((entry: any) => entry.id === approvalId);

    if (!approval) {
      return null;
    }

    return {
      approval,
      workspaceGraph: graph,
    };
  }

  async function buildPublishRecordMutationEnvelope(workspaceId: string, publishRecordId: string) {
    const graph = await buildWorkspaceGraph(workspaceId);

    if (!graph) {
      return null;
    }

    const publishRecord = graph.publishRecords.find((entry: any) => entry.id === publishRecordId);

    if (!publishRecord) {
      return null;
    }

    return {
      publishRecord,
      workspaceGraph: graph,
    };
  }

  function buildCommittedFilesFromGraph(publishRecord: any, graph: any) {
    return publishRecord.artifacts.flatMap((artifact: any) => {
      if (artifact.kind === "document") {
        const document = graph.documents.find((entry: any) => entry.id === artifact.targetId);
        return document ? [`documents/${document.slug}.md`] : [];
      }

      return [`templates/${artifact.targetId}.md`];
    });
  }

  async function buildPublishExecutionEnvelope(
    workspaceId: string,
    publishRecordId: string,
    execution: {
      repository: string;
      localRepoPath: string;
      branchName: string;
      commitSha: string | null;
      pullRequestNumber: number | null;
      pullRequestUrl: string | null;
      committedFiles: string[];
      startedAt: string;
      completedAt: string;
    },
  ) {
    const graph = await buildWorkspaceGraph(workspaceId);

    if (!graph) {
      return null;
    }

    const publishRecord = graph.publishRecords.find((entry: any) => entry.id === publishRecordId);

    if (!publishRecord) {
      return null;
    }

    return {
      publishRecord,
      execution,
      workspaceGraph: graph,
    };
  }

  async function allocateDocumentSlug(
    executor: any,
    workspaceId: string,
    title: string,
    excludeDocumentId?: string,
  ) {
    const base = slugify(title) || "document";
    const existingRows = await executor
      .select({ id: documents.id, slug: documents.slug })
      .from(documents)
      .where(eq(documents.workspaceId, workspaceId));
    const taken = new Set(
      existingRows
        .filter((row: { id: string; slug: string }) => row.id !== excludeDocumentId)
        .map((row: { slug: string }) => row.slug),
    );

    if (!taken.has(base)) {
      return base;
    }

    let nextIndex = 2;

    while (taken.has(`${base}-${nextIndex}`)) {
      nextIndex += 1;
    }

    return `${base}-${nextIndex}`;
  }

  async function normalizeLinkedDocumentIds(
    executor: any,
    workspaceId: string,
    linkedDocumentIds: string[] | undefined,
    excludeDocumentId?: string,
  ) {
    if (!linkedDocumentIds || linkedDocumentIds.length === 0) {
      return [];
    }

    const dedupedIds = Array.from(new Set(linkedDocumentIds)).filter(
      (documentId) => documentId !== excludeDocumentId,
    );

    if (dedupedIds.length === 0) {
      return [];
    }

    const rows = await executor
      .select({ id: documents.id })
      .from(documents)
      .where(and(eq(documents.workspaceId, workspaceId), inArray(documents.id, dedupedIds)));
    const rowIds = new Set(rows.map((row: { id: string }) => row.id));

    return dedupedIds.filter((documentId) => rowIds.has(documentId));
  }

  async function appendDocumentVersion(
    executor: any,
    documentId: string,
    changedByMembershipId: string,
    markdownSource: string,
    linkedDocumentIds: string[],
    changeSummary: string,
  ) {
    const latestVersion = await executor
      .select({ versionNumber: documentVersions.versionNumber })
      .from(documentVersions)
      .where(eq(documentVersions.documentId, documentId))
      .orderBy(desc(documentVersions.versionNumber))
      .limit(1);
    const nextVersionNumber = (latestVersion[0]?.versionNumber ?? 0) + 1;

    await executor.insert(documentVersions).values({
      id: buildId("docver"),
      documentId,
      versionNumber: nextVersionNumber,
      markdownSource,
      changedByMembershipId,
      changeSummary,
      linkedDocumentIdsSnapshot: linkedDocumentIds,
      createdAt: new Date(),
    });
  }

  async function syncDocumentProjection(
    executor: any,
    documentId: string,
    actorMembershipId: string | null,
    timestamp: string,
  ) {
    const [documentRow] = await executor
      .select()
      .from(documents)
      .where(eq(documents.id, documentId))
      .limit(1);

    if (!documentRow) {
      return null;
    }

    const approvalRows = await executor
      .select()
      .from(approvalRequests)
      .where(eq(approvalRequests.documentId, documentId));
    const invalidationRows = await executor
      .select()
      .from(documentInvalidations)
      .where(eq(documentInvalidations.documentId, documentId));
    const derivedState = deriveDocumentState({
      documentId,
      currentStatus: documentRow.status,
      ownerMembershipId: documentRow.ownerMembershipId,
      actorMembershipId,
      timestamp,
      approvals: approvalRows.map((approval: ApprovalRow) => ({
        id: approval.id,
        authority: approval.authority,
        membershipId: approval.membershipId ?? null,
        reviewerLabel: approval.reviewerLabel,
        requestedByMembershipId: approval.requestedByMembershipId ?? null,
        decisionByMembershipId: approval.decisionByMembershipId ?? null,
        decisionNote: approval.decisionNote ?? null,
        state: approval.state,
        requestedAt: asIso(approval.requestedAt),
        respondedAt: asIso(approval.respondedAt),
      })),
      invalidations: invalidationRows.map((invalidation: InvalidationRow) => ({
        id: invalidation.id,
        reason: invalidation.reason as
          | "linked_document_updated"
          | "approval_invalidated"
          | "publish_evaluation_pending",
        summary: invalidation.summary,
        detectedAt: asIso(invalidation.detectedAt) ?? timestamp,
        affectsApprovalIds: castJsonArray<string>(invalidation.affectsApprovalIds),
      })),
    });

    await executor
      .update(documents)
      .set({
        status: derivedState.status,
        reviewStatus: derivedState.reviewStatus,
        approvalState: derivedState.approvalState,
        reviewRequestedAt: derivedState.reviewRequestedAt
          ? toDate(derivedState.reviewRequestedAt)
          : null,
        lastReviewedAt: derivedState.lastReviewedAt ? toDate(derivedState.lastReviewedAt) : null,
        lastReviewedByMembershipId: derivedState.lastReviewedByMembershipId,
        approvedAt: derivedState.approvedAt ? toDate(derivedState.approvedAt) : null,
        freshnessStatus: derivedState.freshnessStatus,
        staleRationaleRequired: derivedState.staleRationaleRequired,
        staleEvaluatedAt: toDate(derivedState.staleEvaluatedAt),
        staleSummary: derivedState.staleSummary,
        staleReasons: derivedState.staleReasons,
        updatedAt: toDate(timestamp),
      })
      .where(eq(documents.id, documentId));

    return derivedState;
  }

  async function loadPublishDocumentSnapshots(
    executor: any,
    workspaceId: string,
    documentIds: string[],
  ): Promise<PublishDocumentSnapshot[]> {
    if (documentIds.length === 0) {
      return [];
    }

    const documentRows = await executor
      .select()
      .from(documents)
      .where(and(eq(documents.workspaceId, workspaceId), inArray(documents.id, documentIds)));

    if (documentRows.length === 0) {
      return [];
    }

    const matchedDocumentIds = documentRows.map((document: DocumentRow) => document.id);
    const linkRows = await executor
      .select()
      .from(documentLinks)
      .where(inArray(documentLinks.sourceDocumentId, matchedDocumentIds));
    const invalidationRows = await executor
      .select()
      .from(documentInvalidations)
      .where(inArray(documentInvalidations.documentId, matchedDocumentIds));
    const approvalRows = await executor
      .select()
      .from(approvalRequests)
      .where(inArray(approvalRequests.documentId, matchedDocumentIds));
    const linkRowsByDocumentId = groupBy(linkRows, "sourceDocumentId");
    const invalidationRowsByDocumentId = groupBy(invalidationRows, "documentId");
    const approvalRowsByDocumentId = groupBy(approvalRows, "documentId");

    return documentRows.map((document: DocumentRow) => {
      const derivedState = deriveDocumentState({
        documentId: document.id,
        currentStatus: document.status,
        ownerMembershipId: document.ownerMembershipId,
        actorMembershipId: document.ownerMembershipId,
        timestamp: asIso(document.staleEvaluatedAt ?? document.updatedAt) ?? nowIso(),
        approvals: ((approvalRowsByDocumentId.get(document.id) ?? []) as ApprovalRow[]).map(
          (approval) => ({
            id: approval.id,
            authority: approval.authority,
            membershipId: approval.membershipId ?? null,
            reviewerLabel: approval.reviewerLabel,
            requestedByMembershipId: approval.requestedByMembershipId ?? null,
            decisionByMembershipId: approval.decisionByMembershipId ?? null,
            decisionNote: approval.decisionNote ?? null,
            state: approval.state,
            requestedAt: asIso(approval.requestedAt),
            respondedAt: asIso(approval.respondedAt),
          }),
        ),
        invalidations: (
          (invalidationRowsByDocumentId.get(document.id) ?? []) as InvalidationRow[]
        ).map((invalidation) => ({
          id: invalidation.id,
          reason: invalidation.reason as
            | "linked_document_updated"
            | "approval_invalidated"
            | "publish_evaluation_pending",
          summary: invalidation.summary,
          detectedAt: asIso(invalidation.detectedAt) ?? nowIso(),
          affectsApprovalIds: castJsonArray<string>(invalidation.affectsApprovalIds),
        })),
      });

      return {
        id: document.id,
        title: document.title,
        type: document.type,
        linkedDocumentIds: ((linkRowsByDocumentId.get(document.id) ?? []) as LinkRow[]).map(
          (link) => link.targetDocumentId,
        ),
        freshnessStatus: derivedState.freshnessStatus,
        unresolvedApprovalIds: derivedState.unresolvedApprovalIds,
        unresolvedApprovals: derivedState.unresolvedApprovals,
        invalidationIds: derivedState.invalidationIds,
      };
    });
  }

  async function recalculatePublishRecordPreflight(
    executor: any,
    publishRecordId: string,
    staleRationaleOverride?: string,
  ) {
    const [recordRow] = await executor
      .select()
      .from(publishRecords)
      .where(eq(publishRecords.id, publishRecordId))
      .limit(1);

    if (!recordRow) {
      return null;
    }

    const artifactRows = await executor
      .select()
      .from(publishRecordArtifacts)
      .where(eq(publishRecordArtifacts.publishRecordId, publishRecordId));
    const targetedDocumentIds = artifactRows
      .map((artifact: PublishArtifactRow) => artifact.targetDocumentId)
      .filter(isDefined);
    const documentSnapshots = await loadPublishDocumentSnapshots(
      executor,
      recordRow.workspaceId,
      targetedDocumentIds,
    );
    const staleRationaleEntries = castJsonArray<any>(recordRow.staleRationaleEntries);
    const unresolvedApprovals = documentSnapshots.flatMap(
      (document) => document.unresolvedApprovals,
    );
    const staleDocumentIds = documentSnapshots
      .filter((document) => document.freshnessStatus === "stale")
      .map((document) => document.id);
    const documentLabelById = new Map<string, string>(
      documentSnapshots.map((document) => [document.id, document.title]),
    );
    const preflight = buildPublishPreflightResult({
      staleDocumentIds,
      staleRationale: staleRationaleOverride ?? recordRow.staleRationale,
      staleRationaleEntries,
      unresolvedApprovals,
      documentLabelById,
    });

    return {
      recordRow,
      artifactRows,
      documentSnapshots,
      preflight,
    };
  }

  return {
    async getBootstrapSession(viewerUserId) {
      return getBootstrapSessionSnapshot(viewerUserId);
    },
    async getWorkspaceGraph(workspaceId) {
      return buildWorkspaceGraph(workspaceId);
    },
    async getWorkspaceDocuments(workspaceId) {
      return (await buildWorkspaceGraph(workspaceId))?.documents ?? null;
    },
    async getWorkspaceApprovals(workspaceId) {
      return (await buildWorkspaceGraph(workspaceId))?.approvals ?? null;
    },
    async getWorkspacePublishRecords(workspaceId) {
      return (await buildWorkspaceGraph(workspaceId))?.publishRecords ?? null;
    },
    async updateWorkspace(workspaceId, input) {
      const mutatedWorkspaceId = await db.transaction(async (tx) => {
        const [workspaceRow] = await tx
          .select()
          .from(workspaces)
          .where(eq(workspaces.id, workspaceId))
          .limit(1);

        if (!workspaceRow) {
          return null;
        }

        const timestamp = nowIso();
        const updateValues: Record<string, unknown> = {
          updatedAt: toDate(timestamp),
        };

        if (input.name != null) {
          updateValues.name = input.name;
        }

        if (input.description != null) {
          updateValues.description = input.description;
        }

        if (input.defaultBranch != null) {
          updateValues.docsRepoDefaultBranch = input.defaultBranch;
        }

        if (input.lastActive) {
          updateValues.lastOpenedAt = toDate(timestamp);
        }

        await tx.update(workspaces).set(updateValues).where(eq(workspaces.id, workspaceId));

        if (input.defaultBranch != null) {
          await tx
            .update(publishRecords)
            .set({
              defaultBranch: input.defaultBranch,
              baseBranch: input.defaultBranch,
              updatedAt: toDate(timestamp),
            })
            .where(eq(publishRecords.workspaceId, workspaceId));
        }

        return workspaceId;
      });

      if (!mutatedWorkspaceId) {
        return null;
      }

      return buildWorkspaceMutationEnvelope(mutatedWorkspaceId);
    },
    async createDocument(workspaceId, input) {
      const documentId = await db.transaction(async (tx) => {
        const workspaceRow = await tx
          .select()
          .from(workspaces)
          .where(eq(workspaces.id, workspaceId))
          .limit(1)
          .then((rows: WorkspaceRow[]) => rows[0] ?? null);
        const templateRow = await tx
          .select()
          .from(templates)
          .where(and(eq(templates.id, input.templateId), eq(templates.workspaceId, workspaceId)))
          .limit(1)
          .then((rows: TemplateRow[]) => rows[0] ?? null);
        const ownerMembership = await tx
          .select()
          .from(workspaceMemberships)
          .where(
            and(
              eq(workspaceMemberships.id, input.ownerMembershipId),
              eq(workspaceMemberships.workspaceId, workspaceId),
            ),
          )
          .limit(1)
          .then((rows: MembershipRow[]) => rows[0] ?? null);
        const createdByMembership = await tx
          .select()
          .from(workspaceMemberships)
          .where(
            and(
              eq(workspaceMemberships.id, input.createdByMembershipId),
              eq(workspaceMemberships.workspaceId, workspaceId),
            ),
          )
          .limit(1)
          .then((rows: MembershipRow[]) => rows[0] ?? null);

        if (!workspaceRow || !templateRow || !ownerMembership || !createdByMembership) {
          return null;
        }

        if (templateRow.documentType !== input.type) {
          return null;
        }

        const timestamp = nowIso();
        const nextDocumentId = buildId("doc");
        const slug = await allocateDocumentSlug(tx, workspaceId, input.title);
        const linkedDocumentIds = await normalizeLinkedDocumentIds(
          tx,
          workspaceId,
          input.linkedDocumentIds,
          nextDocumentId,
        );
        const markdownSource = buildDocumentMarkdown(
          input.title,
          {
            description: templateRow.description,
            sections: castJsonArray<{ title: string; defaultMarkdown: string }>(
              templateRow.sections,
            ),
          },
          input.markdownSource,
        );

        await tx.insert(documents).values({
          id: nextDocumentId,
          workspaceId,
          title: input.title,
          slug,
          type: input.type,
          status: "draft",
          reviewStatus: "idle",
          approvalState: "not_requested",
          freshnessStatus: "current",
          staleRationaleRequired: false,
          currentMarkdownSource: markdownSource,
          ownerMembershipId: input.ownerMembershipId,
          createdByMembershipId: input.createdByMembershipId,
          templateId: input.templateId,
          activePublishRecordId: null,
          reviewRequestedAt: null,
          lastReviewedAt: null,
          lastReviewedByMembershipId: null,
          approvedAt: null,
          staleEvaluatedAt: toDate(timestamp),
          staleSummary: "No linked invalidation is currently attached to this draft.",
          staleReasons: [],
          lastPublishedAt: null,
          lastPublishedCommitSha: null,
          createdAt: toDate(timestamp),
          updatedAt: toDate(timestamp),
        });

        if (linkedDocumentIds.length > 0) {
          await tx.insert(documentLinks).values(
            linkedDocumentIds.map((linkedDocumentId) => ({
              sourceDocumentId: nextDocumentId,
              targetDocumentId: linkedDocumentId,
              relationshipKind: "reference",
              createdAt: toDate(timestamp),
            })),
          );
        }

        await appendDocumentVersion(
          tx,
          nextDocumentId,
          input.createdByMembershipId,
          markdownSource,
          linkedDocumentIds,
          "Initial draft created.",
        );
        await syncDocumentProjection(tx, nextDocumentId, input.createdByMembershipId, timestamp);
        await tx
          .update(workspaces)
          .set({ updatedAt: toDate(timestamp) })
          .where(eq(workspaces.id, workspaceId));

        return nextDocumentId;
      });

      if (!documentId) {
        return null;
      }

      return buildDocumentMutationEnvelope(workspaceId, documentId);
    },
    async updateDocument(workspaceId, documentId, input) {
      const mutatedDocumentId = await db.transaction(async (tx) => {
        const [documentRow] = await tx
          .select()
          .from(documents)
          .where(and(eq(documents.id, documentId), eq(documents.workspaceId, workspaceId)))
          .limit(1);

        if (!documentRow) {
          return null;
        }

        if (
          input.title == null &&
          input.markdownSource == null &&
          input.linkedDocumentIds == null
        ) {
          return documentId;
        }

        const timestamp = nowIso();
        const nextTitle = input.title ?? documentRow.title;
        const nextSlug =
          input.title != null
            ? await allocateDocumentSlug(tx, workspaceId, input.title, documentId)
            : documentRow.slug;
        const nextMarkdownSource = input.markdownSource ?? documentRow.currentMarkdownSource;
        const linkedDocumentIds =
          input.linkedDocumentIds != null
            ? await normalizeLinkedDocumentIds(tx, workspaceId, input.linkedDocumentIds, documentId)
            : (
                await tx
                  .select()
                  .from(documentLinks)
                  .where(eq(documentLinks.sourceDocumentId, documentId))
              ).map((row: LinkRow) => row.targetDocumentId);

        await tx
          .update(documents)
          .set({
            title: nextTitle,
            slug: nextSlug,
            currentMarkdownSource: nextMarkdownSource,
            updatedAt: toDate(timestamp),
          })
          .where(eq(documents.id, documentId));

        if (input.linkedDocumentIds != null) {
          await tx.delete(documentLinks).where(eq(documentLinks.sourceDocumentId, documentId));

          if (linkedDocumentIds.length > 0) {
            await tx.insert(documentLinks).values(
              linkedDocumentIds.map((linkedDocumentId) => ({
                sourceDocumentId: documentId,
                targetDocumentId: linkedDocumentId,
                relationshipKind: "reference",
                createdAt: toDate(timestamp),
              })),
            );
          }
        }

        await appendDocumentVersion(
          tx,
          documentId,
          documentRow.ownerMembershipId,
          nextMarkdownSource,
          linkedDocumentIds,
          "Document updated in app.",
        );
        await syncDocumentProjection(tx, documentId, documentRow.ownerMembershipId, timestamp);
        await tx
          .update(workspaces)
          .set({ updatedAt: toDate(timestamp) })
          .where(eq(workspaces.id, workspaceId));

        return documentId;
      });

      if (!mutatedDocumentId) {
        return null;
      }

      return buildDocumentMutationEnvelope(workspaceId, mutatedDocumentId);
    },
    async requestApproval(workspaceId, documentId, input) {
      const approvalId = await db.transaction(async (tx) => {
        const documentRow = await tx
          .select()
          .from(documents)
          .where(and(eq(documents.id, documentId), eq(documents.workspaceId, workspaceId)))
          .limit(1)
          .then((rows: DocumentRow[]) => rows[0] ?? null);
        const membershipRow = input.membershipId
          ? await tx
              .select()
              .from(workspaceMemberships)
              .where(
                and(
                  eq(workspaceMemberships.id, input.membershipId),
                  eq(workspaceMemberships.workspaceId, workspaceId),
                ),
              )
              .limit(1)
              .then((rows: MembershipRow[]) => rows[0] ?? null)
          : null;
        const requesterRow = input.requestedByMembershipId
          ? await tx
              .select()
              .from(workspaceMemberships)
              .where(
                and(
                  eq(workspaceMemberships.id, input.requestedByMembershipId),
                  eq(workspaceMemberships.workspaceId, workspaceId),
                ),
              )
              .limit(1)
              .then((rows: MembershipRow[]) => rows[0] ?? null)
          : null;

        if (!documentRow) {
          return null;
        }

        if (input.membershipId && !membershipRow) {
          return null;
        }

        if (input.requestedByMembershipId && !requesterRow) {
          return null;
        }

        const timestamp = nowIso();
        const nextApprovalId = buildId("apr");

        await tx.insert(approvalRequests).values({
          id: nextApprovalId,
          workspaceId,
          documentId,
          authority: input.authority,
          source: input.source,
          state: "pending",
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
          requestedAt: toDate(timestamp),
          respondedAt: null,
          invalidatedAt: null,
          restoredAt: null,
          createdAt: toDate(timestamp),
          updatedAt: toDate(timestamp),
        });
        await tx.insert(approvalEvents).values({
          id: buildId("aprevt"),
          approvalId: nextApprovalId,
          workspaceId,
          documentId,
          eventType: "requested",
          actorMembershipId: input.requestedByMembershipId ?? input.membershipId ?? null,
          note: input.decisionNote ?? null,
          payload: {
            authority: input.authority,
            source: input.source,
            reviewerLabel: input.reviewerLabel,
          },
          createdAt: toDate(timestamp),
        });
        await syncDocumentProjection(
          tx,
          documentId,
          input.requestedByMembershipId ?? input.membershipId ?? documentRow.ownerMembershipId,
          timestamp,
        );
        await tx
          .update(workspaces)
          .set({ updatedAt: toDate(timestamp) })
          .where(eq(workspaces.id, workspaceId));

        return nextApprovalId;
      });

      if (!approvalId) {
        return null;
      }

      return buildApprovalMutationEnvelope(workspaceId, approvalId);
    },
    async decideApproval(workspaceId, approvalId, input) {
      const mutatedApprovalId = await db.transaction(async (tx) => {
        const approvalRow = await tx
          .select()
          .from(approvalRequests)
          .where(
            and(eq(approvalRequests.id, approvalId), eq(approvalRequests.workspaceId, workspaceId)),
          )
          .limit(1)
          .then((rows: ApprovalRow[]) => rows[0] ?? null);
        const decisionMembership = await tx
          .select()
          .from(workspaceMemberships)
          .where(
            and(
              eq(workspaceMemberships.id, input.decisionByMembershipId),
              eq(workspaceMemberships.workspaceId, workspaceId),
            ),
          )
          .limit(1)
          .then((rows: MembershipRow[]) => rows[0] ?? null);

        if (!approvalRow || !decisionMembership) {
          return null;
        }

        const timestamp = nowIso();
        const nextState =
          input.decision === "approved"
            ? "approved"
            : input.decision === "changes_requested"
              ? "changes_requested"
              : "restored";

        await tx
          .update(approvalRequests)
          .set({
            decision: input.decision,
            decisionByMembershipId: input.decisionByMembershipId,
            decisionNote: input.decisionNote ?? approvalRow.decisionNote ?? null,
            state: nextState,
            respondedAt: toDate(timestamp),
            restorationByMembershipId:
              input.decision === "restored" ? input.decisionByMembershipId : null,
            restoredAt: input.decision === "restored" ? toDate(timestamp) : null,
            updatedAt: toDate(timestamp),
          })
          .where(eq(approvalRequests.id, approvalId));
        await tx.insert(approvalEvents).values({
          id: buildId("aprevt"),
          approvalId,
          workspaceId,
          documentId: approvalRow.documentId,
          eventType: input.decision,
          actorMembershipId: input.decisionByMembershipId,
          note: input.decisionNote ?? null,
          payload: {
            previousState: approvalRow.state,
            nextState,
          },
          createdAt: toDate(timestamp),
        });
        await syncDocumentProjection(
          tx,
          approvalRow.documentId,
          input.decisionByMembershipId,
          timestamp,
        );
        await tx
          .update(workspaces)
          .set({ updatedAt: toDate(timestamp) })
          .where(eq(workspaces.id, workspaceId));

        return approvalId;
      });

      if (!mutatedApprovalId) {
        return null;
      }

      return buildApprovalMutationEnvelope(workspaceId, mutatedApprovalId);
    },
    async createPublishRecord(workspaceId, input) {
      const publishRecordId = await db.transaction(async (tx) => {
        const workspaceRow = await tx
          .select()
          .from(workspaces)
          .where(eq(workspaces.id, workspaceId))
          .limit(1)
          .then((rows: WorkspaceRow[]) => rows[0] ?? null);
        const initiatorMembership = await tx
          .select()
          .from(workspaceMemberships)
          .where(
            and(
              eq(workspaceMemberships.id, input.initiatedByMembershipId),
              eq(workspaceMemberships.workspaceId, workspaceId),
            ),
          )
          .limit(1)
          .then((rows: MembershipRow[]) => rows[0] ?? null);

        if (!workspaceRow || !initiatorMembership) {
          return null;
        }

        const templateRows =
          input.artifactTemplateIds.length > 0
            ? await tx
                .select()
                .from(templates)
                .where(
                  and(
                    eq(templates.workspaceId, workspaceId),
                    inArray(templates.id, input.artifactTemplateIds),
                  ),
                )
            : ([] as TemplateRow[]);
        const membershipRows = await tx
          .select()
          .from(workspaceMemberships)
          .where(eq(workspaceMemberships.workspaceId, workspaceId));
        const documentSnapshots = await loadPublishDocumentSnapshots(
          tx,
          workspaceId,
          input.artifactDocumentIds,
        );

        if (templateRows.length === 0 && documentSnapshots.length === 0) {
          return null;
        }

        const timestamp = nowIso();
        const nextPublishRecordId = buildId("pub");
        const draft = createPublishDraft({
          workspaceId,
          workspaceSlug: workspaceRow.slug,
          source: {
            kind: input.source.kind,
            documentId: input.source.documentId ?? null,
            templateId: input.source.templateId ?? null,
            label: input.source.label,
            changeSummary: input.source.changeSummary,
          },
          initiatedByMembershipId: input.initiatedByMembershipId,
          repository: {
            owner: workspaceRow.docsRepoOwner,
            name: workspaceRow.docsRepoName,
            defaultBranch: workspaceRow.docsRepoDefaultBranch,
            installationId: workspaceRow.githubInstallationId ?? null,
          },
          documents: documentSnapshots,
          templates: templateRows.map((template) => ({
            id: template.id,
            name: template.name,
            documentType: template.documentType,
          })),
          memberships: membershipRows.map((membership) => ({
            id: membership.id,
            role: membership.role,
            status: membership.status,
            notificationWebhookUrl: membership.notificationWebhookUrl ?? null,
          })),
          staleRationale: input.staleRationale,
          timestamp,
        });

        await tx.insert(publishRecords).values({
          id: nextPublishRecordId,
          workspaceId,
          sourceKind: input.source.kind,
          sourceDocumentId: input.source.documentId ?? null,
          sourceTemplateId: input.source.templateId ?? null,
          sourceLabel: input.source.label,
          changeSummary: input.source.changeSummary,
          currentStageId: draft.currentStageId,
          memoSuggestionId: null,
          staleRationale: input.staleRationale,
          status: draft.status,
          initiatedByMembershipId: input.initiatedByMembershipId,
          repositoryOwner: workspaceRow.docsRepoOwner,
          repositoryName: workspaceRow.docsRepoName,
          defaultBranch: workspaceRow.docsRepoDefaultBranch,
          baseBranch: workspaceRow.docsRepoDefaultBranch,
          branchName: draft.branchName,
          githubInstallationId: workspaceRow.githubInstallationId,
          commitSha: null,
          commitMessage: draft.commitMessage,
          pullRequestNumber: null,
          pullRequestTitle: draft.pullRequestTitle,
          pullRequestUrl: null,
          preflightStatus: draft.preflight.status,
          preflightSummary: draft.preflight.summary,
          staleRationaleEntries: draft.staleRationaleEntries,
          unresolvedApprovalsSnapshot: draft.unresolvedApprovals,
          invalidationIdsSnapshot: draft.invalidationIds,
          preflightSnapshot: draft.preflight,
          validatedAt: toDate(timestamp),
          branchCreatedAt: null,
          commitCreatedAt: null,
          pullRequestCreatedAt: null,
          publishedAt: null,
          createdAt: toDate(timestamp),
          updatedAt: toDate(timestamp),
        });

        if (draft.artifacts.length > 0) {
          await tx.insert(publishRecordArtifacts).values(
            draft.artifacts.map((artifact) => ({
              id: artifact.id,
              publishRecordId: nextPublishRecordId,
              artifactKind: artifact.kind,
              targetDocumentId: artifact.kind === "document" ? artifact.targetId : null,
              targetTemplateId: artifact.kind === "template" ? artifact.targetId : null,
              label: artifact.label,
              documentType: artifact.documentType,
              changeSummary: artifact.changeSummary,
              linkedDocumentIdsSnapshot: artifact.linkedDocumentIds,
              stalenessStatus: artifact.stalenessStatus,
              unresolvedApprovalIdsSnapshot: artifact.unresolvedApprovalIds,
              invalidationIdsSnapshot: artifact.invalidationIds,
            })),
          );
        }

        if (draft.notificationTargets.length > 0) {
          await tx.insert(publishNotifications).values(
            draft.notificationTargets.map((target) => ({
              id: target.id,
              publishRecordId: nextPublishRecordId,
              kind: target.kind,
              label: target.label,
              membershipId: target.membershipId,
              destination: target.destination,
              status: target.status,
              deliveredAt: null,
              createdAt: toDate(timestamp),
              updatedAt: toDate(timestamp),
            })),
          );
        }

        if (input.artifactDocumentIds.length > 0) {
          await tx
            .update(documents)
            .set({
              activePublishRecordId: nextPublishRecordId,
              updatedAt: toDate(timestamp),
            })
            .where(
              and(
                eq(documents.workspaceId, workspaceId),
                inArray(documents.id, input.artifactDocumentIds),
              ),
            );
        }

        await tx
          .update(workspaces)
          .set({ updatedAt: toDate(timestamp) })
          .where(eq(workspaces.id, workspaceId));

        return nextPublishRecordId;
      });

      if (!publishRecordId) {
        return null;
      }

      return buildPublishRecordMutationEnvelope(workspaceId, publishRecordId);
    },
    async executePublishRecord(workspaceId, publishRecordId, input) {
      const executionMeta = await db.transaction(async (tx) => {
        const workspaceRow = await tx
          .select()
          .from(workspaces)
          .where(eq(workspaces.id, workspaceId))
          .limit(1)
          .then((rows: WorkspaceRow[]) => rows[0] ?? null);
        const initiatorMembership = await tx
          .select()
          .from(workspaceMemberships)
          .where(
            and(
              eq(workspaceMemberships.id, input.initiatedByMembershipId),
              eq(workspaceMemberships.workspaceId, workspaceId),
            ),
          )
          .limit(1)
          .then((rows: MembershipRow[]) => rows[0] ?? null);

        if (!workspaceRow || !initiatorMembership) {
          return null;
        }

        const startedAt = nowIso();
        const completedAt = nowIso();
        const commitSha = `mock-${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}`;
        const pullRequestNumber = Math.floor(Math.random() * 900) + 100;
        const preflightSnapshot = await recalculatePublishRecordPreflight(
          tx,
          publishRecordId,
          input.staleRationale,
        );

        if (!preflightSnapshot) {
          return null;
        }

        const staleRationaleEntries =
          input.staleRationale != null &&
          input.staleRationale.trim().length > 0 &&
          preflightSnapshot.recordRow.preflightStatus === "blocked" &&
          castJsonArray<any>(preflightSnapshot.recordRow.staleRationaleEntries).length === 0
            ? preflightSnapshot.documentSnapshots
                .filter((document) => document.freshnessStatus === "stale")
                .map((document) => ({
                  id: buildId("pub_rationale"),
                  label: `${document.title} stale rationale`,
                  summary: input.staleRationale ?? "",
                  status: "current",
                  recordedAt: completedAt,
                  recordedByMembershipId: input.initiatedByMembershipId,
                  relatedDocumentId: document.id,
                  relatedInvalidationId: document.invalidationIds[0] ?? null,
                  relatedApprovalId: document.unresolvedApprovals[0]?.approvalId ?? null,
                  supersededAt: null,
                  supersededByDocumentId: null,
                  supersededReason: null,
                }))
            : castJsonArray<any>(preflightSnapshot.recordRow.staleRationaleEntries);

        await tx
          .update(publishRecords)
          .set({
            currentStageId: "github",
            staleRationale: input.staleRationale ?? preflightSnapshot.recordRow.staleRationale,
            staleRationaleEntries,
            status: "published",
            commitSha,
            commitMessage: input.commitMessage ?? preflightSnapshot.recordRow.commitMessage,
            pullRequestNumber,
            pullRequestTitle:
              input.pullRequestTitle ?? preflightSnapshot.recordRow.pullRequestTitle,
            pullRequestUrl: `https://github.com/${preflightSnapshot.recordRow.repositoryOwner}/${preflightSnapshot.recordRow.repositoryName}/pull/${pullRequestNumber}`,
            preflightStatus: preflightSnapshot.preflight.status,
            preflightSummary: preflightSnapshot.preflight.summary,
            unresolvedApprovalsSnapshot: preflightSnapshot.documentSnapshots.flatMap(
              (document) => document.unresolvedApprovals,
            ),
            invalidationIdsSnapshot: preflightSnapshot.documentSnapshots.flatMap(
              (document) => document.invalidationIds,
            ),
            preflightSnapshot: preflightSnapshot.preflight,
            branchCreatedAt: toDate(startedAt),
            commitCreatedAt: toDate(completedAt),
            pullRequestCreatedAt: toDate(completedAt),
            publishedAt: toDate(completedAt),
            updatedAt: toDate(completedAt),
          })
          .where(eq(publishRecords.id, publishRecordId));
        await tx
          .update(publishNotifications)
          .set({
            status: "sent",
            deliveredAt: toDate(completedAt),
            updatedAt: toDate(completedAt),
          })
          .where(eq(publishNotifications.publishRecordId, publishRecordId));

        const targetedDocumentIds = preflightSnapshot.artifactRows
          .map((artifact: PublishArtifactRow) => artifact.targetDocumentId)
          .filter(isDefined);

        if (targetedDocumentIds.length > 0) {
          await tx
            .update(documents)
            .set({
              lastPublishedAt: toDate(completedAt),
              lastPublishedCommitSha: commitSha,
              activePublishRecordId: publishRecordId,
              updatedAt: toDate(completedAt),
            })
            .where(
              and(
                eq(documents.workspaceId, workspaceId),
                inArray(documents.id, targetedDocumentIds),
              ),
            );
        }

        await tx
          .update(workspaces)
          .set({ updatedAt: toDate(completedAt) })
          .where(eq(workspaces.id, workspaceId));

        return {
          repository: `${preflightSnapshot.recordRow.repositoryOwner}/${preflightSnapshot.recordRow.repositoryName}`,
          localRepoPath: `/mock/github/${workspaceRow.slug}`,
          branchName: preflightSnapshot.recordRow.branchName,
          commitSha,
          pullRequestNumber,
          pullRequestUrl: `https://github.com/${preflightSnapshot.recordRow.repositoryOwner}/${preflightSnapshot.recordRow.repositoryName}/pull/${pullRequestNumber}`,
          startedAt,
          completedAt,
        };
      });

      if (!executionMeta) {
        return null;
      }

      const graph = await buildWorkspaceGraph(workspaceId);

      if (!graph) {
        return null;
      }

      const publishRecord = graph.publishRecords.find((entry: any) => entry.id === publishRecordId);

      if (!publishRecord) {
        return null;
      }

      return buildPublishExecutionEnvelope(workspaceId, publishRecordId, {
        ...executionMeta,
        committedFiles: buildCommittedFilesFromGraph(publishRecord, graph),
      });
    },
    async createWorkspace(input: WorkspaceCreateRequestDto) {
      const viewer = await db.select().from(users).orderBy(users.createdAt).limit(1).then((rows) => rows[0] ?? null);

      if (!viewer) {
        return null;
      }

      const timestamp = nowIso();
      const workspaceId = buildId("ws");
      const membershipId = buildId("mbr");
      const slugBase = slugify(input.slug || input.name) || workspaceId;
      let workspaceSlug = slugBase;
      let suffix = 1;

      while (true) {
        const existing = await db
          .select({ id: workspaces.id })
          .from(workspaces)
          .where(eq(workspaces.slug, workspaceSlug))
          .limit(1);

        if (existing.length === 0) {
          break;
        }

        suffix += 1;
        workspaceSlug = `${slugBase}-${suffix}`;
      }

      await db.transaction(async (tx) => {
        await tx.insert(workspaces).values({
          id: workspaceId,
          slug: workspaceSlug,
          name: input.name,
          description: input.description,
          status: "active",
          docsRepoOwner: input.docsRepoOwner ?? viewer.githubLogin,
          docsRepoName: input.docsRepoName ?? `${workspaceSlug}-docs`,
          docsRepoDefaultBranch: input.docsRepoDefaultBranch,
          githubInstallationId: null,
          createdByUserId: viewer.id,
          leadMembershipId: membershipId,
          provisionedAt: toDate(timestamp),
          lastOpenedAt: toDate(timestamp),
          createdAt: toDate(timestamp),
          updatedAt: toDate(timestamp),
        });

        await tx.insert(workspaceMemberships).values({
          id: membershipId,
          workspaceId,
          userId: viewer.id,
          role: "Lead",
          status: "active",
          invitedByUserId: viewer.id,
          notificationWebhookUrl: null,
          invitedAt: toDate(timestamp),
          joinedAt: toDate(timestamp),
          lastActiveAt: toDate(timestamp),
          removedAt: null,
          createdAt: toDate(timestamp),
          updatedAt: toDate(timestamp),
        });

        await tx
          .update(workspaces)
          .set({
            leadMembershipId: membershipId,
            updatedAt: toDate(timestamp),
          })
          .where(eq(workspaces.id, workspaceId));
      });

      return buildWorkspaceOnboardingEnvelope(workspaceId, viewer.id);
    },
    async acceptWorkspaceInvitation(input: WorkspaceInvitationAcceptRequestDto) {
      const viewer = await db.select().from(users).orderBy(users.createdAt).limit(1).then((rows) => rows[0] ?? null);

      if (!viewer) {
        return null;
      }

      const timestamp = nowIso();
      const workspaceExists = await db
        .select({ id: workspaces.id })
        .from(workspaces)
        .where(eq(workspaces.id, input.workspaceId))
        .limit(1)
        .then((rows) => rows[0] ?? null);

      if (!workspaceExists) {
        return null;
      }

      await db.transaction(async (tx) => {
        const membership = await tx
          .select()
          .from(workspaceMemberships)
          .where(
            and(
              eq(workspaceMemberships.workspaceId, input.workspaceId),
              eq(workspaceMemberships.userId, viewer.id),
            ),
          )
          .limit(1)
          .then((rows: MembershipRow[]) => rows[0] ?? null);

        if (membership) {
          await tx
            .update(workspaceMemberships)
            .set({
              status: "active",
              joinedAt: membership.joinedAt ?? toDate(timestamp),
              lastActiveAt: toDate(timestamp),
              removedAt: null,
              updatedAt: toDate(timestamp),
            })
            .where(eq(workspaceMemberships.id, membership.id));
        } else {
          await tx.insert(workspaceMemberships).values({
            id: buildId("mbr"),
            workspaceId: input.workspaceId,
            userId: viewer.id,
            role: "Editor",
            status: "active",
            invitedByUserId: viewer.id,
            notificationWebhookUrl: null,
            invitedAt: toDate(timestamp),
            joinedAt: toDate(timestamp),
            lastActiveAt: toDate(timestamp),
            removedAt: null,
            createdAt: toDate(timestamp),
            updatedAt: toDate(timestamp),
          });
        }

        await tx
          .update(workspaces)
          .set({
            lastOpenedAt: toDate(timestamp),
            updatedAt: toDate(timestamp),
          })
          .where(eq(workspaces.id, input.workspaceId));
      });

      return buildWorkspaceOnboardingEnvelope(input.workspaceId, viewer.id);
    },
  };
}
