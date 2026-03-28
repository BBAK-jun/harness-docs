import {
  appSessions,
  aiDrafts,
  approvalEvents,
  approvalRequests,
  authAccounts,
  documentInvalidations,
  documentLinks,
  documentLocks,
  documents,
  documentVersions,
  publishNotifications,
  publishRecordArtifacts,
  publishRecords,
  templates,
  type HarnessDocsDatabase,
  users,
  workspaceMemberships,
  workspaces,
} from "@harness-docs/db";
import { buildDocumentMarkdown, deriveDocumentState } from "../domain/documentAggregate.ts";

const seedTimestamps = {
  provisionedAt: "2026-01-15T09:00:00.000Z",
  joinedAt: "2026-01-15T09:05:00.000Z",
  prdCreatedAt: "2026-01-15T09:30:00.000Z",
  specCreatedAt: "2026-01-15T10:15:00.000Z",
  workspaceOpenedAt: "2026-01-16T03:00:00.000Z",
};

export const demoWorkspaceFixture = {
  users: {
    lead: "usr_demo_lead",
    pm: "usr_demo_pm",
    reviewer: "usr_demo_reviewer",
  },
  workspace: {
    id: "ws_harness_docs",
    slug: "harness-docs",
  },
  memberships: {
    lead: "wsm_harness_lead",
    pm: "wsm_harness_pm",
    reviewer: "wsm_harness_reviewer",
  },
  templates: {
    prd: "tpl_prd_system",
    uxFlow: "tpl_ux_flow_system",
    technicalSpec: "tpl_technical_spec_system",
    policy: "tpl_policy_decision_system",
  },
  documents: {
    prd: "doc_publish_prd",
    technicalSpec: "doc_publish_technical_spec",
  },
};

function toDate(value: string) {
  return new Date(value);
}

function buildAuthoringContext(currentUserMembershipId: string, templateId: string) {
  return {
    workspaceId: demoWorkspaceFixture.workspace.id,
    currentDocumentId: null,
    templateId,
    currentUserMembershipId,
    activeArea: "editor",
    intent: "create_document",
    linkedDocumentIds: [],
    invalidatedByDocumentIds: [],
    referenceDocumentIds: [],
  };
}

function buildTemplateSections(templateId: string) {
  switch (templateId) {
    case demoWorkspaceFixture.templates.prd:
      return [
        {
          id: "problem",
          title: "Problem Statement",
          kind: "summary",
          summary: "Describe the user and team problem this document addresses.",
          required: true,
          defaultMarkdown: "Summarize the operational problem and why it matters now.",
          guidance: ["State the user impact before describing implementation details."],
          linkedDocumentTypeHints: ["UX Flow", "Technical Spec"],
        },
        {
          id: "goals",
          title: "Goals and Non-Goals",
          kind: "list",
          summary: "Make the desired product outcome explicit.",
          required: true,
          defaultMarkdown: "- Goal\n- Non-goal",
          guidance: ["Keep this list short and measurable."],
          linkedDocumentTypeHints: ["Technical Spec", "Policy/Decision"],
        },
      ];
    case demoWorkspaceFixture.templates.uxFlow:
      return [
        {
          id: "entry-points",
          title: "Entry Points",
          kind: "list",
          summary: "Describe how a user enters the flow.",
          required: true,
          defaultMarkdown: "- Starting context\n- Trigger",
          guidance: ["Note primary and secondary entry points."],
          linkedDocumentTypeHints: ["PRD", "Technical Spec"],
        },
        {
          id: "states",
          title: "Flow States",
          kind: "narrative",
          summary: "List the major UI states in order.",
          required: true,
          defaultMarkdown: "Describe the state progression and decision points.",
          guidance: ["Keep transitions explicit."],
          linkedDocumentTypeHints: ["Policy/Decision"],
        },
      ];
    case demoWorkspaceFixture.templates.technicalSpec:
      return [
        {
          id: "architecture",
          title: "Architecture",
          kind: "narrative",
          summary: "Describe the main services and boundaries.",
          required: true,
          defaultMarkdown: "Explain the boundary between desktop, API, and GitHub automation.",
          guidance: ["Call out ownership and source of truth."],
          linkedDocumentTypeHints: ["PRD", "Policy/Decision"],
        },
        {
          id: "contracts",
          title: "Contracts",
          kind: "decision",
          summary: "List storage and API contracts that must remain stable.",
          required: true,
          defaultMarkdown: "Document the API surfaces and persistence invariants.",
          guidance: ["Include compatibility notes where needed."],
          linkedDocumentTypeHints: ["PRD"],
        },
      ];
    default:
      return [
        {
          id: "decision",
          title: "Decision",
          kind: "decision",
          summary: "Capture the decision and rationale.",
          required: true,
          defaultMarkdown: "State the decision, rationale, and tradeoffs.",
          guidance: ["Record what changed and why."],
          linkedDocumentTypeHints: ["PRD", "Technical Spec"],
        },
      ];
  }
}

