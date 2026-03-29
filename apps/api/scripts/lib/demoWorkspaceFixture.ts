export const seedTimestamps = {
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
  invitations: {
    editor: "winv_harness_editor",
  },
  invitationCodes: {
    editor: "invite-harness-docs",
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
} as const;
