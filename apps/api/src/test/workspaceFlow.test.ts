import assert from "node:assert/strict";
import { after, before, beforeEach, describe, test } from "node:test";
import { createDatabaseContext } from "@harness-docs/db";
import { createPostgresAuthSessionSource } from "../infrastructure/data/postgresAuthSessionSource.ts";
import { createPostgresWorkspaceSessionSource } from "../infrastructure/data/postgresWorkspaceSessionSource.ts";
import { createPublishGovernanceAdapter } from "../domain/publishGovernanceAdapter.ts";
import { createApiApp } from "../app.ts";
import {
  demoWorkspaceFixture,
  resetHarnessDocsDatabase,
  seedDemoWorkspace,
} from "../bootstrap/demoWorkspace.ts";

const workspaceRepositoryValidationCalls: Array<{
  repositoryOwner: string;
  repositoryName: string;
  defaultBranch: string;
  viewerGithubLogin: string;
}> = [];
const workspaceRepositoryValidationFailures = new Map<string, { code: string; message: string }>();

const { db, pool } = createDatabaseContext();
const app = createApiApp({
  dataSource: createPostgresWorkspaceSessionSource(db),
  authDataSource: createPostgresAuthSessionSource(db),
  publishGovernanceAdapter: createPublishGovernanceAdapter(),
  workspaceRepositoryValidator: {
    async validateWorkspaceRepository(input) {
      workspaceRepositoryValidationCalls.push({
        repositoryOwner: input.repositoryOwner,
        repositoryName: input.repositoryName,
        defaultBranch: input.defaultBranch,
        viewerGithubLogin: input.viewer.githubLogin,
      });

      const key = `${input.repositoryOwner}/${input.repositoryName}#${input.defaultBranch}`;
      const failure = workspaceRepositoryValidationFailures.get(key);

      if (failure) {
        return {
          ok: false as const,
          code: failure.code,
          message: failure.message,
        };
      }

      return { ok: true as const };
    },
  },
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
  workspaceRepositoryValidationCalls.length = 0;
  workspaceRepositoryValidationFailures.clear();
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
    assert.ok(openApiPayload.paths?.["/api/auth/sessions"]);
    assert.ok(openApiPayload.paths?.["/api/workspaces/{workspaceId}/invitations"]);
    assert.ok(
      openApiPayload.paths?.[
        "/api/workspaces/{workspaceId}/documents/{documentId}/publish-preflight"
      ],
    );
    assert.ok(
      openApiPayload.paths?.[
        "/api/workspaces/{workspaceId}/publish-records/{publishRecordId}/executions"
      ],
    );

    const scalarResponse = await app.request("/scalar");
    assert.equal(scalarResponse.status, 200);
    assert.ok((scalarResponse.headers.get("content-type") ?? "").includes("text/html"));

    const scalarHtml = await scalarResponse.text();
    assert.match(scalarHtml, /Harness Docs API Reference/);
    assert.ok(scalarHtml.includes("/doc"));

    const oauthStartResponse = await oauthApp.request("/api/auth/github/authorizations", {
      method: "POST",
    });
    assert.equal(oauthStartResponse.status, 200);
    assert.match(await oauthStartResponse.text(), /gha_test_attempt/);

    const oauthAttemptResponse = await oauthApp.request(
      "/api/auth/github/authorizations/gha_test_attempt",
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

    const exchanged = (await requestJson("/api/auth/sessions", {
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

    await requestJson("/api/auth/session", {
      method: "DELETE",
      sessionToken: exchanged.sessionToken,
    });

    await assert.rejects(() =>
      requestJson("/api/session/bootstrap", {
        sessionToken: exchanged.sessionToken,
      }),
    );
  });

  test("rejects workspace creation without an authenticated app session", async () => {
    const response = await app.request("/api/workspaces", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        name: "Unauthorized Workspace",
        slug: "unauthorized-workspace",
        description: "Should not be created without a session.",
      }),
    });

    assert.equal(response.status, 422);

    const payload = (await response.json()) as {
      ok: boolean;
      error: { code?: string; message?: string } | null;
    };

    assert.equal(payload.ok, false);
    assert.equal(payload.error?.code, "authentication_required");
  });

  test("accepts a workspace invitation for the authenticated viewer and refreshes bootstrap", async () => {
    const leadSession = (await requestJson("/api/auth/sessions", {
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

    const invitation = (await requestJson(
      `/api/workspaces/${demoWorkspaceFixture.workspace.id}/invitations`,
      {
        method: "POST",
        sessionToken: leadSession.sessionToken,
        body: {
          role: "Editor",
          expiresInDays: 7,
        },
      },
    )) as {
      invitation: {
        invitationCode: string;
        workspaceId: string;
        role: string;
        status: string;
      };
    };

    assert.equal(invitation.invitation.workspaceId, demoWorkspaceFixture.workspace.id);
    assert.equal(invitation.invitation.role, "Editor");
    assert.equal(invitation.invitation.status, "pending");

    const exchanged = (await requestJson("/api/auth/sessions", {
      method: "POST",
      body: {
        provider: "github_oauth",
        identity: {
          login: "bbak-jun",
          name: "박준형",
          email: "wnsguddl789@gmail.com",
        },
      },
    })) as {
      status: string;
      sessionToken: string;
      user: { id: string };
    };

    const initialBootstrap = (await requestJson("/api/session/bootstrap", {
      sessionToken: exchanged.sessionToken,
    })) as {
      workspaces: Array<{ id: string }>;
      workspaceGraphs: Array<{
        memberships: Array<{ userId: string; lifecycle: { status: string } }>;
      }>;
      lastActiveWorkspaceId: string | null;
    };

    assert.equal(initialBootstrap.workspaces.length, 0);
    assert.equal(initialBootstrap.workspaceGraphs.length, 0);
    assert.equal(initialBootstrap.lastActiveWorkspaceId, null);

    const accepted = (await requestJson("/api/workspace-invitations/acceptances", {
      method: "POST",
      sessionToken: exchanged.sessionToken,
      body: {
        invitationCode: invitation.invitation.invitationCode,
      },
    })) as {
      workspace: { id: string };
      bootstrap: {
        workspaces: Array<{ id: string }>;
        workspaceGraphs: Array<{
          workspace: { id: string };
          memberships: Array<{ userId: string; lifecycle: { status: string } }>;
        }>;
        lastActiveWorkspaceId: string | null;
      };
      lastActiveWorkspaceId: string | null;
    };

    assert.equal(accepted.workspace.id, demoWorkspaceFixture.workspace.id);
    assert.equal(accepted.lastActiveWorkspaceId, demoWorkspaceFixture.workspace.id);
    assert.equal(accepted.bootstrap.lastActiveWorkspaceId, demoWorkspaceFixture.workspace.id);
    assert.ok(
      accepted.bootstrap.workspaces.some(
        (workspace) => workspace.id === demoWorkspaceFixture.workspace.id,
      ),
    );

    const acceptedAgain = (await requestJson("/api/workspace-invitations/acceptances", {
      method: "POST",
      sessionToken: exchanged.sessionToken,
      body: {
        invitationCode: invitation.invitation.invitationCode,
      },
    })) as {
      workspace: { id: string };
      bootstrap: {
        workspaces: Array<{ id: string }>;
        lastActiveWorkspaceId: string | null;
      };
      lastActiveWorkspaceId: string | null;
    };

    assert.equal(acceptedAgain.workspace.id, demoWorkspaceFixture.workspace.id);
    assert.equal(acceptedAgain.lastActiveWorkspaceId, demoWorkspaceFixture.workspace.id);
    assert.equal(acceptedAgain.bootstrap.lastActiveWorkspaceId, demoWorkspaceFixture.workspace.id);
    assert.ok(
      acceptedAgain.bootstrap.workspaces.some(
        (workspace) => workspace.id === demoWorkspaceFixture.workspace.id,
      ),
    );

    const acceptedGraph = accepted.bootstrap.workspaceGraphs.find(
      (graph) => graph.workspace.id === demoWorkspaceFixture.workspace.id,
    );
    assert.ok(acceptedGraph);
    assert.ok(
      acceptedGraph?.memberships.some(
        (membership) =>
          membership.userId === exchanged.user.id && membership.lifecycle.status === "active",
      ),
    );

    const refreshedBootstrap = (await requestJson("/api/session/bootstrap", {
      sessionToken: exchanged.sessionToken,
    })) as {
      workspaces: Array<{ id: string }>;
      workspaceGraphs: Array<{
        workspace: { id: string };
        memberships: Array<{ userId: string; lifecycle: { status: string } }>;
      }>;
      lastActiveWorkspaceId: string | null;
    };

    assert.equal(refreshedBootstrap.lastActiveWorkspaceId, demoWorkspaceFixture.workspace.id);
    assert.ok(
      refreshedBootstrap.workspaces.some(
        (workspace) => workspace.id === demoWorkspaceFixture.workspace.id,
      ),
    );
    assert.ok(
      refreshedBootstrap.workspaceGraphs[0]?.memberships.some(
        (membership) =>
          membership.userId === exchanged.user.id && membership.lifecycle.status === "active",
      ),
    );
  });

  test("creates a workspace with explicit repo binding and refreshes bootstrap", async () => {
    const exchanged = (await requestJson("/api/auth/sessions", {
      method: "POST",
      body: {
        provider: "github_oauth",
        identity: {
          login: "repo-owner",
          name: "Repo Owner",
          email: "repo-owner@example.com",
        },
      },
    })) as { sessionToken: string; user: { id: string } };

    const created = (await requestJson("/api/workspaces", {
      method: "POST",
      sessionToken: exchanged.sessionToken,
      body: {
        name: "Repo Bound Workspace",
        slug: "repo-bound-workspace",
        description: "Workspace with explicit repository configuration.",
        docsRepoOwner: "acme-org",
        docsRepoName: "repo-bound-docs",
        docsRepoDefaultBranch: "trunk",
      },
    })) as {
      workspace: {
        id: string;
        name: string;
        repo: string;
      };
      bootstrap: {
        user: { id: string; githubLogin: string };
        workspaces: Array<{ id: string; repo: string }>;
        workspaceGraphs: Array<{
          workspace: {
            id: string;
            createdByUserId: string;
            docsRepository: {
              owner: string;
              name: string;
              defaultBranch: string;
            };
          };
        }>;
        lastActiveWorkspaceId: string | null;
      };
      lastActiveWorkspaceId: string | null;
    };

    assert.equal(created.workspace.name, "Repo Bound Workspace");
    assert.equal(created.workspace.repo, "github.com/acme-org/repo-bound-docs");
    assert.equal(created.bootstrap.user.id, exchanged.user.id);
    assert.equal(created.lastActiveWorkspaceId, created.workspace.id);
    assert.equal(created.bootstrap.lastActiveWorkspaceId, created.workspace.id);
    assert.ok(
      created.bootstrap.workspaces.some((workspace) => workspace.id === created.workspace.id),
    );

    const createdGraph = created.bootstrap.workspaceGraphs.find(
      (graph) => graph.workspace.id === created.workspace.id,
    );

    assert.ok(createdGraph);
    assert.equal(createdGraph?.workspace.createdByUserId, exchanged.user.id);
    assert.equal(createdGraph?.workspace.docsRepository.owner, "acme-org");
    assert.equal(createdGraph?.workspace.docsRepository.name, "repo-bound-docs");
    assert.equal(createdGraph?.workspace.docsRepository.defaultBranch, "trunk");
    assert.deepEqual(workspaceRepositoryValidationCalls, [
      {
        repositoryOwner: "acme-org",
        repositoryName: "repo-bound-docs",
        defaultBranch: "trunk",
        viewerGithubLogin: "repo-owner",
      },
    ]);
  });

  test("defaults workspace repo binding from the authenticated viewer", async () => {
    const exchanged = (await requestJson("/api/auth/sessions", {
      method: "POST",
      body: {
        provider: "github_oauth",
        identity: {
          login: "viewer-defaults",
          name: "Viewer Defaults",
          email: "viewer-defaults@example.com",
        },
      },
    })) as { sessionToken: string; user: { id: string; githubLogin: string } };

    const created = (await requestJson("/api/workspaces", {
      method: "POST",
      sessionToken: exchanged.sessionToken,
      body: {
        name: "Default Repo Workspace",
        slug: "default-repo-workspace",
        description: "Workspace relying on API-side repo defaults.",
      },
    })) as {
      workspace: {
        id: string;
        repo: string;
      };
      bootstrap: {
        workspaceGraphs: Array<{
          workspace: {
            id: string;
            docsRepository: {
              owner: string;
              name: string;
              defaultBranch: string;
            };
          };
        }>;
      };
    };

    const createdGraph = created.bootstrap.workspaceGraphs.find(
      (graph) => graph.workspace.id === created.workspace.id,
    );

    assert.ok(createdGraph);
    assert.equal(created.workspace.repo, "github.com/viewer-defaults/default-repo-workspace-docs");
    assert.equal(createdGraph?.workspace.docsRepository.owner, "viewer-defaults");
    assert.equal(createdGraph?.workspace.docsRepository.name, "default-repo-workspace-docs");
    assert.equal(createdGraph?.workspace.docsRepository.defaultBranch, "main");
    assert.deepEqual(workspaceRepositoryValidationCalls, []);
  });

  test("rejects explicit repo binding when GitHub repository validation fails", async () => {
    workspaceRepositoryValidationFailures.set("acme-org/missing-docs#main", {
      code: "github_repository_not_found",
      message: "GitHub repository 'acme-org/missing-docs' was not found.",
    });

    const exchanged = (await requestJson("/api/auth/sessions", {
      method: "POST",
      body: {
        provider: "github_oauth",
        identity: {
          login: "validator-user",
          name: "Validator User",
          email: "validator@example.com",
        },
      },
    })) as { sessionToken: string };

    const response = await app.request("/api/workspaces", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${exchanged.sessionToken}`,
      },
      body: JSON.stringify({
        name: "Invalid Repo Workspace",
        slug: "invalid-repo-workspace",
        description: "Should fail because the repository binding is invalid.",
        docsRepoOwner: "acme-org",
        docsRepoName: "missing-docs",
        docsRepoDefaultBranch: "main",
      }),
    });

    assert.equal(response.status, 422);

    const payload = (await response.json()) as {
      ok: boolean;
      error: { code?: string; message?: string } | null;
    };

    assert.equal(payload.ok, false);
    assert.equal(payload.error?.code, "github_repository_not_found");
    assert.equal(
      payload.error?.message,
      "GitHub repository 'acme-org/missing-docs' was not found.",
    );
  });

  test("returns contracts-driven publish preflight for a document", async () => {
    const exchanged = (await requestJson("/api/auth/sessions", {
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
    const exchanged = (await requestJson("/api/auth/sessions", {
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
      `/api/workspaces/${demoWorkspaceFixture.workspace.id}/documents/${documentId}/approvals`,
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
      `/api/workspaces/${demoWorkspaceFixture.workspace.id}/approvals/${approvalId}`,
      {
        method: "PATCH",
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
      `/api/workspaces/${demoWorkspaceFixture.workspace.id}/publish-records/${publishRecordId}/executions`,
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