function buildInitialDocuments() {
  const prdMarkdown = buildDocumentMarkdown("Document Publish Workflow Refresh", {
    description:
      "A shared product document for improving publish workflow visibility inside the Harness Docs desktop app.",
    sections: buildTemplateSections(demoWorkspaceFixture.templates.prd),
  });
  const technicalSpecMarkdown = buildDocumentMarkdown("Publish Pipeline Persistence Contract", {
    description:
      "A technical spec that describes how the API stores publish state, approval state, and GitHub handoff metadata.",
    sections: buildTemplateSections(demoWorkspaceFixture.templates.technicalSpec),
  });

  const prdDerivedState = deriveDocumentState({
    documentId: demoWorkspaceFixture.documents.prd,
    currentStatus: "draft",
    ownerMembershipId: demoWorkspaceFixture.memberships.pm,
    actorMembershipId: demoWorkspaceFixture.memberships.pm,
    timestamp: seedTimestamps.prdCreatedAt,
    approvals: [],
    invalidations: [],
  });
  const technicalSpecDerivedState = deriveDocumentState({
    documentId: demoWorkspaceFixture.documents.technicalSpec,
    currentStatus: "draft",
    ownerMembershipId: demoWorkspaceFixture.memberships.lead,
    actorMembershipId: demoWorkspaceFixture.memberships.lead,
    timestamp: seedTimestamps.specCreatedAt,
    approvals: [],
    invalidations: [],
  });

  return {
    prd: {
      id: demoWorkspaceFixture.documents.prd,
      title: "Document Publish Workflow Refresh",
      slug: "document-publish-workflow-refresh",
      type: "PRD" as const,
      ownerMembershipId: demoWorkspaceFixture.memberships.pm,
      createdByMembershipId: demoWorkspaceFixture.memberships.pm,
      templateId: demoWorkspaceFixture.templates.prd,
      markdownSource: prdMarkdown,
      derivedState: prdDerivedState,
      linkedDocumentIds: [demoWorkspaceFixture.documents.technicalSpec],
      createdAt: seedTimestamps.prdCreatedAt,
    },
    technicalSpec: {
      id: demoWorkspaceFixture.documents.technicalSpec,
      title: "Publish Pipeline Persistence Contract",
      slug: "publish-pipeline-persistence-contract",
      type: "Technical Spec" as const,
      ownerMembershipId: demoWorkspaceFixture.memberships.lead,
      createdByMembershipId: demoWorkspaceFixture.memberships.lead,
      templateId: demoWorkspaceFixture.templates.technicalSpec,
      markdownSource: technicalSpecMarkdown,
      derivedState: technicalSpecDerivedState,
      linkedDocumentIds: [demoWorkspaceFixture.documents.prd],
      createdAt: seedTimestamps.specCreatedAt,
    },
  };
}

export async function resetHarnessDocsDatabase(db: HarnessDocsDatabase) {
  await db.transaction(async (tx) => {
    await tx.delete(appSessions);
    await tx.delete(authAccounts);
    await tx.delete(publishNotifications);
    await tx.delete(publishRecordArtifacts);
    await tx.delete(publishRecords);
    await tx.delete(approvalEvents);
    await tx.delete(approvalRequests);
    await tx.delete(documentInvalidations);
    await tx.delete(documentLocks);
    await tx.delete(documentLinks);
    await tx.delete(documentVersions);
    await tx.delete(aiDrafts);
    await tx.delete(documents);
    await tx.delete(templates);
    await tx.delete(workspaceMemberships);
    await tx.delete(workspaces);
    await tx.delete(users);
  });
}

