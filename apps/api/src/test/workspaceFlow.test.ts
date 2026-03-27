import assert from "node:assert/strict";
import { after, before, beforeEach, describe, test } from "node:test";
import { createDatabaseContext } from "@harness-docs/db";
import { createApiApp } from "@harness-docs/contracts";
import { createPostgresWorkspaceSessionSource } from "../data/postgresWorkspaceSessionSource.ts";
import {
  demoWorkspaceFixture,
  resetHarnessDocsDatabase,
  seedDemoWorkspace,
} from "../bootstrap/demoWorkspace.ts";

const { db, pool } = createDatabaseContext();
const app = createApiApp({
  dataSource: createPostgresWorkspaceSessionSource(db),
});

async function requestJson(
  path: string,
  init?: {
    method?: string;
    body?: unknown;
  },
) {
  const response = await app.request(path, {
    method: init?.method,
    headers:
      init?.body != null
        ? {
            "content-type": "application/json",
          }
        : undefined,
    body: init?.body != null ? JSON.stringify(init.body) : undefined,
  });
  const payload = (await response.json()) as {
    ok: boolean;
    data: unknown;
    error: { message: string } | null;
  };

  if (!payload.ok) {
    throw new Error(payload.error?.message ?? `Request failed for ${path}`);
  }

  return payload.data;
}

before(async () => {
  await pool.query("select 1");
});

beforeEach(async () => {
  await resetHarnessDocsDatabase(db);
  await seedDemoWorkspace(db);
});

after(async () => {
  await pool.end();
});

