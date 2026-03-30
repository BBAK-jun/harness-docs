import type {
  AuthoringContext,
  DocumentEditingLock,
  DocumentLifecycleMetadata,
  DocumentPrePublicationState,
  DocumentReviewState,
  DocumentTemplate,
  SessionUser,
  Workspace,
  WorkspaceDocument,
  WorkspaceGraph,
  WorkspaceMembership,
} from "../types/contracts";

const FIXTURE_TIMESTAMP = "2026-03-29T00:00:00.000Z";

function createAuthoringContextFixture(
  overrides: Partial<AuthoringContext> = {},
): AuthoringContext {
  return {
    workspaceId: "ws-1",
    currentDocumentId: "doc-1",
    templateId: "tpl-1",
    currentUserMembershipId: "mem-1",
    activeArea: "editor",
    intent: "revise_document",
    linkedDocumentIds: [],
    invalidatedByDocumentIds: [],
    referenceDocumentIds: [],
    ...overrides,
  };
}

export function createSessionUserFixture(overrides: Partial<SessionUser> = {}): SessionUser {
  return {
    id: "user-1",
    name: "User One",
    handle: "@user-one",
    avatarInitials: "UO",
    githubLogin: "user-one",
    primaryEmail: "user-one@example.com",
    ...overrides,
  };
}

export function createWorkspaceFixture(overrides: Partial<Workspace> = {}): Workspace {
  return {
    id: "ws-1",
    name: "Workspace One",
    slug: "workspace-one",
    description: "Fixture workspace",
    docsRepository: {
      owner: "acme",
      name: "docs",
      defaultBranch: "main",
      installationId: 1,
    },
    createdByUserId: "user-1",
    leadMembershipId: "mem-1",
    membershipIds: ["mem-1"],
    documentIds: ["doc-1"],
    templateIds: ["tpl-1"],
    lifecycle: {
      createdAt: FIXTURE_TIMESTAMP,
      updatedAt: FIXTURE_TIMESTAMP,
      status: "active",
      provisionedAt: FIXTURE_TIMESTAMP,
      lastOpenedAt: FIXTURE_TIMESTAMP,
    },
    ...overrides,
  };
}

export function createWorkspaceMembershipFixture(
  overrides: Partial<WorkspaceMembership> = {},
): WorkspaceMembership {
  return {
    id: "mem-1",
    workspaceId: "ws-1",
    userId: "user-1",
    role: "Lead",
    invitedByUserId: "user-1",
    notificationWebhookUrl: null,
    lifecycle: {
      createdAt: FIXTURE_TIMESTAMP,
      updatedAt: FIXTURE_TIMESTAMP,
      status: "active",
      invitedAt: FIXTURE_TIMESTAMP,
      joinedAt: FIXTURE_TIMESTAMP,
      lastActiveAt: FIXTURE_TIMESTAMP,
      removedAt: null,
    },
    ...overrides,
  };
}

export function createDocumentEditingLockFixture(
  overrides: Partial<DocumentEditingLock> = {},
): DocumentEditingLock {
  return {
    id: "lock-doc-1",
    workspaceId: "ws-1",
    documentId: "doc-1",
    lockedByMembershipId: "mem-1",
    acquiredFromArea: "editor",
    inactivityTimeoutMinutes: 30,
    acquiredAt: FIXTURE_TIMESTAMP,
    expiresAt: "2026-03-29T00:30:00.000Z",
    lastActivityAt: FIXTURE_TIMESTAMP,
    releasedByMembershipId: null,
    releaseReason: null,
    lifecycle: {
      createdAt: FIXTURE_TIMESTAMP,
      updatedAt: FIXTURE_TIMESTAMP,
      status: "active",
      releasedAt: null,
      expiredAt: null,
    },
    ...overrides,
  };
}

