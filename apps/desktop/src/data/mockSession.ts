import type {
  AIDraftSuggestion,
  DocumentApproval,
  DocumentComment,
  DocumentCommentThread,
  DocumentEditingLock,
  DocumentPrePublicationState,
  DocumentTemplate,
  PublishRecord,
  SessionUser,
  UnresolvedApprovalSnapshot,
  WorkspaceAreaSummary,
  WorkspaceDocument,
  WorkspaceGraph,
  WorkspaceMembership,
  WorkspaceSummary,
} from "../types";
import { createPublishRecordWithPreflight } from "../lib/publishPreflight";

const workspaceAreaSummaries: Record<string, Record<string, WorkspaceAreaSummary>> = {
  ws_horizon: {
    documents: {
      title: "Document Library",
      description:
        "Browse role-specific docs, spot invalidation links, and enter structured review from one queue.",
      primaryAction: "Open document queue",
      highlights: [
        "PRD, UX Flow, Technical Spec, Policy/Decision",
        "Linked-doc traceability",
        "Template-aware creation",
      ],
    },
    editor: {
      title: "Markdown Editor",
      description:
        "Start editing with an explicit lock, work in markdown source, and keep preview visible.",
      primaryAction: "Resume latest draft",
      highlights: [
        "Start Editing lock flow",
        "Split source and preview",
        "Idle release after 30 minutes",
      ],
    },
    comments: {
      title: "Comments and Mentions",
      description:
        "Track block-level feedback, route mentions, and see linked review requests triggered by changes.",
      primaryAction: "Open review threads",
      highlights: ["Paragraph comments", "@mention routing", "Review-request visibility"],
    },
    approvals: {
      title: "Approvals",
      description:
        "Manage app-native approvers, current approval state, and restoration by lead-level authority.",
      primaryAction: "Review approver matrix",
      highlights: ["App-managed authority", "Imported GitHub candidates", "Decision history"],
    },
    publish: {
      title: "Publish Flow",
      description:
        "Prepare GitHub branch, commit, and pull request publication while surfacing stale rationale.",
      primaryAction: "Prepare publish memo",
      highlights: ["Stale publish allowed", "Rationale required", "Unresolved approvals preserved"],
    },
    ai: {
      title: "AI Harness",
      description:
        "Launch structured AI actions with either Codex or Claude against internal workspace documents.",
      primaryAction: "Start AI task",
      highlights: ["Provider selection", "Action-button first UX", "Internal-doc search only"],
    },
  },
  ws_northstar: {
    documents: {
      title: "Document Library",
      description: "View document coverage across release readiness and dependency policies.",
      primaryAction: "Inspect document map",
      highlights: [
        "Role-specific documents",
        "Linked change requests",
        "Workspace-specific templates",
      ],
    },
    editor: {
      title: "Markdown Editor",
      description:
        "Enter a document through explicit lock acquisition and continue from the latest draft.",
      primaryAction: "Open editor workspace",
      highlights: [
        "Lock ownership visibility",
        "Markdown-first workflow",
        "Preview before publish",
      ],
    },
    comments: {
      title: "Comments and Mentions",
      description: "Review thread volume and surface who still needs to respond before approval.",
      primaryAction: "Triage mentions",
      highlights: ["Comment resolution", "Mention feed", "Cross-doc review triggers"],
    },
    approvals: {
      title: "Approvals",
      description: "See remaining approvers, invalidated decisions, and restored authority paths.",
      primaryAction: "Audit approval state",
      highlights: ["Lead restoration", "App-native decisions", "Candidate import history"],
    },
    publish: {
      title: "Publish Flow",
      description:
        "Assemble publish rationale even when stale links or invalidations remain unresolved.",
      primaryAction: "Inspect publish checklist",
      highlights: ["Branch and PR automation", "Unresolved state capture", "Memo drafting"],
    },
    ai: {
      title: "AI Harness",
      description:
        "Run Codex or Claude tasks to draft approver suggestions and document link updates.",
      primaryAction: "Choose provider",
      highlights: ["Codex and Claude", "Workspace-only retrieval", "Task-scoped suggestions"],
    },
  },
};

export const mockUser: SessionUser = {
  id: "usr_mina_cho",
  name: "Mina Cho",
  handle: "@mina",
  avatarInitials: "MC",
  githubLogin: "mina-cho",
  primaryEmail: "mina@harnessdocs.dev",
};

function createReviewState(
  overrides: WorkspaceDocument["lifecycle"]["review"],
): WorkspaceDocument["lifecycle"]["review"] {
  return overrides;
}

function createPrePublicationState(
  overrides: DocumentPrePublicationState,
): DocumentPrePublicationState {
  return overrides;
}

function createUnresolvedApprovalSnapshot(
  overrides: UnresolvedApprovalSnapshot,
): UnresolvedApprovalSnapshot {
  return overrides;
}

function summarizeUnresolvedApprovals(documentId: string, approvals: DocumentApproval[]) {
  return approvals.filter(
    (approval) =>
      approval.documentId === documentId &&
      ["pending", "changes_requested", "invalidated"].includes(approval.lifecycle.state),
  );
}

const horizonMemberships: WorkspaceMembership[] = [
  {
    id: "mbr_horizon_mina",
    workspaceId: "ws_horizon",
    userId: mockUser.id,
    role: "Lead",
    invitedByUserId: mockUser.id,
    notificationWebhookUrl: "https://hooks.slack.com/services/demo/horizon",
    lifecycle: {
      status: "active",
      createdAt: "2026-02-03T09:00:00Z",
      updatedAt: "2026-03-27T08:55:00Z",
      invitedAt: "2026-02-03T09:00:00Z",
      joinedAt: "2026-02-03T09:05:00Z",
      lastActiveAt: "2026-03-27T08:55:00Z",
    },
  },
  {
    id: "mbr_horizon_lee",
    workspaceId: "ws_horizon",
    userId: "usr_lee_park",
    role: "Editor",
    invitedByUserId: mockUser.id,
    lifecycle: {
      status: "active",
      createdAt: "2026-02-04T08:30:00Z",
      updatedAt: "2026-03-27T07:40:00Z",
      invitedAt: "2026-02-04T08:30:00Z",
      joinedAt: "2026-02-04T08:41:00Z",
      lastActiveAt: "2026-03-27T07:40:00Z",
    },
  },
  {
    id: "mbr_horizon_sam",
    workspaceId: "ws_horizon",
    userId: "usr_sam_kim",
    role: "Reviewer",
    invitedByUserId: mockUser.id,
    lifecycle: {
      status: "active",
      createdAt: "2026-02-04T09:20:00Z",
      updatedAt: "2026-03-27T06:15:00Z",
      invitedAt: "2026-02-04T09:20:00Z",
      joinedAt: "2026-02-04T10:10:00Z",
      lastActiveAt: "2026-03-27T06:15:00Z",
    },
  },
];

const horizonActiveLock: DocumentEditingLock = {
  id: "lock_horizon_prd_checkout_mina",
  workspaceId: "ws_horizon",
  documentId: "doc_horizon_prd_checkout",
  lockedByMembershipId: "mbr_horizon_mina",
  acquiredFromArea: "editor",
  inactivityTimeoutMinutes: 30,
  acquiredAt: "2026-03-27T08:20:00Z",
  expiresAt: "2026-03-27T08:50:00Z",
  lastActivityAt: "2026-03-27T08:52:00Z",
  releasedByMembershipId: null,
  releaseReason: null,
  lifecycle: {
    status: "active",
    createdAt: "2026-03-27T08:20:00Z",
    updatedAt: "2026-03-27T08:52:00Z",
  },
};

const horizonCommentThreads: DocumentCommentThread[] = [
  {
    id: "thread_horizon_prd_problem",
    workspaceId: "ws_horizon",
    documentId: "doc_horizon_prd_checkout",
    anchor: {
      documentId: "doc_horizon_prd_checkout",
      kind: "paragraph",
      blockId: "prd_problem",
      blockKind: "paragraph",
      headingPath: ["Problem"],
      excerpt: "The current checkout drops users during plan selection on desktop.",
      startOffset: 0,
      endOffset: 62,
    },
    participantMembershipIds: ["mbr_horizon_mina", "mbr_horizon_sam"],
    commentIds: ["cmt_horizon_problem_1", "cmt_horizon_problem_2"],
    linkedDocumentIds: ["doc_horizon_ux_checkout"],
    triggeredReviewDocumentIds: ["doc_horizon_ux_checkout"],
    lifecycle: {
      status: "open",
      createdAt: "2026-03-27T08:24:00Z",
      updatedAt: "2026-03-27T08:40:00Z",
      lastCommentAt: "2026-03-27T08:40:00Z",
    },
  },
  {
    id: "thread_horizon_publish_links",
    workspaceId: "ws_horizon",
    documentId: "doc_horizon_tech_publish",
    anchor: {
      documentId: "doc_horizon_tech_publish",
      kind: "block",
      blockId: "tech_responsibilities",
      blockKind: "checklist_item",
      headingPath: ["Responsibilities"],
      excerpt: "Open a pull request in the mapped docs repository",
      startOffset: null,
      endOffset: null,
    },
    participantMembershipIds: ["mbr_horizon_lee", "mbr_horizon_mina"],
    commentIds: ["cmt_horizon_publish_1"],
    linkedDocumentIds: ["doc_horizon_prd_checkout", "doc_horizon_policy_rollout"],
    triggeredReviewDocumentIds: ["doc_horizon_prd_checkout"],
    lifecycle: {
      status: "resolved",
      createdAt: "2026-03-25T17:50:00Z",
      updatedAt: "2026-03-25T18:05:00Z",
      lastCommentAt: "2026-03-25T17:50:00Z",
      resolvedAt: "2026-03-25T18:05:00Z",
      resolvedByMembershipId: "mbr_horizon_mina",
    },
  },
];

