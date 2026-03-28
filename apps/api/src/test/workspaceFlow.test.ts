import assert from "node:assert/strict";
import { after, before, beforeEach, describe, test } from "node:test";
import { createDatabaseContext } from "@harness-docs/db";
import { createApiApp } from "@harness-docs/contracts";
import { createPostgresAuthSessionSource } from "../data/postgresAuthSessionSource.ts";
import { createPostgresWorkspaceSessionSource } from "../data/postgresWorkspaceSessionSource.ts";
import { createPublishGovernanceAdapter } from "../domain/publishGovernanceAdapter.ts";
import {
  demoWorkspaceFixture,
  resetHarnessDocsDatabase,
  seedDemoWorkspace,
} from "../bootstrap/demoWorkspace.ts";

const { db, pool } = createDatabaseContext();
const app = createApiApp({
  dataSource: createPostgresWorkspaceSessionSource(db),
  authDataSource: createPostgresAuthSessionSource(db),
  publishGovernanceAdapter: createPublishGovernanceAdapter(),
});

const oauthApp = createApiApp({
  dataSource: createPostgresWorkspaceSessionSource(db),
  authDataSource: createPostgresAuthSessionSource(db),
  gitHubOAuthDataSource: {
    async startAuthorization() {
      return {
        attemptId: "gha_test_attempt",
        authorizationUrl: "https://github.com/login/oauth/authorize?client_id=test",
        expiresAt: "2026-12-31T00:00:00.000Z",
        pollIntervalMs: 1000,
      };
    },
    async getAuthorizationAttempt(attemptId) {
      if (attemptId !== "gha_test_attempt") {
        return null;
      }

      return {
        status: "pending",
        expiresAt: "2026-12-31T00:00:00.000Z",
        completedAt: null,
        error: null,
        session: null,
      };
    },
    async completeAuthorization(input) {
      return {
        statusCode: input.error ? 400 : 200,
        html: input.error
          ? "<html><body>oauth failed</body></html>"
          : "<html><body>oauth ok</body></html>",
      };
    },
  },
  publishGovernanceAdapter: createPublishGovernanceAdapter(),
});