export function createDocumentReviewStateFixture(
  overrides: Partial<DocumentReviewState> = {},
): DocumentReviewState {
  return {
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
      evaluatedAt: FIXTURE_TIMESTAMP,
      evaluatedByMembershipId: "mem-1",
      staleSince: null,
      rationaleRequired: false,
      summary: "Current",
      reasons: [],
      invalidations: [],
    },
    ...overrides,
  };
}

export function createDocumentLifecycleFixture(
  overrides: Partial<DocumentLifecycleMetadata> = {},
): DocumentLifecycleMetadata {
  return {
    createdAt: FIXTURE_TIMESTAMP,
    updatedAt: FIXTURE_TIMESTAMP,
    archivedAt: null,
    status: "draft",
    reviewStatus: "idle",
    reviewRequestedAt: null,
    stalenessStatus: "current",
    staleRationaleRequired: false,
    staleEvaluatedAt: FIXTURE_TIMESTAMP,
    review: createDocumentReviewStateFixture(),
    lastPublishedAt: null,
    lastPublishedCommitSha: null,
    activeEditLock: null,
    ...overrides,
  };
}

export function createDocumentPrePublicationStateFixture(
  overrides: Partial<DocumentPrePublicationState> = {},
): DocumentPrePublicationState {
  return {
    readiness: "ready",
    summary: "Ready to publish",
    evaluatedAt: FIXTURE_TIMESTAMP,
    evaluatedByMembershipId: "mem-1",
    publishRecordId: null,
    stalePublishAllowed: true,
    staleRationaleRequired: false,
    unresolvedApprovalIds: [],
    unresolvedApprovals: [],
    invalidationIds: [],
    blockingIssues: [],
    github: {
      status: "eligible",
      summary: "Repository connected",
      repository: {
        owner: "acme",
        name: "docs",
        defaultBranch: "main",
        installationId: 1,
      },
      missingCapabilities: [],
    },
    ...overrides,
  };
}

export function createDocumentTemplateFixture(
  overrides: Partial<DocumentTemplate> = {},
): DocumentTemplate {
  return {
    id: "tpl-1",
    workspaceId: "ws-1",
    name: "Spec Template",
    description: "Fixture template",
    documentType: "Technical Spec",
    source: "workspace",
    version: 1,
    createdByMembershipId: "mem-1",
    authoringContext: createAuthoringContextFixture(),
    sections: [
      {
        id: "sec-1",
        title: "Overview",
        kind: "narrative",
        summary: "Overview section",
        required: true,
        defaultMarkdown: "",
        guidance: [],
        linkedDocumentTypeHints: [],
      },
    ],
    lifecycle: {
      createdAt: FIXTURE_TIMESTAMP,
      updatedAt: FIXTURE_TIMESTAMP,
      status: "active",
      publishedAt: null,
      lastPublishedCommitSha: null,
    },
    ...overrides,
  };
}

export function createWorkspaceDocumentFixture(
  overrides: Partial<WorkspaceDocument> = {},
): WorkspaceDocument {
  return {
    id: "doc-1",
    workspaceId: "ws-1",
    title: "Document One",
    slug: "document-one",
    type: "Technical Spec",
    ownerMembershipId: "mem-1",
    createdByMembershipId: "mem-1",
    templateId: "tpl-1",
    aiDraftSuggestionIds: [],
    commentThreadIds: [],
    markdownSource: "# Title\n\nInitial body",
    mentions: [],
    linkedDocumentIds: [],
    prePublication: createDocumentPrePublicationStateFixture(),
    lifecycle: createDocumentLifecycleFixture(),
    ...overrides,
  };
}

export function createWorkspaceGraphFixture(
  overrides: Partial<WorkspaceGraph> = {},
): WorkspaceGraph {
  return {
    workspace: createWorkspaceFixture(),
    memberships: [createWorkspaceMembershipFixture()],
    documents: [createWorkspaceDocumentFixture()],
    approvals: [],
    documentLocks: [],
    commentThreads: [],
    comments: [],
    templates: [createDocumentTemplateFixture()],
    aiDraftSuggestions: [],
    publishRecords: [],
    ...overrides,
  };
}