const horizonComments: DocumentComment[] = [
  {
    id: "cmt_horizon_problem_1",
    workspaceId: "ws_horizon",
    documentId: "doc_horizon_prd_checkout",
    threadId: "thread_horizon_prd_problem",
    authorMembershipId: "mbr_horizon_sam",
    bodyMarkdown:
      "@mina We should connect this problem statement to the recovery flow so review can confirm where users drop.",
    kind: "comment",
    mentions: [
      {
        id: "men_horizon_problem_1",
        workspaceId: "ws_horizon",
        documentId: "doc_horizon_prd_checkout",
        source: "comment_markdown",
        threadId: "thread_horizon_prd_problem",
        commentId: "cmt_horizon_problem_1",
        reference: {
          subjectKind: "user",
          rawText: "@mina",
          normalizedKey: "mina",
          displayLabel: "Mina Cho",
          membershipId: "mbr_horizon_mina",
          userId: "usr_mina_cho",
        },
        parse: {
          trigger: "@",
          startOffset: 0,
          endOffset: 5,
          line: 1,
          column: 1,
          blockId: "prd_problem",
        },
        createdAt: "2026-03-27T08:24:00Z",
        deliveryStatus: "read",
        deliveredAt: "2026-03-27T08:24:30Z",
        readAt: "2026-03-27T08:26:00Z",
      },
    ],
    lifecycle: {
      createdAt: "2026-03-27T08:24:00Z",
      updatedAt: "2026-03-27T08:24:00Z",
    },
  },
  {
    id: "cmt_horizon_problem_2",
    workspaceId: "ws_horizon",
    documentId: "doc_horizon_prd_checkout",
    threadId: "thread_horizon_prd_problem",
    authorMembershipId: "mbr_horizon_mina",
    bodyMarkdown:
      "Added the UX Flow link and kept the thread open until the updated review request is sent.",
    kind: "comment",
    mentions: [],
    lifecycle: {
      createdAt: "2026-03-27T08:40:00Z",
      updatedAt: "2026-03-27T08:40:00Z",
    },
  },
  {
    id: "cmt_horizon_publish_1",
    workspaceId: "ws_horizon",
    documentId: "doc_horizon_tech_publish",
    threadId: "thread_horizon_publish_links",
    authorMembershipId: "mbr_horizon_lee",
    bodyMarkdown:
      "Confirmed the publish step still creates the PR after recording stale rationale, so this can resolve.",
    kind: "comment",
    mentions: [],
    lifecycle: {
      createdAt: "2026-03-25T17:50:00Z",
      updatedAt: "2026-03-25T18:05:00Z",
      resolvedAt: "2026-03-25T18:05:00Z",
    },
  },
];

const horizonTemplates: DocumentTemplate[] = [
  {
    id: "tpl_prd_system",
    workspaceId: "ws_horizon",
    name: "System PRD",
    description: "Default PRD structure for cross-functional planning and approval routing.",
    documentType: "PRD",
    source: "system",
    version: 1,
    createdByMembershipId: "mbr_horizon_mina",
    authoringContext: {
      workspaceId: "ws_horizon",
      currentDocumentId: null,
      templateId: "tpl_prd_system",
      currentUserMembershipId: "mbr_horizon_mina",
      activeArea: "editor",
      intent: "create_document",
      linkedDocumentIds: [],
      invalidatedByDocumentIds: [],
      referenceDocumentIds: [],
    },
    sections: [
      {
        id: "prd_problem",
        title: "Problem",
        kind: "summary",
        summary: "State the user or business problem this PRD addresses.",
        required: true,
        defaultMarkdown: "## Problem\nDescribe the friction, risk, or unmet need.",
        guidance: [
          "Anchor the problem in observable evidence.",
          "Keep scope narrow enough to approve.",
        ],
        linkedDocumentTypeHints: ["UX Flow", "Technical Spec"],
      },
      {
        id: "prd_goals",
        title: "Goals",
        kind: "list",
        summary: "Capture the intended outcomes and decision boundaries.",
        required: true,
        defaultMarkdown: "## Goals\n- Outcome 1\n- Outcome 2",
        guidance: [
          "Use measurable outcomes where possible.",
          "Separate goals from implementation details.",
        ],
        linkedDocumentTypeHints: ["UX Flow", "Policy/Decision"],
      },
    ],
    lifecycle: {
      status: "active",
      createdAt: "2026-02-03T09:01:00Z",
      updatedAt: "2026-03-01T10:00:00Z",
      publishedAt: "2026-02-03T09:08:00Z",
      lastPublishedCommitSha: "bf12a33",
    },
  },
  {
    id: "tpl_ux_flow_system",
    workspaceId: "ws_horizon",
    name: "System UX Flow",
    description: "Baseline UX flow template for entry points, transitions, and edge cases.",
    documentType: "UX Flow",
    source: "system",
    version: 1,
    createdByMembershipId: "mbr_horizon_lee",
    authoringContext: {
      workspaceId: "ws_horizon",
      currentDocumentId: null,
      templateId: "tpl_ux_flow_system",
      currentUserMembershipId: "mbr_horizon_lee",
      activeArea: "editor",
      intent: "create_document",
      linkedDocumentIds: [],
      invalidatedByDocumentIds: [],
      referenceDocumentIds: [],
    },
    sections: [
      {
        id: "ux_entry_points",
        title: "Entry Points",
        kind: "list",
        summary: "Identify how users enter the flow.",
        required: true,
        defaultMarkdown: "## Entry Points\n- Entry point",
        guidance: [
          "List triggers and preconditions.",
          "Reference upstream PRD language when relevant.",
        ],
        linkedDocumentTypeHints: ["PRD"],
      },
      {
        id: "ux_flow_steps",
        title: "Flow Steps",
        kind: "narrative",
        summary: "Describe the sequence of user-visible steps.",
        required: true,
        defaultMarkdown: "## Flow Steps\n1. Step one\n2. Step two",
        guidance: ["Call out recovery moments.", "Highlight decision branches and redirects."],
        linkedDocumentTypeHints: ["PRD", "Technical Spec"],
      },
    ],
    lifecycle: {
      status: "active",
      createdAt: "2026-02-03T09:02:00Z",
      updatedAt: "2026-03-01T10:00:00Z",
      publishedAt: "2026-02-03T09:08:00Z",
      lastPublishedCommitSha: "bf12a34",
    },
  },
  {
    id: "tpl_tech_spec_system",
    workspaceId: "ws_horizon",
    name: "System Technical Spec",
    description: "Default spec structure for implementation, integrations, and publish mechanics.",
    documentType: "Technical Spec",
    source: "system",
    version: 1,
    createdByMembershipId: "mbr_horizon_lee",
    authoringContext: {
      workspaceId: "ws_horizon",
      currentDocumentId: null,
      templateId: "tpl_tech_spec_system",
      currentUserMembershipId: "mbr_horizon_lee",
      activeArea: "editor",
      intent: "create_document",
      linkedDocumentIds: [],
      invalidatedByDocumentIds: [],
      referenceDocumentIds: [],
    },
    sections: [
      {
        id: "tech_responsibilities",
        title: "Responsibilities",
        kind: "checklist",
        summary: "Define the concrete technical responsibilities and boundaries.",
        required: true,
        defaultMarkdown: "## Responsibilities\n- Responsibility",
        guidance: [
          "Name systems of record and automation boundaries.",
          "Call out GitHub touchpoints explicitly.",
        ],
        linkedDocumentTypeHints: ["PRD", "Policy/Decision"],
      },
    ],
    lifecycle: {
      status: "active",
      createdAt: "2026-02-03T09:03:00Z",
      updatedAt: "2026-03-01T10:00:00Z",
      publishedAt: "2026-02-03T09:08:00Z",
      lastPublishedCommitSha: "bf12a35",
    },
  },
  {
    id: "tpl_policy_system",
    workspaceId: "ws_horizon",
    name: "System Policy/Decision",
    description: "Default decision record template for approval and governance changes.",
    documentType: "Policy/Decision",
    source: "system",
    version: 1,
    createdByMembershipId: "mbr_horizon_mina",
    authoringContext: {
      workspaceId: "ws_horizon",
      currentDocumentId: null,
      templateId: "tpl_policy_system",
      currentUserMembershipId: "mbr_horizon_mina",
      activeArea: "editor",
      intent: "create_document",
      linkedDocumentIds: [],
      invalidatedByDocumentIds: [],
      referenceDocumentIds: [],
    },
    sections: [
      {
        id: "policy_decision",
        title: "Decision",
        kind: "decision",
        summary: "Capture the governing decision and its authority.",
        required: true,
        defaultMarkdown: "## Decision\nState the approved decision.",
        guidance: [
          "Name who can restore or override approval state.",
          "Keep the rule explicit and auditable.",
        ],
        linkedDocumentTypeHints: ["PRD", "Technical Spec"],
      },
      {
        id: "policy_guardrails",
        title: "Guardrails",
        kind: "checklist",
        summary: "List the operational limits and audit expectations.",
        required: true,
        defaultMarkdown: "## Guardrails\n- Guardrail",
        guidance: ["Focus on visible enforcement.", "Include publish-time requirements."],
        linkedDocumentTypeHints: ["Technical Spec"],
      },
    ],
    lifecycle: {
      status: "active",
      createdAt: "2026-02-03T09:04:00Z",
      updatedAt: "2026-03-01T10:00:00Z",
      publishedAt: "2026-02-03T09:08:00Z",
      lastPublishedCommitSha: "bf12a36",
    },
  },
];

const horizonApprovals: DocumentApproval[] = [
  {
    id: "apr_horizon_checkout_reviewer",
    workspaceId: "ws_horizon",
    documentId: "doc_horizon_prd_checkout",
    authority: "required_reviewer",
    source: "workspace_membership",
    membershipId: "mbr_horizon_sam",
    reviewerLabel: "Sam Kim",
    requestedByMembershipId: "mbr_horizon_mina",
    decision: "changes_requested",
    decisionByMembershipId: "mbr_horizon_sam",
    decisionNote: "Reconnect the PRD problem statement to the UX recovery flow before approval.",
    lifecycle: {
      state: "changes_requested",
      createdAt: "2026-03-24T09:00:00Z",
      updatedAt: "2026-03-27T08:24:00Z",
      requestedAt: "2026-03-24T09:00:00Z",
      respondedAt: "2026-03-27T08:24:00Z",
    },
  },
  {
    id: "apr_horizon_checkout_lead",
    workspaceId: "ws_horizon",
    documentId: "doc_horizon_prd_checkout",
    authority: "lead",
    source: "workspace_membership",
    membershipId: "mbr_horizon_mina",
    reviewerLabel: "Mina Cho",
    requestedByMembershipId: "mbr_horizon_mina",
    decision: null,
    decisionByMembershipId: null,
    invalidatedByDocumentId: "doc_horizon_policy_rollout",
    decisionNote: "Lead approval remains open until stale rationale is captured at publish time.",
    lifecycle: {
      state: "pending",
      createdAt: "2026-03-24T09:00:00Z",
      updatedAt: "2026-03-27T08:45:00Z",
      requestedAt: "2026-03-24T09:00:00Z",
    },
  },
  {
    id: "apr_horizon_ux_reviewer",
    workspaceId: "ws_horizon",
    documentId: "doc_horizon_ux_checkout",
    authority: "required_reviewer",
    source: "workspace_membership",
    membershipId: "mbr_horizon_mina",
    reviewerLabel: "Mina Cho",
    requestedByMembershipId: "mbr_horizon_lee",
    decision: null,
    decisionByMembershipId: null,
    decisionNote: "Awaiting lead review after linked PRD changes were incorporated.",
    lifecycle: {
      state: "pending",
      createdAt: "2026-03-26T16:10:00Z",
      updatedAt: "2026-03-26T16:10:00Z",
      requestedAt: "2026-03-26T16:10:00Z",
    },
  },
  {
    id: "apr_horizon_publish_lead",
    workspaceId: "ws_horizon",
    documentId: "doc_horizon_tech_publish",
    authority: "lead",
    source: "workspace_membership",
    membershipId: "mbr_horizon_mina",
    reviewerLabel: "Mina Cho",
    requestedByMembershipId: "mbr_horizon_lee",
    decision: "approved",
    decisionByMembershipId: "mbr_horizon_mina",
    decisionNote: "Approved for publish pipeline foundation rollout.",
    lifecycle: {
      state: "approved",
      createdAt: "2026-03-18T14:00:00Z",
      updatedAt: "2026-03-22T15:00:00Z",
      requestedAt: "2026-03-18T14:00:00Z",
      respondedAt: "2026-03-22T15:00:00Z",
    },
  },
  {
    id: "apr_horizon_policy_lead",
    workspaceId: "ws_horizon",
    documentId: "doc_horizon_policy_rollout",
    authority: "lead",
    source: "workspace_membership",
    membershipId: "mbr_horizon_mina",
    reviewerLabel: "Mina Cho",
    requestedByMembershipId: "mbr_horizon_sam",
    decision: "approved",
    decisionByMembershipId: "mbr_horizon_mina",
    decisionNote: "Policy approved as the governing restore path.",
    lifecycle: {
      state: "approved",
      createdAt: "2026-03-18T08:20:00Z",
      updatedAt: "2026-03-20T09:00:00Z",
      requestedAt: "2026-03-18T08:20:00Z",
      respondedAt: "2026-03-20T09:00:00Z",
    },
  },
];