async function requestJson(
  path: string,
  init?: {
    sessionToken?: string;
    method?: string;
    body?: unknown;
  },
) {
  const headers: Record<string, string> = {};

  if (init?.body != null) {
    headers["content-type"] = "application/json";
  }

  if (init?.sessionToken) {
    headers.authorization = `Bearer ${init.sessionToken}`;
  }

  const response = await app.request(path, {
    method: init?.method,
    headers: Object.keys(headers).length > 0 ? headers : undefined,
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
  test("serves OpenAPI JSON and Scalar HTML", async () => {
    const openApiResponse = await app.request("/doc");
    assert.equal(openApiResponse.status, 200);

    const openApiPayload = (await openApiResponse.json()) as {
      openapi: string;
      info?: { title?: string };
      paths?: Record<string, unknown>;
    };

    assert.equal(openApiPayload.info?.title, "Harness Docs API");
    assert.ok(typeof openApiPayload.openapi === "string");
    assert.ok(openApiPayload.paths?.["/api/session/bootstrap"]);
    assert.ok(
      openApiPayload.paths?.[
        "/api/workspaces/{workspaceId}/documents/{documentId}/publish-preflight"
      ],
    );

    const scalarResponse = await app.request("/scalar");
    assert.equal(scalarResponse.status, 200);
    assert.ok((scalarResponse.headers.get("content-type") ?? "").includes("text/html"));

    const scalarHtml = await scalarResponse.text();
    assert.match(scalarHtml, /Harness Docs API Reference/);
    assert.ok(scalarHtml.includes("/doc"));

    const oauthStartResponse = await oauthApp.request("/api/auth/github/start");
    assert.equal(oauthStartResponse.status, 200);
    assert.match(await oauthStartResponse.text(), /gha_test_attempt/);

    const oauthAttemptResponse = await oauthApp.request(
      "/api/auth/github/attempts/gha_test_attempt",
    );
    assert.equal(oauthAttemptResponse.status, 200);
    assert.match(await oauthAttemptResponse.text(), /pending/);

    const oauthCallbackResponse = await oauthApp.request(
      "/api/auth/github/callback?state=gha_test_state&error=access_denied",
    );
    assert.equal(oauthCallbackResponse.status, 400);
    assert.match(await oauthCallbackResponse.text(), /oauth failed/);
  });

  test("requires an app session for bootstrap and supports exchange + sign-out", async () => {
    await assert.rejects(() => requestJson("/api/session/bootstrap"));

    const exchanged = (await requestJson("/api/auth/session/exchange", {
      method: "POST",
      body: {
        provider: "github_oauth",
        identity: {
          login: "dana-lead",
          name: "Dana Lead",
          email: "dana@example.com",
        },
      },
    })) as {
      status: string;
      sessionToken: string;
      user: { id: string };
    };

    assert.equal(exchanged.status, "authenticated");
    assert.equal(exchanged.user.id, demoWorkspaceFixture.users.lead);

    const restored = (await requestJson("/api/auth/session", {
      sessionToken: exchanged.sessionToken,
    })) as {
      status: string;
      user: { id: string } | null;
    };

    assert.equal(restored.status, "authenticated");
    assert.equal(restored.user?.id, demoWorkspaceFixture.users.lead);

    await requestJson("/api/auth/sign-out", {
      method: "POST",
      sessionToken: exchanged.sessionToken,
    });

    await assert.rejects(() =>
      requestJson("/api/session/bootstrap", {
        sessionToken: exchanged.sessionToken,
      }),
    );
  });

  test("returns contracts-driven publish preflight for a document", async () => {
    const exchanged = (await requestJson("/api/auth/session/exchange", {
      method: "POST",
      body: {
        provider: "github_oauth",
        identity: {
          login: "dana-lead",
          name: "Dana Lead",
          email: "dana@example.com",
        },
      },
    })) as { sessionToken: string };

    const result = (await requestJson(
      `/api/workspaces/${demoWorkspaceFixture.workspace.id}/documents/${demoWorkspaceFixture.documents.prd}/publish-preflight`,
      {
        sessionToken: exchanged.sessionToken,
      },
    )) as {
      preflight: {
        currentState: string;
        document: {
          id: string;
          publishEligibility: {
            status: string;
            requiresRationale: boolean;
          };
        };
        allowedTransitions: Array<{
          from: string;
          trigger: string;
          to: string;
        }>;
      };
    };

    assert.equal(result.preflight.document.id, demoWorkspaceFixture.documents.prd);
    assert.ok(
      ["ready_to_publish", "stale_requires_rationale", "blocked"].includes(
        result.preflight.currentState,
      ),
    );
    assert.ok(
      ["allowed", "requires_rationale", "blocked"].includes(
        result.preflight.document.publishEligibility.status,
      ),
    );
    assert.ok(Array.isArray(result.preflight.allowedTransitions));
  });

  test("bootstraps the workspace and executes document -> approval -> publish flow", async () => {
    const exchanged = (await requestJson("/api/auth/session/exchange", {
      method: "POST",
      body: {
        provider: "github_oauth",
        identity: {
          login: "dana-lead",
          name: "Dana Lead",
          email: "dana@example.com",
        },
      },
    })) as { sessionToken: string };

    const bootstrap = (await requestJson("/api/session/bootstrap", {
      sessionToken: exchanged.sessionToken,
    })) as {
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
        sessionToken: exchanged.sessionToken,
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
        sessionToken: exchanged.sessionToken,
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
        sessionToken: exchanged.sessionToken,
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
        sessionToken: exchanged.sessionToken,
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
        sessionToken: exchanged.sessionToken,
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