export async function seedDemoWorkspace(db: HarnessDocsDatabase) {
  const templateSections = {
    prd: buildTemplateSections(demoWorkspaceFixture.templates.prd),
    uxFlow: buildTemplateSections(demoWorkspaceFixture.templates.uxFlow),
    technicalSpec: buildTemplateSections(demoWorkspaceFixture.templates.technicalSpec),
    policy: buildTemplateSections(demoWorkspaceFixture.templates.policy),
  };
  const documentsFixture = buildInitialDocuments();

  await db.transaction(async (tx) => {
    await tx.insert(users).values([
      {
        id: demoWorkspaceFixture.users.lead,
        name: "Dana Lead",
        handle: "@dana",
        avatarInitials: "DL",
        githubLogin: "dana-lead",
        primaryEmail: "dana@example.com",
        createdAt: toDate(seedTimestamps.provisionedAt),
        updatedAt: toDate(seedTimestamps.provisionedAt),
      },
      {
        id: demoWorkspaceFixture.users.pm,
        name: "Mina PM",
        handle: "@mina",
        avatarInitials: "MP",
        githubLogin: "mina-pm",
        primaryEmail: "mina@example.com",
        createdAt: toDate(seedTimestamps.provisionedAt),
        updatedAt: toDate(seedTimestamps.provisionedAt),
      },
      {
        id: demoWorkspaceFixture.users.reviewer,
        name: "Rin Reviewer",
        handle: "@rin",
        avatarInitials: "RR",
        githubLogin: "rin-reviewer",
        primaryEmail: "rin@example.com",
        createdAt: toDate(seedTimestamps.provisionedAt),
        updatedAt: toDate(seedTimestamps.provisionedAt),
      },
    ]);

    await tx.insert(workspaces).values({
      id: demoWorkspaceFixture.workspace.id,
      slug: demoWorkspaceFixture.workspace.slug,
      name: "Harness Docs",
      description:
        "Primary workspace for the Harness Docs desktop foundation and publish workflow experiments.",
      status: "active",
      docsRepoOwner: "org",
      docsRepoName: "harness-docs-specs",
      docsRepoDefaultBranch: "main",
      githubInstallationId: 12001,
      createdByUserId: demoWorkspaceFixture.users.lead,
      leadMembershipId: demoWorkspaceFixture.memberships.lead,
      provisionedAt: toDate(seedTimestamps.provisionedAt),
      lastOpenedAt: toDate(seedTimestamps.workspaceOpenedAt),
      createdAt: toDate(seedTimestamps.provisionedAt),
      updatedAt: toDate(seedTimestamps.workspaceOpenedAt),
    });

    await tx.insert(workspaceMemberships).values([
      {
        id: demoWorkspaceFixture.memberships.lead,
        workspaceId: demoWorkspaceFixture.workspace.id,
        userId: demoWorkspaceFixture.users.lead,
        role: "Lead",
        status: "active",
        invitedByUserId: demoWorkspaceFixture.users.lead,
        notificationWebhookUrl: "https://example.com/hooks/lead",
        invitedAt: toDate(seedTimestamps.provisionedAt),
        joinedAt: toDate(seedTimestamps.joinedAt),
        lastActiveAt: toDate(seedTimestamps.workspaceOpenedAt),
        removedAt: null,
        createdAt: toDate(seedTimestamps.provisionedAt),
        updatedAt: toDate(seedTimestamps.workspaceOpenedAt),
      },
      {
        id: demoWorkspaceFixture.memberships.pm,
        workspaceId: demoWorkspaceFixture.workspace.id,
        userId: demoWorkspaceFixture.users.pm,
        role: "Editor",
        status: "active",
        invitedByUserId: demoWorkspaceFixture.users.lead,
        notificationWebhookUrl: null,
        invitedAt: toDate(seedTimestamps.provisionedAt),
        joinedAt: toDate(seedTimestamps.joinedAt),
        lastActiveAt: toDate(seedTimestamps.workspaceOpenedAt),
        removedAt: null,
        createdAt: toDate(seedTimestamps.provisionedAt),
        updatedAt: toDate(seedTimestamps.workspaceOpenedAt),
      },
      {
        id: demoWorkspaceFixture.memberships.reviewer,
        workspaceId: demoWorkspaceFixture.workspace.id,
        userId: demoWorkspaceFixture.users.reviewer,
        role: "Reviewer",
        status: "active",
        invitedByUserId: demoWorkspaceFixture.users.lead,
        notificationWebhookUrl: "https://example.com/hooks/reviewer",
        invitedAt: toDate(seedTimestamps.provisionedAt),
        joinedAt: toDate(seedTimestamps.joinedAt),
        lastActiveAt: toDate(seedTimestamps.workspaceOpenedAt),
        removedAt: null,
        createdAt: toDate(seedTimestamps.provisionedAt),
        updatedAt: toDate(seedTimestamps.workspaceOpenedAt),
      },
    ]);

    await tx.insert(templates).values([
      {
        id: demoWorkspaceFixture.templates.prd,
        workspaceId: demoWorkspaceFixture.workspace.id,
        name: "PRD",
        description: "System PRD template for product requirement capture.",
        documentType: "PRD",
        source: "system",
        status: "active",
        version: 1,
        createdByMembershipId: demoWorkspaceFixture.memberships.lead,
        authoringContext: buildAuthoringContext(
          demoWorkspaceFixture.memberships.lead,
          demoWorkspaceFixture.templates.prd,
        ),
        sections: templateSections.prd,
        publishedAt: null,
        lastPublishedCommitSha: null,
        createdAt: toDate(seedTimestamps.provisionedAt),
        updatedAt: toDate(seedTimestamps.provisionedAt),
      },
      {
        id: demoWorkspaceFixture.templates.uxFlow,
        workspaceId: demoWorkspaceFixture.workspace.id,
        name: "UX Flow",
        description: "System UX Flow template for journey and state mapping.",
        documentType: "UX Flow",
        source: "system",
        status: "active",
        version: 1,
        createdByMembershipId: demoWorkspaceFixture.memberships.lead,
        authoringContext: buildAuthoringContext(
          demoWorkspaceFixture.memberships.lead,
          demoWorkspaceFixture.templates.uxFlow,
        ),
        sections: templateSections.uxFlow,
        publishedAt: null,
        lastPublishedCommitSha: null,
        createdAt: toDate(seedTimestamps.provisionedAt),
        updatedAt: toDate(seedTimestamps.provisionedAt),
      },
      {
        id: demoWorkspaceFixture.templates.technicalSpec,
        workspaceId: demoWorkspaceFixture.workspace.id,
        name: "Technical Spec",
        description: "System technical spec template for service boundaries and contracts.",
        documentType: "Technical Spec",
        source: "system",
        status: "active",
        version: 1,
        createdByMembershipId: demoWorkspaceFixture.memberships.lead,
        authoringContext: buildAuthoringContext(
          demoWorkspaceFixture.memberships.lead,
          demoWorkspaceFixture.templates.technicalSpec,
        ),
        sections: templateSections.technicalSpec,
        publishedAt: null,
        lastPublishedCommitSha: null,
        createdAt: toDate(seedTimestamps.provisionedAt),
        updatedAt: toDate(seedTimestamps.provisionedAt),
      },
      {
        id: demoWorkspaceFixture.templates.policy,
        workspaceId: demoWorkspaceFixture.workspace.id,
        name: "Policy / Decision",
        description: "System policy template for operational decisions and follow-up.",
        documentType: "Policy/Decision",
        source: "system",
        status: "active",
        version: 1,
        createdByMembershipId: demoWorkspaceFixture.memberships.lead,
        authoringContext: buildAuthoringContext(
          demoWorkspaceFixture.memberships.lead,
          demoWorkspaceFixture.templates.policy,
        ),
        sections: templateSections.policy,
        publishedAt: null,
        lastPublishedCommitSha: null,
        createdAt: toDate(seedTimestamps.provisionedAt),
        updatedAt: toDate(seedTimestamps.provisionedAt),
      },
    ]);

    await tx.insert(documents).values([
      {
        id: documentsFixture.prd.id,
        workspaceId: demoWorkspaceFixture.workspace.id,
        title: documentsFixture.prd.title,
        slug: documentsFixture.prd.slug,
        type: documentsFixture.prd.type,
        status: documentsFixture.prd.derivedState.status,
        reviewStatus: documentsFixture.prd.derivedState.reviewStatus,
        approvalState: documentsFixture.prd.derivedState.approvalState,
        freshnessStatus: documentsFixture.prd.derivedState.freshnessStatus,
        staleRationaleRequired: documentsFixture.prd.derivedState.staleRationaleRequired,
        currentMarkdownSource: documentsFixture.prd.markdownSource,
        ownerMembershipId: documentsFixture.prd.ownerMembershipId,
        createdByMembershipId: documentsFixture.prd.createdByMembershipId,
        templateId: documentsFixture.prd.templateId,
        activePublishRecordId: null,
        reviewRequestedAt: null,
        lastReviewedAt: null,
        lastReviewedByMembershipId: null,
        approvedAt: null,
        staleEvaluatedAt: toDate(documentsFixture.prd.createdAt),
        staleSummary: documentsFixture.prd.derivedState.staleSummary,
        staleReasons: documentsFixture.prd.derivedState.staleReasons,
        lastPublishedAt: null,
        lastPublishedCommitSha: null,
        createdAt: toDate(documentsFixture.prd.createdAt),
        updatedAt: toDate(documentsFixture.prd.createdAt),
      },
      {
        id: documentsFixture.technicalSpec.id,
        workspaceId: demoWorkspaceFixture.workspace.id,
        title: documentsFixture.technicalSpec.title,
        slug: documentsFixture.technicalSpec.slug,
        type: documentsFixture.technicalSpec.type,
        status: documentsFixture.technicalSpec.derivedState.status,
        reviewStatus: documentsFixture.technicalSpec.derivedState.reviewStatus,
        approvalState: documentsFixture.technicalSpec.derivedState.approvalState,
        freshnessStatus: documentsFixture.technicalSpec.derivedState.freshnessStatus,
        staleRationaleRequired: documentsFixture.technicalSpec.derivedState.staleRationaleRequired,
        currentMarkdownSource: documentsFixture.technicalSpec.markdownSource,
        ownerMembershipId: documentsFixture.technicalSpec.ownerMembershipId,
        createdByMembershipId: documentsFixture.technicalSpec.createdByMembershipId,
        templateId: documentsFixture.technicalSpec.templateId,
        activePublishRecordId: null,
        reviewRequestedAt: null,
        lastReviewedAt: null,
        lastReviewedByMembershipId: null,
        approvedAt: null,
        staleEvaluatedAt: toDate(documentsFixture.technicalSpec.createdAt),
        staleSummary: documentsFixture.technicalSpec.derivedState.staleSummary,
        staleReasons: documentsFixture.technicalSpec.derivedState.staleReasons,
        lastPublishedAt: null,
        lastPublishedCommitSha: null,
        createdAt: toDate(documentsFixture.technicalSpec.createdAt),
        updatedAt: toDate(documentsFixture.technicalSpec.createdAt),
      },
    ]);

    await tx.insert(documentLinks).values([
      {
        sourceDocumentId: documentsFixture.prd.id,
        targetDocumentId: documentsFixture.technicalSpec.id,
        relationshipKind: "reference",
        createdAt: toDate(documentsFixture.prd.createdAt),
      },
      {
        sourceDocumentId: documentsFixture.technicalSpec.id,
        targetDocumentId: documentsFixture.prd.id,
        relationshipKind: "reference",
        createdAt: toDate(documentsFixture.technicalSpec.createdAt),
      },
    ]);

    await tx.insert(documentVersions).values([
      {
        id: "docver_publish_prd_1",
        documentId: documentsFixture.prd.id,
        versionNumber: 1,
        markdownSource: documentsFixture.prd.markdownSource,
        changedByMembershipId: documentsFixture.prd.createdByMembershipId,
        changeSummary: "Seeded initial PRD draft.",
        linkedDocumentIdsSnapshot: documentsFixture.prd.linkedDocumentIds,
        createdAt: toDate(documentsFixture.prd.createdAt),
      },
      {
        id: "docver_publish_spec_1",
        documentId: documentsFixture.technicalSpec.id,
        versionNumber: 1,
        markdownSource: documentsFixture.technicalSpec.markdownSource,
        changedByMembershipId: documentsFixture.technicalSpec.createdByMembershipId,
        changeSummary: "Seeded initial technical spec draft.",
        linkedDocumentIdsSnapshot: documentsFixture.technicalSpec.linkedDocumentIds,
        createdAt: toDate(documentsFixture.technicalSpec.createdAt),
      },
    ]);
  });

  return demoWorkspaceFixture;
}