const horizonDocuments: WorkspaceDocument[] = [
  {
    id: "doc_horizon_prd_checkout",
    workspaceId: "ws_horizon",
    title: "Checkout Modernization",
    slug: "checkout-modernization",
    type: "PRD",
    ownerMembershipId: "mbr_horizon_mina",
    createdByMembershipId: "mbr_horizon_mina",
    templateId: "tpl_prd_system",
    aiDraftSuggestionIds: ["ai_horizon_prd_refine", "ai_horizon_prd_links"],
    commentThreadIds: ["thread_horizon_prd_problem"],
    markdownSource: `# Checkout Modernization

## Problem
The current checkout drops users during plan selection on desktop.

    ## Goals
- Improve conversion for annual plans
- Reduce checkout support tickets`,
    mentions: [],
    linkedDocumentIds: ["doc_horizon_ux_checkout", "doc_horizon_tech_publish"],
    prePublication: createPrePublicationState({
      readiness: "attention_required",
      summary:
        "The document is in the publish batch with stale rationale captured, but linked approval and review issues remain visible.",
      evaluatedAt: "2026-03-27T08:47:00Z",
      evaluatedByMembershipId: "mbr_horizon_mina",
      publishRecordId: "pub_horizon_release_20260327",
      stalePublishAllowed: true,
      staleRationaleRequired: true,
      unresolvedApprovalIds: ["apr_horizon_checkout_reviewer", "apr_horizon_checkout_lead"],
      unresolvedApprovals: [
        createUnresolvedApprovalSnapshot({
          id: "unresolved_horizon_prd_reviewer_rejected",
          status: "rejected",
          documentId: "doc_horizon_prd_checkout",
          label: "Sam Kim requested changes",
          authority: "required_reviewer",
          summary:
            "Reviewer feedback remains unresolved and must stay visible before GitHub publication.",
          requiredAction:
            "Resolve the requested changes or disclose the rejected state in the publish memo.",
          approvalId: "apr_horizon_checkout_reviewer",
          membershipId: "mbr_horizon_sam",
          invalidationIds: [],
        }),
        createUnresolvedApprovalSnapshot({
          id: "unresolved_horizon_prd_lead_pending",
          status: "pending",
          documentId: "doc_horizon_prd_checkout",
          label: "Lead approval still pending",
          authority: "lead",
          summary:
            "Lead approval remains open after the linked policy update invalidated the prior approval context.",
          requiredAction:
            "Capture a lead restoration decision in-app or publish with the unresolved pending state recorded.",
          approvalId: "apr_horizon_checkout_lead",
          membershipId: "mbr_horizon_mina",
          invalidationIds: ["inv_horizon_checkout_policy"],
        }),
      ],
      invalidationIds: ["inv_horizon_checkout_policy"],
      blockingIssues: [
        {
          id: "prepub_horizon_prd_changes_requested",
          kind: "changes_requested",
          severity: "warning",
          label: "Review changes remain open",
          summary:
            "A reviewer has active change feedback that remains attached to the publish record.",
          requiredAction:
            "Decide whether to resolve the review feedback or publish with explicit rationale.",
          relatedApprovalIds: ["apr_horizon_checkout_reviewer"],
          relatedInvalidationIds: [],
        },
        {
          id: "prepub_horizon_prd_invalidated",
          kind: "approval_invalidated",
          severity: "warning",
          label: "Lead approval was invalidated by a linked policy update",
          summary:
            "The release policy changed after approval context was captured, so the stale rationale must travel with the publish record.",
          requiredAction:
            "Preserve the invalidation and any lead restoration decision in the publish memo.",
          relatedApprovalIds: ["apr_horizon_checkout_lead"],
          relatedInvalidationIds: ["inv_horizon_checkout_policy"],
        },
      ],
      github: {
        status: "eligible_with_warnings",
        summary:
          "GitHub publish may proceed because the stale rationale and unresolved approval snapshot are already captured in-app.",
        repository: {
          owner: "harness-docs",
          name: "horizon-docs",
          defaultBranch: "main",
          installationId: 1042,
        },
        missingCapabilities: [],
      },
    }),
    lifecycle: {
      status: "draft",
      createdAt: "2026-03-01T10:00:00Z",
      updatedAt: "2026-03-27T08:52:00Z",
      review: createReviewState({
        status: "changes_requested",
        approvalState: "changes_requested",
        requestedAt: "2026-03-24T09:00:00Z",
        requestedByMembershipId: "mbr_horizon_mina",
        lastReviewedAt: "2026-03-27T08:24:00Z",
        lastReviewedByMembershipId: "mbr_horizon_sam",
        approverIds: ["apr_horizon_checkout_reviewer", "apr_horizon_checkout_lead"],
        freshness: {
          status: "stale",
          evaluatedAt: "2026-03-27T08:45:00Z",
          evaluatedByMembershipId: "mbr_horizon_mina",
          staleSince: "2026-03-21T12:05:00Z",
          rationaleRequired: true,
          summary:
            "Linked release policy changes invalidate the last approval context, but publish may still proceed with rationale.",
          reasons: ["linked_document_updated", "approval_invalidated"],
          invalidations: [
            {
              id: "inv_horizon_checkout_policy",
              workspaceId: "ws_horizon",
              documentId: "doc_horizon_prd_checkout",
              sourceDocumentId: "doc_horizon_policy_rollout",
              reason: "approval_invalidated",
              summary: "Release approval policy changed after the PRD review request was opened.",
              detectedAt: "2026-03-27T08:45:00Z",
              affectsApprovalIds: ["apr_horizon_checkout_lead"],
              requiresReviewRequest: false,
            },
          ],
        },
      }),
      activeEditLock: horizonActiveLock,
    },
  },
  {
    id: "doc_horizon_ux_checkout",
    workspaceId: "ws_horizon",
    title: "Checkout Recovery Flow",
    slug: "checkout-recovery-flow",
    type: "UX Flow",
    ownerMembershipId: "mbr_horizon_lee",
    createdByMembershipId: "mbr_horizon_lee",
    templateId: "tpl_ux_flow_system",
    aiDraftSuggestionIds: [],
    commentThreadIds: [],
    markdownSource: `# Checkout Recovery Flow

## Entry Points
- Payment failure
- Session expiration

## Recovery Moments
1. Re-authenticate with GitHub
2. Restore workspace context
3. Return to the interrupted step`,
    mentions: [],
    linkedDocumentIds: ["doc_horizon_prd_checkout"],
    prePublication: createPrePublicationState({
      readiness: "attention_required",
      summary: "The UX flow is scoped for publish, but a reviewer approval is still pending.",
      evaluatedAt: "2026-03-27T08:47:00Z",
      evaluatedByMembershipId: "mbr_horizon_mina",
      publishRecordId: "pub_horizon_release_20260327",
      stalePublishAllowed: false,
      staleRationaleRequired: false,
      unresolvedApprovalIds: ["apr_horizon_ux_reviewer"],
      unresolvedApprovals: [
        createUnresolvedApprovalSnapshot({
          id: "unresolved_horizon_ux_reviewer_pending",
          status: "pending",
          documentId: "doc_horizon_ux_checkout",
          label: "Reviewer response still pending",
          authority: "required_reviewer",
          summary:
            "The UX flow is in the publish batch, but the reviewer has not responded to the latest request.",
          requiredAction:
            "Collect the reviewer decision or carry the pending approval state into the publish memo.",
          approvalId: "apr_horizon_ux_reviewer",
          membershipId: "mbr_horizon_mina",
          invalidationIds: [],
        }),
      ],
      invalidationIds: [],
      blockingIssues: [
        {
          id: "prepub_horizon_ux_pending_review",
          kind: "approval_pending",
          severity: "warning",
          label: "Reviewer approval is pending",
          summary:
            "The document remains publishable in the batch, but the app records the unresolved reviewer state.",
          requiredAction: "Collect the decision or disclose the open approval in the publish memo.",
          relatedApprovalIds: ["apr_horizon_ux_reviewer"],
          relatedInvalidationIds: [],
        },
      ],
      github: {
        status: "eligible_with_warnings",
        summary:
          "GitHub publish is allowed because the approval snapshot is preserved even though the reviewer has not responded yet.",
        repository: {
          owner: "harness-docs",
          name: "horizon-docs",
          defaultBranch: "main",
          installationId: 1042,
        },
        missingCapabilities: [],
      },
    }),
    lifecycle: {
      status: "in_review",
      createdAt: "2026-03-05T13:30:00Z",
      updatedAt: "2026-03-27T07:15:00Z",
      review: createReviewState({
        status: "review_requested",
        approvalState: "pending",
        requestedAt: "2026-03-26T16:10:00Z",
        requestedByMembershipId: "mbr_horizon_lee",
        approverIds: ["apr_horizon_ux_reviewer"],
        freshness: {
          status: "current",
          evaluatedAt: "2026-03-27T07:30:00Z",
          evaluatedByMembershipId: "mbr_horizon_lee",
          rationaleRequired: false,
          summary: "Linked PRD references are current for the active review request.",
          reasons: [],
          invalidations: [],
        },
      }),
      activeEditLock: null,
    },
  },
  {
    id: "doc_horizon_tech_publish",
    workspaceId: "ws_horizon",
    title: "Publish Pipeline Foundation",
    slug: "publish-pipeline-foundation",
    type: "Technical Spec",
    ownerMembershipId: "mbr_horizon_lee",
    createdByMembershipId: "mbr_horizon_lee",
    templateId: "tpl_tech_spec_system",
    aiDraftSuggestionIds: ["ai_horizon_publish_memo"],
    commentThreadIds: ["thread_horizon_publish_links"],
    markdownSource: `# Publish Pipeline Foundation

## Responsibilities
- Create a publish branch
- Generate the commit payload from app state
- Open a pull request in the mapped docs repository`,
    mentions: [],
    linkedDocumentIds: ["doc_horizon_prd_checkout", "doc_horizon_policy_rollout"],
    prePublication: createPrePublicationState({
      readiness: "ready",
      summary:
        "The technical spec is current, approved, and ready to enter GitHub publish automation.",
      evaluatedAt: "2026-03-27T08:47:00Z",
      evaluatedByMembershipId: "mbr_horizon_mina",
      publishRecordId: "pub_horizon_release_20260327",
      stalePublishAllowed: false,
      staleRationaleRequired: false,
      unresolvedApprovalIds: [],
      unresolvedApprovals: [],
      invalidationIds: [],
      blockingIssues: [],
      github: {
        status: "eligible",
        summary:
          "No pre-publication issues prevent branch, commit, or pull request creation for this document.",
        repository: {
          owner: "harness-docs",
          name: "horizon-docs",
          defaultBranch: "main",
          installationId: 1042,
        },
        missingCapabilities: [],
      },
    }),
    lifecycle: {
      status: "approved",
      createdAt: "2026-02-20T11:00:00Z",
      updatedAt: "2026-03-25T18:25:00Z",
      review: createReviewState({
        status: "approved",
        approvalState: "approved",
        requestedAt: "2026-03-18T14:00:00Z",
        requestedByMembershipId: "mbr_horizon_lee",
        lastReviewedAt: "2026-03-22T15:00:00Z",
        lastReviewedByMembershipId: "mbr_horizon_mina",
        approvedAt: "2026-03-22T15:00:00Z",
        approverIds: ["apr_horizon_publish_lead"],
        freshness: {
          status: "current",
          evaluatedAt: "2026-03-27T07:45:00Z",
          evaluatedByMembershipId: "mbr_horizon_lee",
          rationaleRequired: false,
          summary: "No linked document invalidations affect the current approved spec.",
          reasons: [],
          invalidations: [],
        },
      }),
      lastPublishedAt: "2026-03-25T18:30:00Z",
      lastPublishedCommitSha: "9d23fa7",
      activeEditLock: null,
    },
  },
  {
    id: "doc_horizon_policy_rollout",
    workspaceId: "ws_horizon",
    title: "Release Approval Restoration Policy",
    slug: "release-approval-restoration-policy",
    type: "Policy/Decision",
    ownerMembershipId: "mbr_horizon_mina",
    createdByMembershipId: "mbr_horizon_sam",
    templateId: "tpl_policy_system",
    aiDraftSuggestionIds: [],
    commentThreadIds: [],
    markdownSource: `# Release Approval Restoration Policy

## Decision
Lead-level approvers may restore invalidated app-native approvals during publish.

## Guardrails
- Restoration reason is recorded
- Unresolved invalidations remain visible`,
    mentions: [],
    linkedDocumentIds: ["doc_horizon_prd_checkout", "doc_horizon_tech_publish"],
    prePublication: createPrePublicationState({
      readiness: "ready",
      summary:
        "The governing policy is already current and can be republished without additional publish-time intervention.",
      evaluatedAt: "2026-03-27T07:50:00Z",
      evaluatedByMembershipId: "mbr_horizon_mina",
      publishRecordId: null,
      stalePublishAllowed: false,
      staleRationaleRequired: false,
      unresolvedApprovalIds: [],
      unresolvedApprovals: [],
      invalidationIds: [],
      blockingIssues: [],
      github: {
        status: "eligible",
        summary:
          "Repository binding is intact and no unresolved approval or freshness issue blocks GitHub publication.",
        repository: {
          owner: "harness-docs",
          name: "horizon-docs",
          defaultBranch: "main",
          installationId: 1042,
        },
        missingCapabilities: [],
      },
    }),
    lifecycle: {
      status: "published",
      createdAt: "2026-02-18T15:10:00Z",
      updatedAt: "2026-03-21T12:00:00Z",
      review: createReviewState({
        status: "approved",
        approvalState: "approved",
        requestedAt: "2026-03-18T08:20:00Z",
        requestedByMembershipId: "mbr_horizon_sam",
        lastReviewedAt: "2026-03-20T09:00:00Z",
        lastReviewedByMembershipId: "mbr_horizon_mina",
        approvedAt: "2026-03-20T09:00:00Z",
        approverIds: ["apr_horizon_policy_lead"],
        freshness: {
          status: "current",
          evaluatedAt: "2026-03-27T07:50:00Z",
          evaluatedByMembershipId: "mbr_horizon_mina",
          rationaleRequired: false,
          summary:
            "The governing policy is the freshest source for publish-time approval restoration.",
          reasons: [],
          invalidations: [],
        },
      }),
      lastPublishedAt: "2026-03-21T12:05:00Z",
      lastPublishedCommitSha: "3bc9aa2",
      activeEditLock: null,
    },
  },
];

