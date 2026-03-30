import { describe, expect, it } from "vitest";
import type { DocumentApproval } from "../types/contracts";
import {
  createWorkspaceGraphFixture,
  createWorkspaceMembershipFixture,
} from "../test/workspaceGraphFixtures";
import {
  canCurrentMembershipDecideApproval,
  hasOpenApprovalForMembership,
  pickSuggestedApprovalReviewer,
} from "./approvalActionUtils";

function createApprovalFixture(overrides: Partial<DocumentApproval> = {}): DocumentApproval {
  return {
    id: "apr-1",
    workspaceId: "ws-1",
    documentId: "doc-1",
    authority: "lead",
    source: "workspace_membership",
    membershipId: "mem-1",
    githubCandidateLogin: null,
    reviewerLabel: "Sarah Chen",
    requestedByMembershipId: "mem-2",
    decision: null,
    decisionByMembershipId: null,
    restorationByMembershipId: null,
    restoredFromApprovalId: null,
    invalidatedByDocumentId: null,
    decisionNote: null,
    lifecycle: {
      createdAt: "2026-03-29T00:00:00.000Z",
      updatedAt: "2026-03-29T00:00:00.000Z",
      state: "pending",
      requestedAt: "2026-03-29T00:00:00.000Z",
      respondedAt: null,
      invalidatedAt: null,
      restoredAt: null,
    },
    ...overrides,
  };
}

describe("approvalActionUtils", () => {
  it("prefers an active reviewer when the lead is the current membership", () => {
    const graph = createWorkspaceGraphFixture({
      memberships: [
        createWorkspaceMembershipFixture({
          id: "mem-1",
          userId: "usr_mina_cho",
          role: "Lead",
        }),
        createWorkspaceMembershipFixture({
          id: "mem-2",
          userId: "usr_sam_kim",
          role: "Reviewer",
        }),
      ],
      workspace: createWorkspaceGraphFixture().workspace,
    });

    const reviewer = pickSuggestedApprovalReviewer(graph, "mem-1");

    expect(reviewer).toEqual({
      membershipId: "mem-2",
      reviewerLabel: "Aisha Patel",
      authority: "required_reviewer",
    });
  });

  it("returns null when only the current membership is available", () => {
    const graph = createWorkspaceGraphFixture({
      memberships: [
        createWorkspaceMembershipFixture({
          id: "mem-1",
          userId: "usr_mina_cho",
          role: "Lead",
        }),
      ],
    });

    expect(pickSuggestedApprovalReviewer(graph, "mem-1")).toBeNull();
  });

  it("allows decisions only for the current reviewer on actionable states", () => {
    expect(canCurrentMembershipDecideApproval(createApprovalFixture(), "mem-1")).toBe(true);
    expect(
      canCurrentMembershipDecideApproval(createApprovalFixture({ membershipId: "mem-2" }), "mem-1"),
    ).toBe(false);
    expect(
      canCurrentMembershipDecideApproval(
        createApprovalFixture({
          lifecycle: {
            ...createApprovalFixture().lifecycle,
            state: "approved",
          },
          decision: "approved",
        }),
        "mem-1",
      ),
    ).toBe(false);
  });

  it("detects existing open approvals for the same reviewer", () => {
    expect(hasOpenApprovalForMembership([createApprovalFixture()], "mem-1")).toBe(true);
    expect(
      hasOpenApprovalForMembership(
        [
          createApprovalFixture({
            lifecycle: {
              ...createApprovalFixture().lifecycle,
              state: "approved",
            },
            decision: "approved",
          }),
        ],
        "mem-1",
      ),
    ).toBe(false);
  });
});