describe("workspace flow integration", () => {
  test("bootstraps the workspace and executes document -> approval -> publish flow", async () => {
    const bootstrap = (await requestJson("/api/session/bootstrap")) as {
      user: { id: string };
      workspaces: Array<{ id: string }>;
      lastActiveWorkspaceId: string | null;
    };

    assert.equal(bootstrap.user.id, demoWorkspaceFixture.users.lead);
    assert.equal(bootstrap.workspaces.length, 1);
    assert.equal(bootstrap.workspaces[0]?.id, demoWorkspaceFixture.workspace.id);
    assert.equal(bootstrap.lastActiveWorkspaceId, demoWorkspaceFixture.workspace.id);

    const createDocumentResult = (await requestJson(
      `/api/workspaces/${demoWorkspaceFixture.workspace.id}/documents`,
      {
        method: "POST",
        body: {
          title: "Approval and Publish Integration Test",
          type: "Technical Spec",
          templateId: demoWorkspaceFixture.templates.technicalSpec,
          ownerMembershipId: demoWorkspaceFixture.memberships.lead,
          createdByMembershipId: demoWorkspaceFixture.memberships.lead,
          markdownSource: "# Approval and Publish Integration Test\n\nInitial draft body.",
          linkedDocumentIds: [demoWorkspaceFixture.documents.prd],
        },
      },
    )) as {
      document: {
        id: string;
        title: string;
        linkedDocumentIds: string[];
        lifecycle: {
          status: string;
          review: { status: string; approvalState: string };
        };
      };
    };

    const documentId = createDocumentResult.document.id;
    assert.equal(createDocumentResult.document.title, "Approval and Publish Integration Test");
    assert.equal(createDocumentResult.document.lifecycle.status, "draft");
    assert.deepEqual(createDocumentResult.document.linkedDocumentIds, [
      demoWorkspaceFixture.documents.prd,
    ]);

    const requestApprovalResult = (await requestJson(
      `/api/workspaces/${demoWorkspaceFixture.workspace.id}/documents/${documentId}/approvals/request`,
      {
        method: "POST",
        body: {
          authority: "lead",
          source: "workspace_membership",
          reviewerLabel: "Dana Lead",
          membershipId: demoWorkspaceFixture.memberships.lead,
          requestedByMembershipId: demoWorkspaceFixture.memberships.pm,
          decisionNote: "Need lead sign-off before publish.",
        },
      },
    )) as {
      approval: {
        id: string;
        lifecycle: { state: string };
      };
      workspaceGraph: {
        documents: Array<{
          id: string;
          lifecycle: { review: { status: string; approvalState: string } };
        }>;
      };
    };

    const approvalId = requestApprovalResult.approval.id;
    assert.equal(requestApprovalResult.approval.lifecycle.state, "pending");
    assert.equal(
      requestApprovalResult.workspaceGraph.documents.find((entry) => entry.id === documentId)
        ?.lifecycle.review.status,
      "review_requested",
    );

    const decideApprovalResult = (await requestJson(
      `/api/workspaces/${demoWorkspaceFixture.workspace.id}/approvals/${approvalId}/decision`,
      {
        method: "POST",
        body: {
          decision: "approved",
          decisionByMembershipId: demoWorkspaceFixture.memberships.lead,
          decisionNote: "Ready for publication.",
        },
      },
    )) as {
      approval: {
        lifecycle: { state: string };
      };
      workspaceGraph: {
        documents: Array<{
          id: string;
          lifecycle: { status: string; review: { status: string; approvalState: string } };
        }>;
      };
    };

    const approvedDocument = decideApprovalResult.workspaceGraph.documents.find(
      (entry) => entry.id === documentId,
    );
    assert.equal(decideApprovalResult.approval.lifecycle.state, "approved");
    assert.equal(approvedDocument?.lifecycle.status, "approved");
    assert.equal(approvedDocument?.lifecycle.review.approvalState, "approved");

    const createPublishRecordResult = (await requestJson(
      `/api/workspaces/${demoWorkspaceFixture.workspace.id}/publish-records`,
      {
        method: "POST",
        body: {
          source: {
            kind: "document",
            documentId,
            label: "Approval and Publish Integration Test",
            changeSummary: "publish integration flow",
          },
          initiatedByMembershipId: demoWorkspaceFixture.memberships.lead,
          artifactDocumentIds: [documentId],
          artifactTemplateIds: [],
          staleRationale: "",
        },
      },
    )) as {
      publishRecord: {
        id: string;
        lifecycle: { status: string };
        publication: { preflight: { status: string } };
      };
    };

    const publishRecordId = createPublishRecordResult.publishRecord.id;
    assert.equal(createPublishRecordResult.publishRecord.lifecycle.status, "ready_for_publish");
    assert.equal(createPublishRecordResult.publishRecord.publication.preflight.status, "ready");

    const executePublishResult = (await requestJson(
      `/api/workspaces/${demoWorkspaceFixture.workspace.id}/publish-records/${publishRecordId}/execute`,
      {
        method: "POST",
        body: {
          initiatedByMembershipId: demoWorkspaceFixture.memberships.lead,
          commitMessage: "docs: publish integration flow",
          pullRequestTitle: "docs: Approval and Publish Integration Test",
        },
      },
    )) as {
      publishRecord: {
        id: string;
        lifecycle: { status: string };
        publication: {
          commit: { sha: string | null };
          pullRequest: { number: number | null; url: string | null };
        };
      };
      execution: {
        repository: string;
        branchName: string;
        committedFiles: string[];
        commitSha: string | null;
        pullRequestNumber: number | null;
      };
      workspaceGraph: {
        documents: Array<{
          id: string;
          lifecycle: {
            lastPublishedAt: string | null;
            lastPublishedCommitSha: string | null;
          };
        }>;
      };
    };

    const publishedDocument = executePublishResult.workspaceGraph.documents.find(
      (entry) => entry.id === documentId,
    );

    assert.equal(executePublishResult.publishRecord.id, publishRecordId);
    assert.equal(executePublishResult.publishRecord.lifecycle.status, "published");
    assert.match(executePublishResult.execution.repository, /^org\/harness-docs-specs$/);
    assert.match(executePublishResult.execution.branchName, /^publish\/harness-docs\//);
    assert.ok(executePublishResult.execution.commitSha);
    assert.ok(executePublishResult.execution.pullRequestNumber);
    assert.deepEqual(executePublishResult.execution.committedFiles, [
      "documents/approval-and-publish-integration-test.md",
    ]);
    assert.equal(
      executePublishResult.publishRecord.publication.commit.sha,
      executePublishResult.execution.commitSha,
    );
    assert.equal(
      executePublishResult.publishRecord.publication.pullRequest.number,
      executePublishResult.execution.pullRequestNumber,
    );
    assert.equal(
      publishedDocument?.lifecycle.lastPublishedCommitSha,
      executePublishResult.execution.commitSha,
    );
    assert.ok(publishedDocument?.lifecycle.lastPublishedAt);
  });
});