const horizonAIDraftSuggestions: AIDraftSuggestion[] = [
  {
    id: "ai_horizon_prd_refine",
    workspaceId: "ws_horizon",
    documentId: "doc_horizon_prd_checkout",
    templateId: "tpl_prd_system",
    provider: "Codex",
    kind: "document_content",
    summary: "Drafted a sharper problem statement and measurable goals for the checkout PRD.",
    promptLabel: "Refine PRD problem and goals",
    authoringContext: {
      workspaceId: "ws_horizon",
      currentDocumentId: "doc_horizon_prd_checkout",
      templateId: "tpl_prd_system",
      currentUserMembershipId: "mbr_horizon_mina",
      activeArea: "ai",
      intent: "revise_document",
      linkedDocumentIds: ["doc_horizon_ux_checkout", "doc_horizon_tech_publish"],
      invalidatedByDocumentIds: ["doc_horizon_policy_rollout"],
      referenceDocumentIds: ["doc_horizon_ux_checkout", "doc_horizon_policy_rollout"],
    },
    sections: [
      {
        sectionId: "prd_problem",
        title: "Problem",
        markdown:
          "## Problem\nDesktop users drop during plan selection when authentication and payment recovery states diverge.",
        rationale: "Aligns the problem framing with the linked UX recovery flow.",
      },
      {
        sectionId: "prd_goals",
        title: "Goals",
        markdown:
          "## Goals\n- Increase completed annual-plan checkouts on desktop\n- Reduce support tickets tied to interrupted checkout recovery",
        rationale: "Turns the existing goals into measurable outcomes.",
      },
    ],
    suggestedLinkedDocumentIds: ["doc_horizon_ux_checkout", "doc_horizon_tech_publish"],
    lifecycle: {
      status: "reviewed",
      createdAt: "2026-03-27T08:10:00Z",
      updatedAt: "2026-03-27T08:18:00Z",
      generatedAt: "2026-03-27T08:10:00Z",
      reviewedAt: "2026-03-27T08:18:00Z",
    },
  },
  {
    id: "ai_horizon_prd_links",
    workspaceId: "ws_horizon",
    documentId: "doc_horizon_prd_checkout",
    templateId: "tpl_prd_system",
    provider: "Claude",
    kind: "document_links",
    summary: "Suggested cross-document links needed before another review request.",
    promptLabel: "Suggest missing linked docs",
    authoringContext: {
      workspaceId: "ws_horizon",
      currentDocumentId: "doc_horizon_prd_checkout",
      templateId: "tpl_prd_system",
      currentUserMembershipId: "mbr_horizon_mina",
      activeArea: "ai",
      intent: "resolve_review",
      linkedDocumentIds: ["doc_horizon_ux_checkout", "doc_horizon_tech_publish"],
      invalidatedByDocumentIds: ["doc_horizon_policy_rollout"],
      referenceDocumentIds: ["doc_horizon_policy_rollout"],
    },
    sections: [
      {
        sectionId: "linked_docs",
        title: "Linked Documents",
        markdown:
          "- Keep `Checkout Recovery Flow` linked for flow validation\n- Keep `Publish Pipeline Foundation` linked for downstream publish automation",
        rationale: "Preserves review traceability between content and implementation.",
      },
    ],
    suggestedLinkedDocumentIds: ["doc_horizon_ux_checkout", "doc_horizon_tech_publish"],
    lifecycle: {
      status: "proposed",
      createdAt: "2026-03-27T08:19:00Z",
      updatedAt: "2026-03-27T08:19:00Z",
      generatedAt: "2026-03-27T08:19:00Z",
    },
  },
  {
    id: "ai_horizon_publish_memo",
    workspaceId: "ws_horizon",
    documentId: "doc_horizon_tech_publish",
    templateId: "tpl_tech_spec_system",
    provider: "Codex",
    kind: "publish_memo",
    summary: "Prepared a publish memo draft that preserves unresolved approval state.",
    promptLabel: "Draft publish memo",
    authoringContext: {
      workspaceId: "ws_horizon",
      currentDocumentId: "doc_horizon_tech_publish",
      templateId: "tpl_tech_spec_system",
      currentUserMembershipId: "mbr_horizon_lee",
      activeArea: "publish",
      intent: "prepare_publish",
      linkedDocumentIds: ["doc_horizon_prd_checkout", "doc_horizon_policy_rollout"],
      invalidatedByDocumentIds: [],
      referenceDocumentIds: ["doc_horizon_prd_checkout", "doc_horizon_policy_rollout"],
    },
    sections: [
      {
        sectionId: "publish_memo",
        title: "Publish Memo",
        markdown:
          "Proceed with publish branch creation while recording the stale PRD rationale and unresolved approval reference for Checkout Modernization.",
        rationale: "Matches the publish-time stale policy captured in linked documents.",
      },
    ],
    suggestedLinkedDocumentIds: ["doc_horizon_prd_checkout", "doc_horizon_policy_rollout"],
    lifecycle: {
      status: "accepted",
      createdAt: "2026-03-25T18:00:00Z",
      updatedAt: "2026-03-25T18:22:00Z",
      generatedAt: "2026-03-25T18:00:00Z",
      reviewedAt: "2026-03-25T18:18:00Z",
      acceptedAt: "2026-03-25T18:22:00Z",
    },
  },
];

const horizonPublishRecords: PublishRecord[] = [
  createPublishRecordWithPreflight(
    {
      id: "pub_horizon_release_20260327",
      workspaceId: "ws_horizon",
      source: {
        kind: "workspace",
        workspaceId: "ws_horizon",
        documentId: null,
        templateId: null,
        label: "Horizon workspace publish batch",
        changeSummary:
          "Publishes the checkout modernization document set from the app-native workspace source of truth.",
      },
      currentStageId: "memo",
      memoSuggestionId: "ai_horizon_publish_memo",
      staleRationale:
        "The PRD remains publishable because the linked release policy invalidated prior approval context without changing the documented implementation path. The unresolved lead approval and reviewer request stay attached to the publish record for follow-up.",
      staleRationaleEntries: [
        {
          id: "pub_horizon_rationale_policy_invalidation",
          label: "Policy invalidation disclosed",
          summary:
            "The linked release policy invalidated prior approval context, but the publish batch still preserves that unresolved state for reviewers.",
          status: "current",
          recordedAt: "2026-03-27T08:39:00Z",
          recordedByMembershipId: "mbr_horizon_mina",
          relatedDocumentId: "doc_horizon_prd_checkout",
          relatedInvalidationId: "inv_horizon_checkout_policy",
          relatedApprovalId: "apr_horizon_checkout_lead",
        },
        {
          id: "pub_horizon_rationale_old_ux_alignment",
          label: "Legacy UX alignment note",
          summary:
            "An earlier publish note assumed the UX flow was the only affected artifact in the batch.",
          status: "outdated",
          recordedAt: "2026-03-27T08:33:00Z",
          recordedByMembershipId: "mbr_horizon_mina",
          relatedDocumentId: "doc_horizon_ux_checkout",
          supersededAt: "2026-03-27T08:41:00Z",
          supersededByDocumentId: "doc_horizon_prd_checkout",
          supersededReason:
            "PRD invalidation analysis expanded the stale rationale to include approval fallout.",
        },
      ],
      stages: [
        {
          id: "scope",
          title: "Select publish scope",
          description: "Confirm which documents and templates belong in this publish batch.",
          status: "complete",
          primaryAction: "Review included artifacts",
          guidance: [
            "Keep role-specific documents separate in the batch.",
            "Include template updates when they change authored output.",
          ],
        },
        {
          id: "freshness",
          title: "Evaluate stale state",
          description:
            "Review linked invalidations, determine current versus stale status, and record rationale when stale publish remains allowed.",
          status: "complete",
          primaryAction: "Inspect invalidations",
          guidance: [
            "Stale publish cannot hard-block the batch.",
            "Unresolved invalidations must remain visible in the record.",
          ],
        },
        {
          id: "approvals",
          title: "Capture approval snapshot",
          description:
            "Freeze app-native approval state, including unresolved or restored decisions, before GitHub publication starts.",
          status: "complete",
          primaryAction: "Audit approvers",
          guidance: [
            "Lead authority remains app-native.",
            "GitHub users may appear only as imported approval candidates.",
          ],
        },
        {
          id: "memo",
          title: "Draft publish memo",
          description:
            "Prepare the rationale, affected documents, and notification summary that will accompany the branch and pull request.",
          status: "attention",
          primaryAction: "Review memo draft",
          guidance: [
            "AI can draft the memo, but the app stores the final source of truth.",
            "Mention unresolved approvals explicitly in the memo.",
          ],
        },
        {
          id: "github",
          title: "Create branch, commit, and PR",
          description:
            "Publish automation executes against the mapped docs repository after the app-side review state is captured.",
          status: "ready",
          primaryAction: "Start GitHub publish",
          guidance: [
            "Branch creation, commit creation, and PR creation are a single publish sequence.",
            "Outbound notifications fire after the publish record is prepared.",
          ],
        },
      ],
      artifacts: [
        {
          id: "pub_artifact_horizon_prd",
          kind: "document",
          targetId: "doc_horizon_prd_checkout",
          label: "Checkout Modernization",
          documentType: "PRD",
          changeSummary:
            "Updated problem framing and linked stale approval context for publish review.",
          linkedDocumentIds: ["doc_horizon_ux_checkout", "doc_horizon_tech_publish"],
          stalenessStatus: "stale",
          unresolvedApprovalIds: ["apr_horizon_checkout_reviewer", "apr_horizon_checkout_lead"],
          unresolvedApprovals: [
            createUnresolvedApprovalSnapshot({
              id: "unresolved_horizon_prd_reviewer_rejected",
              status: "rejected",
              documentId: "doc_horizon_prd_checkout",
              label: "Sam Kim requested changes",
              authority: "required_reviewer",
              summary:
                "Reviewer feedback remains unresolved and must stay visible before GitHub publication.",
              requiredAction:
                "Resolve the requested changes or disclose the rejected state in the publish memo.",
              approvalId: "apr_horizon_checkout_reviewer",
              membershipId: "mbr_horizon_sam",
              invalidationIds: [],
            }),
            createUnresolvedApprovalSnapshot({
              id: "unresolved_horizon_prd_lead_pending",
              status: "pending",
              documentId: "doc_horizon_prd_checkout",
              label: "Lead approval still pending",
              authority: "lead",
              summary:
                "Lead approval remains open after the linked policy update invalidated the prior approval context.",
              requiredAction:
                "Capture a lead restoration decision in-app or publish with the unresolved pending state recorded.",
              approvalId: "apr_horizon_checkout_lead",
              membershipId: "mbr_horizon_mina",
              invalidationIds: ["inv_horizon_checkout_policy"],
            }),
          ],
          invalidationIds: ["inv_horizon_checkout_policy"],
        },
        {
          id: "pub_artifact_horizon_ux",
          kind: "document",
          targetId: "doc_horizon_ux_checkout",
          label: "Checkout Recovery Flow",
          documentType: "UX Flow",
          changeSummary: "Carries linked UX updates triggered by the PRD review thread.",
          linkedDocumentIds: ["doc_horizon_prd_checkout"],
          stalenessStatus: "current",
          unresolvedApprovalIds: ["apr_horizon_ux_reviewer"],
          unresolvedApprovals: [
            createUnresolvedApprovalSnapshot({
              id: "unresolved_horizon_ux_reviewer_pending",
              status: "pending",
              documentId: "doc_horizon_ux_checkout",
              label: "Reviewer response still pending",
              authority: "required_reviewer",
              summary:
                "The UX flow is in the publish batch, but the reviewer has not responded to the latest request.",
              requiredAction:
                "Collect the reviewer decision or carry the pending approval state into the publish memo.",
              approvalId: "apr_horizon_ux_reviewer",
              membershipId: "mbr_horizon_mina",
              invalidationIds: [],
            }),
          ],
          invalidationIds: [],
        },
        {
          id: "pub_artifact_horizon_publish",
          kind: "document",
          targetId: "doc_horizon_tech_publish",
          label: "Publish Pipeline Foundation",
          documentType: "Technical Spec",
          changeSummary: "Defines the branch, commit, and pull request automation path.",
          linkedDocumentIds: ["doc_horizon_prd_checkout", "doc_horizon_policy_rollout"],
          stalenessStatus: "current",
          unresolvedApprovalIds: [],
          unresolvedApprovals: [],
          invalidationIds: [],
        },
      ],
      staleDocumentIds: ["doc_horizon_prd_checkout"],
      unresolvedApprovalIds: [
        "apr_horizon_checkout_reviewer",
        "apr_horizon_checkout_lead",
        "apr_horizon_ux_reviewer",
      ],
      unresolvedApprovals: [
        createUnresolvedApprovalSnapshot({
          id: "unresolved_horizon_prd_reviewer_rejected",
          status: "rejected",
          documentId: "doc_horizon_prd_checkout",
          label: "Sam Kim requested changes",
          authority: "required_reviewer",
          summary:
            "Reviewer feedback remains unresolved and must stay visible before GitHub publication.",
          requiredAction:
            "Resolve the requested changes or disclose the rejected state in the publish memo.",
          approvalId: "apr_horizon_checkout_reviewer",
          membershipId: "mbr_horizon_sam",
          invalidationIds: [],
        }),
        createUnresolvedApprovalSnapshot({
          id: "unresolved_horizon_prd_lead_pending",
          status: "pending",
          documentId: "doc_horizon_prd_checkout",
          label: "Lead approval still pending",
          authority: "lead",
          summary:
            "Lead approval remains open after the linked policy update invalidated the prior approval context.",
          requiredAction:
            "Capture a lead restoration decision in-app or publish with the unresolved pending state recorded.",
          approvalId: "apr_horizon_checkout_lead",
          membershipId: "mbr_horizon_mina",
          invalidationIds: ["inv_horizon_checkout_policy"],
        }),
        createUnresolvedApprovalSnapshot({
          id: "unresolved_horizon_ux_reviewer_pending",
          status: "pending",
          documentId: "doc_horizon_ux_checkout",
          label: "Reviewer response still pending",
          authority: "required_reviewer",
          summary:
            "The UX flow is in the publish batch, but the reviewer has not responded to the latest request.",
          requiredAction:
            "Collect the reviewer decision or carry the pending approval state into the publish memo.",
          approvalId: "apr_horizon_ux_reviewer",
          membershipId: "mbr_horizon_mina",
          invalidationIds: [],
        }),
      ],
      invalidationIds: ["inv_horizon_checkout_policy"],
      notificationTargets: [
        {
          id: "pub_notify_horizon_inapp_mina",
          kind: "in_app",
          label: "Mina Cho",
          membershipId: "mbr_horizon_mina",
          status: "queued",
        },
        {
          id: "pub_notify_horizon_inapp_sam",
          kind: "in_app",
          label: "Sam Kim",
          membershipId: "mbr_horizon_sam",
          status: "queued",
        },
        {
          id: "pub_notify_horizon_webhook_team",
          kind: "webhook",
          label: "Horizon team webhook",
          destination: "https://hooks.slack.com/services/demo/horizon",
          status: "pending",
        },
      ],
      publication: {
        initiatedByMembershipId: "mbr_horizon_mina",
        repository: {
          owner: "harness-docs",
          name: "horizon-docs",
          defaultBranch: "main",
          baseBranch: "main",
          branchName: "publish/2026-03-27-checkout-modernization",
          installationId: 1042,
        },
        commit: {
          sha: null,
          message:
            "docs: publish checkout modernization set with stale rationale and approval snapshot",
          authoredByMembershipId: "mbr_horizon_mina",
          authoredAt: null,
        },
        pullRequest: {
          number: null,
          title: "Publish checkout modernization documentation set",
          url: null,
          openedByMembershipId: null,
          openedAt: null,
        },
      },
      lifecycle: {
        status: "ready_for_publish",
        createdAt: "2026-03-27T08:30:00Z",
        updatedAt: "2026-03-27T08:52:00Z",
        validatedAt: "2026-03-27T08:47:00Z",
      },
    },
    horizonDocuments,
  ),
];

const northstarMemberships: WorkspaceMembership[] = [
  {
    id: "mbr_northstar_mina",
    workspaceId: "ws_northstar",
    userId: mockUser.id,
    role: "Reviewer",
    invitedByUserId: "usr_alex_han",
    lifecycle: {
      status: "active",
      createdAt: "2026-02-10T09:00:00Z",
      updatedAt: "2026-03-26T22:10:00Z",
      invitedAt: "2026-02-10T09:00:00Z",
      joinedAt: "2026-02-10T09:25:00Z",
      lastActiveAt: "2026-03-26T22:10:00Z",
    },
  },
  {
    id: "mbr_northstar_alex",
    workspaceId: "ws_northstar",
    userId: "usr_alex_han",
    role: "Lead",
    invitedByUserId: "usr_alex_han",
    lifecycle: {
      status: "active",
      createdAt: "2026-02-01T08:00:00Z",
      updatedAt: "2026-03-27T05:50:00Z",
      invitedAt: "2026-02-01T08:00:00Z",
      joinedAt: "2026-02-01T08:05:00Z",
      lastActiveAt: "2026-03-27T05:50:00Z",
    },
  },
];

const northstarCommentThreads: DocumentCommentThread[] = [
  {
    id: "thread_northstar_prd_scope",
    workspaceId: "ws_northstar",
    documentId: "doc_northstar_prd_release",
    anchor: {
      documentId: "doc_northstar_prd_release",
      kind: "paragraph",
      blockId: "prd_scope",
      blockKind: "paragraph",
      headingPath: ["Scope"],
      excerpt:
        "Coordinate approvals, stale rationale, and final publish decisions across linked docs.",
      startOffset: 0,
      endOffset: 83,
    },
    participantMembershipIds: ["mbr_northstar_mina", "mbr_northstar_alex"],
    commentIds: ["cmt_northstar_scope_1", "cmt_northstar_scope_2"],
    linkedDocumentIds: ["doc_northstar_policy_release", "doc_northstar_tech_dependencies"],
    triggeredReviewDocumentIds: ["doc_northstar_policy_release", "doc_northstar_tech_dependencies"],
    lifecycle: {
      status: "open",
      createdAt: "2026-03-26T21:40:00Z",
      updatedAt: "2026-03-26T22:05:00Z",
      lastCommentAt: "2026-03-26T22:05:00Z",
    },
  },
];

const northstarComments: DocumentComment[] = [
  {
    id: "cmt_northstar_scope_1",
    workspaceId: "ws_northstar",
    documentId: "doc_northstar_prd_release",
    threadId: "thread_northstar_prd_scope",
    authorMembershipId: "mbr_northstar_alex",
    bodyMarkdown:
      "@mina Please name which linked docs should automatically receive review requests when this scope changes.",
    kind: "comment",
    mentions: [
      {
        id: "men_northstar_scope_1",
        workspaceId: "ws_northstar",
        documentId: "doc_northstar_prd_release",
        source: "comment_markdown",
        threadId: "thread_northstar_prd_scope",
        commentId: "cmt_northstar_scope_1",
        reference: {
          subjectKind: "user",
          rawText: "@mina",
          normalizedKey: "mina",
          displayLabel: "Mina Cho",
          membershipId: "mbr_northstar_mina",
          userId: "usr_mina_cho",
        },
        parse: {
          trigger: "@",
          startOffset: 0,
          endOffset: 5,
          line: 1,
          column: 1,
          blockId: "prd_scope",
        },
        createdAt: "2026-03-26T21:40:00Z",
        deliveryStatus: "read",
        deliveredAt: "2026-03-26T21:40:20Z",
        readAt: "2026-03-26T21:45:00Z",
      },
    ],
    lifecycle: {
      createdAt: "2026-03-26T21:40:00Z",
      updatedAt: "2026-03-26T21:40:00Z",
    },
  },
  {
    id: "cmt_northstar_scope_2",
    workspaceId: "ws_northstar",
    documentId: "doc_northstar_prd_release",
    threadId: "thread_northstar_prd_scope",
    authorMembershipId: "mbr_northstar_mina",
    bodyMarkdown:
      "Updated the scope to call out policy and dependency docs; leaving this open until both linked reviews are requested.",
    kind: "comment",
    mentions: [],
    lifecycle: {
      createdAt: "2026-03-26T22:05:00Z",
      updatedAt: "2026-03-26T22:05:00Z",
    },
  },
];

const northstarApprovals: DocumentApproval[] = [
  {
    id: "apr_northstar_policy_lead",
    workspaceId: "ws_northstar",
    documentId: "doc_northstar_policy_release",
    authority: "lead",
    source: "workspace_membership",
    membershipId: "mbr_northstar_alex",
    reviewerLabel: "Alex Han",
    requestedByMembershipId: "mbr_northstar_alex",
    decision: "approved",
    decisionByMembershipId: "mbr_northstar_alex",
    decisionNote: "Policy approved as the release readiness baseline.",
    lifecycle: {
      state: "approved",
      createdAt: "2026-03-18T09:00:00Z",
      updatedAt: "2026-03-20T13:00:00Z",
      requestedAt: "2026-03-18T09:00:00Z",
      respondedAt: "2026-03-20T13:00:00Z",
    },
  },
  {
    id: "apr_northstar_prd_lead",
    workspaceId: "ws_northstar",
    documentId: "doc_northstar_prd_release",
    authority: "lead",
    source: "workspace_membership",
    membershipId: "mbr_northstar_alex",
    reviewerLabel: "Alex Han",
    requestedByMembershipId: "mbr_northstar_mina",
    decision: null,
    decisionByMembershipId: null,
    invalidatedByDocumentId: "doc_northstar_policy_release",
    decisionNote:
      "Lead approval is still required because linked release policy changes affected publish authority.",
    lifecycle: {
      state: "pending",
      createdAt: "2026-03-26T21:50:00Z",
      updatedAt: "2026-03-27T05:35:00Z",
      requestedAt: "2026-03-26T21:50:00Z",
    },
  },
];

const northstarDocuments: WorkspaceDocument[] = [
  {
    id: "doc_northstar_policy_release",
    workspaceId: "ws_northstar",
    title: "Release Readiness Policy",
    slug: "release-readiness-policy",
    type: "Policy/Decision",
    ownerMembershipId: "mbr_northstar_alex",
    createdByMembershipId: "mbr_northstar_alex",
    templateId: "tpl_policy_system",
    aiDraftSuggestionIds: [],
    commentThreadIds: [],
    markdownSource: `# Release Readiness Policy

## Current Position
Publish remains allowed even when linked approvals are stale.

## Required Capture
- Rationale
- Unresolved invalidations
- Affected approvers`,
    mentions: [],
    linkedDocumentIds: ["doc_northstar_prd_release", "doc_northstar_tech_dependencies"],
    prePublication: createPrePublicationState({
      readiness: "ready",
      summary:
        "The release policy is current and can serve as a clean publish-time authority source.",
      evaluatedAt: "2026-03-27T05:40:00Z",
      evaluatedByMembershipId: "mbr_northstar_alex",
      publishRecordId: null,
      stalePublishAllowed: false,
      staleRationaleRequired: false,
      unresolvedApprovalIds: [],
      unresolvedApprovals: [],
      invalidationIds: [],
      blockingIssues: [],
      github: {
        status: "eligible",
        summary: "The document has a mapped repository and no unresolved publish-prep blockers.",
        repository: {
          owner: "harness-docs",
          name: "northstar-docs",
          defaultBranch: "main",
          installationId: 1077,
        },
        missingCapabilities: [],
      },
    }),
    lifecycle: {
      status: "approved",
      createdAt: "2026-02-14T10:00:00Z",
      updatedAt: "2026-03-26T18:10:00Z",
      review: createReviewState({
        status: "approved",
        approvalState: "approved",
        requestedAt: "2026-03-18T09:00:00Z",
        requestedByMembershipId: "mbr_northstar_alex",
        lastReviewedAt: "2026-03-20T13:00:00Z",
        lastReviewedByMembershipId: "mbr_northstar_alex",
        approvedAt: "2026-03-20T13:00:00Z",
        approverIds: ["apr_northstar_policy_lead"],
        freshness: {
          status: "current",
          evaluatedAt: "2026-03-27T05:40:00Z",
          evaluatedByMembershipId: "mbr_northstar_alex",
          rationaleRequired: false,
          summary: "The policy document is the current publish authority source.",
          reasons: [],
          invalidations: [],
        },
      }),
      activeEditLock: null,
    },
  },
  {
    id: "doc_northstar_prd_release",
    workspaceId: "ws_northstar",
    title: "Release Readiness Hub",
    slug: "release-readiness-hub",
    type: "PRD",
    ownerMembershipId: "mbr_northstar_mina",
    createdByMembershipId: "mbr_northstar_mina",
    templateId: "tpl_prd_system",
    aiDraftSuggestionIds: ["ai_northstar_prd_approvers"],
    commentThreadIds: ["thread_northstar_prd_scope"],
    markdownSource: `# Release Readiness Hub

## Scope
Coordinate approvals, stale rationale, and final publish decisions across linked docs.`,
    mentions: [],
    linkedDocumentIds: ["doc_northstar_policy_release"],
    prePublication: createPrePublicationState({
      readiness: "blocked",
      summary:
        "The PRD is stale and lacks the required rationale capture, so it is not yet eligible for GitHub publication.",
      evaluatedAt: "2026-03-27T05:35:00Z",
      evaluatedByMembershipId: "mbr_northstar_alex",
      publishRecordId: "pub_northstar_release_20260327",
      stalePublishAllowed: true,
      staleRationaleRequired: true,
      unresolvedApprovalIds: ["apr_northstar_prd_lead"],
      unresolvedApprovals: [
        createUnresolvedApprovalSnapshot({
          id: "unresolved_northstar_prd_lead_pending",
          status: "pending",
          documentId: "doc_northstar_prd_release",
          label: "Lead approval remains pending",
          authority: "lead",
          summary:
            "The lead approval is still open after release policy changes invalidated the prior approval assumptions.",
          requiredAction:
            "Restore or re-issue the lead decision in-app, or disclose the pending approval in the publish record.",
          approvalId: "apr_northstar_prd_lead",
          membershipId: "mbr_northstar_alex",
          invalidationIds: ["inv_northstar_prd_policy"],
        }),
      ],
      invalidationIds: ["inv_northstar_prd_policy"],
      blockingIssues: [
        {
          id: "prepub_northstar_prd_rationale",
          kind: "stale_rationale_required",
          severity: "blocking",
          label: "Stale rationale is still missing",
          summary:
            "The document may be published while stale, but only after rationale is captured and attached to the pre-publication record.",
          requiredAction: "Record the publish rationale before enabling GitHub automation.",
          relatedApprovalIds: ["apr_northstar_prd_lead"],
          relatedInvalidationIds: ["inv_northstar_prd_policy"],
        },
        {
          id: "prepub_northstar_prd_invalidated",
          kind: "approval_invalidated",
          severity: "warning",
          label: "Lead approval context was invalidated",
          summary:
            "The linked policy update changed approver authority assumptions after review started.",
          requiredAction:
            "Either restore the approval in-app or publish with the unresolved invalidation disclosed.",
          relatedApprovalIds: ["apr_northstar_prd_lead"],
          relatedInvalidationIds: ["inv_northstar_prd_policy"],
        },
      ],
      github: {
        status: "not_eligible",
        summary:
          "GitHub publish remains disabled until the app records the required stale rationale for this document.",
        repository: {
          owner: "harness-docs",
          name: "northstar-docs",
          defaultBranch: "main",
          installationId: 1077,
        },
        missingCapabilities: [],
      },
    }),
    lifecycle: {
      status: "in_review",
      createdAt: "2026-03-09T08:45:00Z",
      updatedAt: "2026-03-26T22:05:00Z",
      review: createReviewState({
        status: "review_requested",
        approvalState: "pending",
        requestedAt: "2026-03-26T21:50:00Z",
        requestedByMembershipId: "mbr_northstar_mina",
        lastReviewedAt: "2026-03-26T22:05:00Z",
        lastReviewedByMembershipId: "mbr_northstar_mina",
        approverIds: ["apr_northstar_prd_lead"],
        freshness: {
          status: "stale",
          evaluatedAt: "2026-03-27T05:35:00Z",
          evaluatedByMembershipId: "mbr_northstar_alex",
          staleSince: "2026-03-26T18:10:00Z",
          rationaleRequired: true,
          summary:
            "The linked release policy changed after review started, so publish requires stale rationale and visible unresolved invalidations.",
          reasons: ["linked_document_updated", "approval_invalidated"],
          invalidations: [
            {
              id: "inv_northstar_prd_policy",
              workspaceId: "ws_northstar",
              documentId: "doc_northstar_prd_release",
              sourceDocumentId: "doc_northstar_policy_release",
              reason: "approval_invalidated",
              summary:
                "Release policy updates changed the approver authority assumptions for this PRD.",
              detectedAt: "2026-03-27T05:35:00Z",
              affectsApprovalIds: ["apr_northstar_prd_lead"],
              requiresReviewRequest: false,
            },
          ],
        },
      }),
      activeEditLock: null,
    },
  },
  {
    id: "doc_northstar_tech_dependencies",
    workspaceId: "ws_northstar",
    title: "Dependency Review Spec",
    slug: "dependency-review-spec",
    type: "Technical Spec",
    ownerMembershipId: "mbr_northstar_alex",
    createdByMembershipId: "mbr_northstar_alex",
    templateId: "tpl_tech_spec_system",
    aiDraftSuggestionIds: [],
    commentThreadIds: [],
    markdownSource: `# Dependency Review Spec

## Goal
Represent linked document invalidations and outbound webhook notifications in the client.`,
    mentions: [],
    linkedDocumentIds: ["doc_northstar_policy_release"],
    prePublication: createPrePublicationState({
      readiness: "blocked",
      summary:
        "The spec has not entered review and still needs a fresh review request before it can participate in publish automation.",
      evaluatedAt: "2026-03-27T05:30:00Z",
      evaluatedByMembershipId: "mbr_northstar_alex",
      publishRecordId: null,
      stalePublishAllowed: false,
      staleRationaleRequired: true,
      unresolvedApprovalIds: [],
      unresolvedApprovals: [
        createUnresolvedApprovalSnapshot({
          id: "unresolved_northstar_tech_lead_missing",
          status: "missing",
          documentId: "doc_northstar_tech_dependencies",
          label: "Required lead approval has not been assigned",
          authority: "lead",
          summary: "No app-native lead approval request exists yet for the stale dependency spec.",
          requiredAction:
            "Assign and request the required lead approval before attempting GitHub publication.",
          approvalId: null,
          membershipId: null,
          invalidationIds: ["inv_northstar_tech_prd"],
        }),
      ],
      invalidationIds: ["inv_northstar_tech_prd"],
      blockingIssues: [
        {
          id: "prepub_northstar_tech_review_request",
          kind: "review_request_required",
          severity: "blocking",
          label: "A review request is required before publish",
          summary: "The document became stale before any approval request was sent.",
          requiredAction:
            "Send a new review request and capture approvers before preparing a publish record.",
          relatedApprovalIds: [],
          relatedInvalidationIds: ["inv_northstar_tech_prd"],
        },
        {
          id: "prepub_northstar_tech_missing_approval",
          kind: "approval_missing",
          severity: "blocking",
          label: "Required lead approval is missing",
          summary:
            "The publish flow cannot preserve an approval decision because no required lead approver has been requested yet.",
          requiredAction:
            "Assign the lead approver and create the in-app approval request before preparing the publish batch.",
          relatedApprovalIds: [],
          relatedInvalidationIds: ["inv_northstar_tech_prd"],
        },
      ],
      github: {
        status: "not_eligible",
        summary:
          "GitHub publish is blocked because the app has not captured a review and approval snapshot for the stale draft.",
        repository: {
          owner: "harness-docs",
          name: "northstar-docs",
          defaultBranch: "main",
          installationId: 1077,
        },
        missingCapabilities: [],
      },
    }),
    lifecycle: {
      status: "draft",
      createdAt: "2026-03-12T14:00:00Z",
      updatedAt: "2026-03-25T17:20:00Z",
      review: createReviewState({
        status: "idle",
        approvalState: "not_requested",
        approverIds: [],
        freshness: {
          status: "stale",
          evaluatedAt: "2026-03-27T05:30:00Z",
          evaluatedByMembershipId: "mbr_northstar_alex",
          staleSince: "2026-03-26T22:05:00Z",
          rationaleRequired: true,
          summary:
            "The linked PRD was updated after this draft, so the spec is stale before any new review request is sent.",
          reasons: ["linked_document_updated", "publish_evaluation_pending"],
          invalidations: [
            {
              id: "inv_northstar_tech_prd",
              workspaceId: "ws_northstar",
              documentId: "doc_northstar_tech_dependencies",
              sourceDocumentId: "doc_northstar_prd_release",
              reason: "linked_document_updated",
              summary:
                "Release readiness scope changed after the dependency spec was last updated.",
              detectedAt: "2026-03-27T05:30:00Z",
              affectsApprovalIds: [],
              requiresReviewRequest: true,
            },
          ],
        },
      }),
      activeEditLock: null,
    },
  },
];

const northstarTemplates: DocumentTemplate[] = [
  {
    ...horizonTemplates[0],
    workspaceId: "ws_northstar",
    createdByMembershipId: "mbr_northstar_alex",
    authoringContext: {
      ...horizonTemplates[0].authoringContext,
      workspaceId: "ws_northstar",
      currentUserMembershipId: "mbr_northstar_alex",
    },
  },
  {
    ...horizonTemplates[1],
    workspaceId: "ws_northstar",
    createdByMembershipId: "mbr_northstar_alex",
    authoringContext: {
      ...horizonTemplates[1].authoringContext,
      workspaceId: "ws_northstar",
      currentUserMembershipId: "mbr_northstar_alex",
    },
  },
  {
    ...horizonTemplates[2],
    workspaceId: "ws_northstar",
    createdByMembershipId: "mbr_northstar_alex",
    authoringContext: {
      ...horizonTemplates[2].authoringContext,
      workspaceId: "ws_northstar",
      currentUserMembershipId: "mbr_northstar_alex",
    },
  },
  {
    id: "tpl_policy_system",
    workspaceId: "ws_northstar",
    name: "Release Governance Policy",
    description:
      "Workspace-customized policy template for release readiness and stale publish authority.",
    documentType: "Policy/Decision",
    source: "workspace",
    version: 2,
    createdByMembershipId: "mbr_northstar_alex",
    authoringContext: {
      workspaceId: "ws_northstar",
      currentDocumentId: null,
      templateId: "tpl_policy_system",
      currentUserMembershipId: "mbr_northstar_alex",
      activeArea: "editor",
      intent: "create_document",
      linkedDocumentIds: [],
      invalidatedByDocumentIds: [],
      referenceDocumentIds: ["doc_northstar_prd_release"],
    },
    sections: [
      {
        id: "policy_position",
        title: "Current Position",
        kind: "decision",
        summary: "State the governing release decision.",
        required: true,
        defaultMarkdown: "## Current Position\nState the current release stance.",
        guidance: [
          "Keep the decision binary and easy to restore.",
          "Tie it to app-native authority.",
        ],
        linkedDocumentTypeHints: ["PRD", "Technical Spec"],
      },
      {
        id: "policy_capture",
        title: "Required Capture",
        kind: "checklist",
        summary: "List what must be recorded when publish proceeds under stale conditions.",
        required: true,
        defaultMarkdown: "## Required Capture\n- Rationale\n- Unresolved invalidations",
        guidance: [
          "Include publish rationale and affected approvers.",
          "Reflect what the app must preserve.",
        ],
        linkedDocumentTypeHints: ["PRD"],
      },
    ],
    lifecycle: {
      status: "active",
      createdAt: "2026-02-14T09:30:00Z",
      updatedAt: "2026-03-20T12:45:00Z",
      publishedAt: "2026-03-20T13:10:00Z",
      lastPublishedCommitSha: "c92ed01",
    },
  },
];

const northstarAIDraftSuggestions: AIDraftSuggestion[] = [
  {
    id: "ai_northstar_prd_approvers",
    workspaceId: "ws_northstar",
    documentId: "doc_northstar_prd_release",
    templateId: "tpl_prd_system",
    provider: "Claude",
    kind: "approver_suggestions",
    summary: "Suggested approvers based on linked policy and dependency documents.",
    promptLabel: "Suggest approvers",
    authoringContext: {
      workspaceId: "ws_northstar",
      currentDocumentId: "doc_northstar_prd_release",
      templateId: "tpl_prd_system",
      currentUserMembershipId: "mbr_northstar_mina",
      activeArea: "ai",
      intent: "resolve_review",
      linkedDocumentIds: ["doc_northstar_policy_release"],
      invalidatedByDocumentIds: ["doc_northstar_policy_release"],
      referenceDocumentIds: ["doc_northstar_policy_release", "doc_northstar_tech_dependencies"],
    },
    sections: [
      {
        sectionId: "approver_suggestions",
        title: "Approver Suggestions",
        markdown:
          "- Lead approver for stale publish authority\n- Technical reviewer for dependency invalidation coverage",
        rationale:
          "Derived from linked policy and spec ownership rather than GitHub collaborator state.",
      },
    ],
    suggestedLinkedDocumentIds: ["doc_northstar_policy_release", "doc_northstar_tech_dependencies"],
    lifecycle: {
      status: "proposed",
      createdAt: "2026-03-26T21:35:00Z",
      updatedAt: "2026-03-26T21:35:00Z",
      generatedAt: "2026-03-26T21:35:00Z",
    },
  },
];

const northstarPublishRecords: PublishRecord[] = [
  createPublishRecordWithPreflight(
    {
      id: "pub_northstar_release_20260327",
      workspaceId: "ws_northstar",
      source: {
        kind: "workspace",
        workspaceId: "ws_northstar",
        documentId: null,
        templateId: null,
        label: "Northstar workspace publish batch",
        changeSummary:
          "Publishes release-readiness documents and policy template changes from the workspace source of truth.",
      },
      currentStageId: "approvals",
      memoSuggestionId: null,
      staleRationale:
        "The release PRD and dependency spec remain publishable while the updated policy invalidation is surfaced and the pending lead approval remains unresolved in the app-native approval log.",
      staleRationaleEntries: [
        {
          id: "pub_northstar_rationale_prd_policy",
          label: "PRD stale publish rationale",
          summary:
            "The release PRD can still publish because the policy invalidation is visible and the lead approval remains unresolved inside the app snapshot.",
          status: "current",
          recordedAt: "2026-03-27T05:42:00Z",
          recordedByMembershipId: "mbr_northstar_alex",
          relatedDocumentId: "doc_northstar_prd_release",
          relatedInvalidationId: "inv_northstar_prd_policy",
          relatedApprovalId: "apr_northstar_prd_lead",
        },
        {
          id: "pub_northstar_rationale_tech_dependencies",
          label: "Dependency spec stale publish rationale",
          summary:
            "The dependency spec remains publishable because its upstream PRD change is captured as an unresolved invalidation in the batch.",
          status: "current",
          recordedAt: "2026-03-27T05:43:00Z",
          recordedByMembershipId: "mbr_northstar_alex",
          relatedDocumentId: "doc_northstar_tech_dependencies",
          relatedInvalidationId: "inv_northstar_tech_prd",
        },
        {
          id: "pub_northstar_rationale_old_policy_only",
          label: "Policy-only rationale draft",
          summary:
            "A first pass recorded stale publication as if only the policy document had changed.",
          status: "outdated",
          recordedAt: "2026-03-27T05:40:00Z",
          recordedByMembershipId: "mbr_northstar_alex",
          relatedDocumentId: "doc_northstar_policy_release",
          supersededAt: "2026-03-27T05:43:00Z",
          supersededByDocumentId: "doc_northstar_prd_release",
          supersededReason:
            "Later evaluation showed the publish batch also needed PRD and dependency-spec rationale.",
        },
      ],
      stages: [
        {
          id: "scope",
          title: "Select publish scope",
          description:
            "Bundle changed documents and customized templates for a single workspace publish.",
          status: "complete",
          primaryAction: "Review publish set",
          guidance: [
            "Workspace templates publish alongside documents when versioned changes exist.",
            "One workspace maps to one docs repository.",
          ],
        },
        {
          id: "freshness",
          title: "Evaluate stale state",
          description:
            "Check linked policy invalidations and identify which artifacts require stale rationale before publish.",
          status: "complete",
          primaryAction: "Review stale artifacts",
          guidance: [
            "Freshness is evaluated at publish time, not on every edit.",
            "Record the reason stale publish proceeds.",
          ],
        },
        {
          id: "approvals",
          title: "Capture approval snapshot",
          description:
            "Record pending lead approval and any unresolved invalidations before handing off to GitHub automation.",
          status: "attention",
          primaryAction: "Freeze approval state",
          guidance: [
            "Approval authority remains inside the app.",
            "Restoration is a lead-level action, not a GitHub permission.",
          ],
        },
        {
          id: "memo",
          title: "Draft publish memo",
          description:
            "Summarize stale rationale, linked document impact, and notification recipients for the publish event.",
          status: "ready",
          primaryAction: "Write publish memo",
          guidance: [
            "AI memo drafting is optional.",
            "The memo should explain unresolved approvals and invalidations.",
          ],
        },
        {
          id: "github",
          title: "Create branch, commit, and PR",
          description:
            "After the approval snapshot is captured, the publish action creates the repo branch, commit, and pull request.",
          status: "pending",
          primaryAction: "Await publish readiness",
          guidance: [
            "GitHub publication happens after app-native review capture.",
            "Webhook notifications are queued from the publish batch.",
          ],
        },
      ],
      artifacts: [
        {
          id: "pub_artifact_northstar_prd",
          kind: "document",
          targetId: "doc_northstar_prd_release",
          label: "Release Readiness Coverage",
          documentType: "PRD",
          changeSummary: "Tracks release-scope updates now affected by policy invalidation.",
          linkedDocumentIds: ["doc_northstar_policy_release", "doc_northstar_tech_dependencies"],
          stalenessStatus: "stale",
          unresolvedApprovalIds: ["apr_northstar_prd_lead"],
          unresolvedApprovals: [
            createUnresolvedApprovalSnapshot({
              id: "unresolved_northstar_prd_lead_pending",
              status: "pending",
              documentId: "doc_northstar_prd_release",
              label: "Lead approval remains pending",
              authority: "lead",
              summary:
                "The lead approval is still open after release policy changes invalidated the prior approval assumptions.",
              requiredAction:
                "Restore or re-issue the lead decision in-app, or disclose the pending approval in the publish record.",
              approvalId: "apr_northstar_prd_lead",
              membershipId: "mbr_northstar_alex",
              invalidationIds: ["inv_northstar_prd_policy"],
            }),
          ],
          invalidationIds: ["inv_northstar_prd_policy"],
        },
        {
          id: "pub_artifact_northstar_tech",
          kind: "document",
          targetId: "doc_northstar_tech_dependencies",
          label: "Dependency Notification Routing",
          documentType: "Technical Spec",
          changeSummary:
            "Captures outbound webhook handling and linked dependency invalidation coverage.",
          linkedDocumentIds: ["doc_northstar_prd_release"],
          stalenessStatus: "stale",
          unresolvedApprovalIds: [],
          unresolvedApprovals: [
            createUnresolvedApprovalSnapshot({
              id: "unresolved_northstar_tech_lead_missing",
              status: "missing",
              documentId: "doc_northstar_tech_dependencies",
              label: "Required lead approval has not been assigned",
              authority: "lead",
              summary:
                "No app-native lead approval request exists yet for the stale dependency spec.",
              requiredAction:
                "Assign and request the required lead approval before attempting GitHub publication.",
              approvalId: null,
              membershipId: null,
              invalidationIds: ["inv_northstar_tech_prd"],
            }),
          ],
          invalidationIds: ["inv_northstar_tech_prd"],
        },
        {
          id: "pub_artifact_northstar_template",
          kind: "template",
          targetId: "tpl_policy_system",
          label: "Release Governance Policy template",
          documentType: "Policy/Decision",
          changeSummary: "Workspace template v2 adds explicit stale-publish capture requirements.",
          linkedDocumentIds: ["doc_northstar_policy_release"],
          stalenessStatus: null,
          unresolvedApprovalIds: [],
          unresolvedApprovals: [],
          invalidationIds: [],
        },
      ],
      staleDocumentIds: ["doc_northstar_prd_release", "doc_northstar_tech_dependencies"],
      unresolvedApprovalIds: ["apr_northstar_prd_lead"],
      unresolvedApprovals: [
        createUnresolvedApprovalSnapshot({
          id: "unresolved_northstar_prd_lead_pending",
          status: "pending",
          documentId: "doc_northstar_prd_release",
          label: "Lead approval remains pending",
          authority: "lead",
          summary:
            "The lead approval is still open after release policy changes invalidated the prior approval assumptions.",
          requiredAction:
            "Restore or re-issue the lead decision in-app, or disclose the pending approval in the publish record.",
          approvalId: "apr_northstar_prd_lead",
          membershipId: "mbr_northstar_alex",
          invalidationIds: ["inv_northstar_prd_policy"],
        }),
        createUnresolvedApprovalSnapshot({
          id: "unresolved_northstar_tech_lead_missing",
          status: "missing",
          documentId: "doc_northstar_tech_dependencies",
          label: "Required lead approval has not been assigned",
          authority: "lead",
          summary: "No app-native lead approval request exists yet for the stale dependency spec.",
          requiredAction:
            "Assign and request the required lead approval before attempting GitHub publication.",
          approvalId: null,
          membershipId: null,
          invalidationIds: ["inv_northstar_tech_prd"],
        }),
      ],
      invalidationIds: ["inv_northstar_prd_policy", "inv_northstar_tech_prd"],
      notificationTargets: [
        {
          id: "pub_notify_northstar_inapp_alex",
          kind: "in_app",
          label: "Alex Han",
          membershipId: "mbr_northstar_alex",
          status: "queued",
        },
        {
          id: "pub_notify_northstar_webhook_mina",
          kind: "webhook",
          label: "Mina webhook",
          membershipId: "mbr_northstar_mina",
          destination: "https://hooks.slack.com/services/demo/northstar",
          status: "pending",
        },
      ],
      publication: {
        initiatedByMembershipId: "mbr_northstar_alex",
        repository: {
          owner: "harness-docs",
          name: "northstar-docs",
          defaultBranch: "main",
          baseBranch: "main",
          branchName: "publish/2026-03-27-release-readiness-batch",
          installationId: 1064,
        },
        commit: {
          sha: null,
          message: "docs: publish release readiness policy and dependency updates",
          authoredByMembershipId: "mbr_northstar_alex",
          authoredAt: null,
        },
        pullRequest: {
          number: null,
          title: "Publish Northstar release readiness updates",
          url: null,
          openedByMembershipId: null,
          openedAt: null,
        },
      },
      lifecycle: {
        status: "draft",
        createdAt: "2026-03-27T05:40:00Z",
        updatedAt: "2026-03-27T05:50:00Z",
        validatedAt: "2026-03-27T05:44:00Z",
      },
    },
    northstarDocuments,
  ),
];

export const mockWorkspaceGraphs: WorkspaceGraph[] = [
  {
    workspace: {
      id: "ws_horizon",
      name: "Horizon",
      slug: "horizon",
      description:
        "Core product workspace covering roadmap PRDs, UX flows, technical specs, and policy decisions.",
      docsRepository: {
        owner: "harness-docs",
        name: "horizon-docs",
        defaultBranch: "main",
        installationId: 1042,
      },
      createdByUserId: mockUser.id,
      leadMembershipId: "mbr_horizon_mina",
      membershipIds: horizonMemberships.map((membership) => membership.id),
      documentIds: horizonDocuments.map((document) => document.id),
      templateIds: [
        "tpl_prd_system",
        "tpl_ux_flow_system",
        "tpl_tech_spec_system",
        "tpl_policy_system",
      ],
      lifecycle: {
        status: "active",
        createdAt: "2026-02-03T09:00:00Z",
        updatedAt: "2026-03-27T08:55:00Z",
        provisionedAt: "2026-02-03T09:08:00Z",
        lastOpenedAt: "2026-03-27T08:55:00Z",
      },
    },
    memberships: horizonMemberships,
    documents: horizonDocuments,
    approvals: horizonApprovals,
    documentLocks: [horizonActiveLock],
    commentThreads: horizonCommentThreads,
    comments: horizonComments,
    templates: horizonTemplates,
    aiDraftSuggestions: horizonAIDraftSuggestions,
    publishRecords: horizonPublishRecords,
  },
  {
    workspace: {
      id: "ws_northstar",
      name: "Northstar",
      slug: "northstar",
      description:
        "Expansion workspace focused on approvals, linked doc reviews, and release policy decisions.",
      docsRepository: {
        owner: "harness-docs",
        name: "northstar-docs",
        defaultBranch: "main",
        installationId: 1064,
      },
      createdByUserId: "usr_alex_han",
      leadMembershipId: "mbr_northstar_alex",
      membershipIds: northstarMemberships.map((membership) => membership.id),
      documentIds: northstarDocuments.map((document) => document.id),
      templateIds: [
        "tpl_prd_system",
        "tpl_ux_flow_system",
        "tpl_tech_spec_system",
        "tpl_policy_system",
      ],
      lifecycle: {
        status: "active",
        createdAt: "2026-02-01T08:00:00Z",
        updatedAt: "2026-03-27T05:50:00Z",
        provisionedAt: "2026-02-01T08:20:00Z",
        lastOpenedAt: "2026-03-26T22:10:00Z",
      },
    },
    memberships: northstarMemberships,
    documents: northstarDocuments,
    approvals: northstarApprovals,
    documentLocks: [],
    commentThreads: northstarCommentThreads,
    comments: northstarComments,
    templates: northstarTemplates,
    aiDraftSuggestions: northstarAIDraftSuggestions,
    publishRecords: northstarPublishRecords,
  },
];

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

function summarizeWorkspace(graph: WorkspaceGraph, userId: string): WorkspaceSummary {
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
    areas: workspaceAreaSummaries[graph.workspace.id] as WorkspaceSummary["areas"],
  };
}

export const mockWorkspaces: WorkspaceSummary[] = mockWorkspaceGraphs.map((graph) =>
  summarizeWorkspace(graph, mockUser.id),
);

export const mockSession = {
  user: mockUser,
  workspaces: mockWorkspaces,
  workspaceGraphs: mockWorkspaceGraphs,
  lastActiveWorkspaceId: mockWorkspaces[0]?.id ?? null,
};
