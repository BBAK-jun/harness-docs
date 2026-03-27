import type { PublishExecutionResult } from "../domain/publishing";
import { useEffect, useMemo, useState } from "react";
import { AITaskEntryPointList } from "./AITaskEntryPointList";
import type {
  AITaskEntryPoint,
  DocumentPrePublicationReadiness,
  GitHubPublishEligibilityStatus,
  PublishPreflightStatus,
  PublishFlowStageId,
  PublishFlowStageStatus,
  PublishRecord,
  PublishStaleRationaleEntry,
  UnresolvedApprovalSnapshot,
  WorkspaceGraph,
  WorkspaceMembership,
} from "../types";

interface PublishFlowWorkspaceProps {
  workspaceGraph: WorkspaceGraph;
  aiEntryPoints: AITaskEntryPoint[];
  executionState: {
    status: "idle" | "running" | "succeeded" | "failed";
    error: string | null;
    result: PublishExecutionResult | null;
  };
  onExecutePublish: () => void;
  onLaunchAITaskEntryPoint: (entry: AITaskEntryPoint) => void;
}

const stageToneCopy: Record<PublishFlowStageStatus, string> = {
  pending: "Waiting",
  ready: "Ready",
  attention: "Needs attention",
  complete: "Captured",
};

const readinessToneCopy: Record<DocumentPrePublicationReadiness, string> = {
  ready: "Ready",
  attention_required: "Needs attention",
  blocked: "Blocked",
};

const githubEligibilityCopy: Record<GitHubPublishEligibilityStatus, string> = {
  eligible: "GitHub eligible",
  eligible_with_warnings: "GitHub eligible with warnings",
  not_eligible: "GitHub blocked",
};

const publishPreflightStatusCopy: Record<PublishPreflightStatus, string> = {
  ready: "Preflight clear",
  ready_with_warnings: "Preflight warnings",
  blocked: "Preflight blocked",
};

const unresolvedApprovalToneCopy: Record<UnresolvedApprovalSnapshot["status"], string> = {
  missing: "Missing",
  pending: "Pending",
  rejected: "Rejected",
};

function formatTimestamp(value: string | null | undefined) {
  if (!value) {
    return "Not yet recorded";
  }

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatStateLabel(value: string) {
  return value.replace(/_/g, " ");
}

function formatMembershipLabel(membership: WorkspaceMembership | null | undefined) {
  if (!membership) {
    return "Unassigned";
  }

  const name = membership.userId
    .replace(/^usr_/, "")
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

  return `${name} • ${membership.role}`;
}

function getPublishActorLabel(
  membershipId: string | null | undefined,
  memberships: WorkspaceMembership[],
) {
  if (!membershipId) {
    return "Unassigned";
  }

  return formatMembershipLabel(memberships.find((membership) => membership.id === membershipId));
}

function getPublishRecord(workspaceGraph: WorkspaceGraph): PublishRecord | null {
  return workspaceGraph.publishRecords[0] ?? null;
}

function getSelectedStageId(record: PublishRecord | null) {
  return record?.currentStageId ?? "scope";
}

function getStaleRationaleMemoFallback(entries: PublishStaleRationaleEntry[], summary: string) {
  const currentEntries = entries.filter((entry) => entry.status === "current");

  if (currentEntries.length === 0) {
    return summary;
  }

  return currentEntries.map((entry) => `${entry.label}: ${entry.summary}`).join("\n");
}

function getUnresolvedApprovalCounts(unresolvedApprovals: UnresolvedApprovalSnapshot[]) {
  return unresolvedApprovals.reduce<Record<UnresolvedApprovalSnapshot["status"], number>>(
    (counts, approval) => {
      counts[approval.status] += 1;
      return counts;
    },
    {
      missing: 0,
      pending: 0,
      rejected: 0,
    },
  );
}

export function PublishFlowWorkspace({
  workspaceGraph,
  aiEntryPoints,
  executionState,
  onExecutePublish,
  onLaunchAITaskEntryPoint,
}: PublishFlowWorkspaceProps) {
  const publishRecord = useMemo(() => getPublishRecord(workspaceGraph), [workspaceGraph]);
  const [selectedStageId, setSelectedStageId] = useState<PublishFlowStageId>(
    getSelectedStageId(publishRecord),
  );

  useEffect(() => {
    setSelectedStageId(getSelectedStageId(publishRecord));
  }, [publishRecord]);

  if (!publishRecord) {
    return (
      <section className="publish-workspace">
        <article className="detail-card">
          <p className="eyebrow">Publish Flow</p>
          <h3>No publish batch prepared</h3>
          <p className="muted">
            This workspace foundation is ready for a publish review sequence, but no app-native
            publish record exists yet.
          </p>
        </article>
      </section>
    );
  }

  const selectedStage =
    publishRecord.stages.find((stage) => stage.id === selectedStageId) ?? publishRecord.stages[0];
  const memoSuggestion = publishRecord.memoSuggestionId
    ? (workspaceGraph.aiDraftSuggestions.find(
        (suggestion) => suggestion.id === publishRecord.memoSuggestionId,
      ) ?? null)
    : null;
  const unresolvedApprovals = publishRecord.unresolvedApprovals ?? [];
  const unresolvedApprovalCounts = getUnresolvedApprovalCounts(unresolvedApprovals);
  const leadMemberships = workspaceGraph.memberships.filter(
    (membership) => membership.role === "Lead",
  );
  const invalidations = workspaceGraph.documents.flatMap((document) =>
    document.lifecycle.review.freshness.invalidations.filter((invalidation) =>
      publishRecord.invalidationIds.includes(invalidation.id),
    ),
  );
  const staleDocuments = workspaceGraph.documents.filter((document) =>
    publishRecord.staleDocumentIds.includes(document.id),
  );
  const currentRationaleEntries = publishRecord.staleRationaleEntries.filter(
    (entry) => entry.status === "current",
  );
  const outdatedRationaleEntries = publishRecord.staleRationaleEntries.filter(
    (entry) => entry.status === "outdated",
  );
  const publishAIEntryPoints = aiEntryPoints.filter((entry) =>
    entry.discoverableFrom.includes("publish_flow"),
  );
  const publishPreflight = publishRecord.publication.preflight;
  const preflightBlockingCount = publishPreflight.findings.filter(
    (finding) => finding.severity === "blocking",
  ).length;
  const preflightWarningCount = publishPreflight.findings.filter(
    (finding) => finding.severity === "warning",
  ).length;

  return (
    <section className="publish-workspace">
      <div className="publish-header">
        <article className="hero-card">
          <p className="eyebrow">Publish Flow</p>
          <h3>
            Review the workspace publish batch before branch, commit, and pull request automation
            starts.
          </h3>
          <p>
            The app captures scope, freshness, approval state, and rationale first, then hands the
            final publish action to the mapped GitHub docs repository.
          </p>

          <div className="document-summary-strip" aria-label="Publish metrics">
            <div>
              <strong>{publishRecord.artifacts.length}</strong>
              <span>Artifacts in batch</span>
            </div>
            <div>
              <strong>{publishRecord.staleDocumentIds.length}</strong>
              <span>Need stale review</span>
            </div>
            <div>
              <strong>{unresolvedApprovals.length}</strong>
              <span>Unresolved approvals</span>
            </div>
            <div>
              <strong>{publishRecord.notificationTargets.length}</strong>
              <span>Notifications queued</span>
            </div>
          </div>
        </article>

        <article className="status-card">
          <p className="eyebrow">Publish Record</p>
          <div className="note-stack">
            <p>
              Status {formatStateLabel(publishRecord.lifecycle.status)} • validated{" "}
              {formatTimestamp(publishRecord.lifecycle.validatedAt)}
            </p>
            <p>Source {publishRecord.source.label}</p>
            <p>
              Repo {publishRecord.publication.repository.owner}/
              {publishRecord.publication.repository.name}
            </p>
          </div>
        </article>
      </div>

      <div className="publish-layout">
        <aside className="detail-card publish-stage-rail">
          <div className="publish-rail-header">
            <p className="eyebrow">Screen Sequence</p>
            <h3>Review then publish</h3>
            <p className="muted">
              Each state captures information the app must preserve before GitHub publication.
            </p>
          </div>

          <div className="publish-stage-list" role="tablist" aria-label="Publish stages">
            {publishRecord.stages.map((stage, index) => (
              <button
                key={stage.id}
                aria-selected={stage.id === selectedStage.id}
                className={`publish-stage-card${stage.id === selectedStage.id ? " active" : ""}`}
                onClick={() => setSelectedStageId(stage.id)}
                role="tab"
                type="button"
              >
                <div className="document-row-topline">
                  <span className="queue-chip">Step {index + 1}</span>
                  <span className={`publish-stage-status is-${stage.status}`}>
                    {stageToneCopy[stage.status]}
                  </span>
                </div>
                <strong>{stage.title}</strong>
                <p className="muted">{stage.description}</p>
              </button>
            ))}
          </div>
        </aside>

        <div className="publish-main">
          <article className="detail-card publish-stage-detail">
            <div className="editor-pane-header">
              <div>
                <p className="eyebrow">Current State</p>
                <h3>{selectedStage.title}</h3>
              </div>
              <span className={`publish-stage-status is-${selectedStage.status}`}>
                {stageToneCopy[selectedStage.status]}
              </span>
            </div>

            <p>{selectedStage.description}</p>

            <div className="publish-guidance-list">
              {selectedStage.guidance.map((guidance) => (
                <p key={guidance} className="muted">
                  {guidance}
                </p>
              ))}
            </div>

            <div className="detail-pill">{selectedStage.primaryAction}</div>
          </article>

          {selectedStage.id === "scope" ? (
            <article className="detail-card">
              <div className="editor-pane-header">
                <div>
                  <p className="eyebrow">Included Artifacts</p>
                  <h3>Documents and templates in this publish batch</h3>
                </div>
                <span className="muted">{publishRecord.artifacts.length} selected</span>
              </div>

              <div className="publish-artifact-list">
                {publishRecord.artifacts.map((artifact) => {
                  const targetDocument =
                    artifact.kind === "document"
                      ? (workspaceGraph.documents.find(
                          (document) => document.id === artifact.targetId,
                        ) ?? null)
                      : null;
                  const prePublication = targetDocument?.prePublication ?? null;

                  return (
                    <article key={artifact.id} className="publish-artifact-card">
                      <div className="document-row-topline">
                        <span className="document-type-chip">
                          {artifact.kind === "template"
                            ? "Template"
                            : (artifact.documentType ?? "Document")}
                        </span>
                        {artifact.stalenessStatus ? (
                          <span className={`staleness-pill ${artifact.stalenessStatus}`}>
                            {artifact.stalenessStatus}
                          </span>
                        ) : null}
                      </div>
                      <strong>{artifact.label}</strong>
                      <p className="muted">{artifact.changeSummary}</p>
                      {prePublication ? (
                        <div className="note-stack">
                          <p>
                            {readinessToneCopy[prePublication.readiness]} •{" "}
                            {githubEligibilityCopy[prePublication.github.status]}
                          </p>
                          <p>{prePublication.summary}</p>
                          <p>{prePublication.blockingIssues.length} tracked publish issues</p>
                        </div>
                      ) : null}
                      <div className="document-row-meta">
                        <span>{artifact.linkedDocumentIds.length} linked docs</span>
                        <span>
                          {(artifact.unresolvedApprovals ?? []).length} unresolved approvals
                        </span>
                        <span>{artifact.invalidationIds.length} invalidations</span>
                      </div>
                    </article>
                  );
                })}
              </div>
            </article>
          ) : null}

          {selectedStage.id === "freshness" ? (
            <article className="detail-card">
              <div className="editor-pane-header">
                <div>
                  <p className="eyebrow">Freshness Snapshot</p>
                  <h3>Stale publish remains allowed, but it must be explicit</h3>
                </div>
                <span className="muted">{staleDocuments.length} stale documents</span>
              </div>

              <div className="publish-freshness-grid">
                <article className="approval-card">
                  <strong>Batch summary</strong>
                  <p className="muted">{publishRecord.staleRationale}</p>
                </article>

                <article className="approval-card">
                  <strong>Stale documents</strong>
                  <div className="note-stack">
                    {staleDocuments.map((document) => (
                      <p key={document.id}>
                        {document.title} • {document.type}
                      </p>
                    ))}
                  </div>
                </article>

                <article className="approval-card">
                  <strong>Current rationale signals</strong>
                  <div className="note-stack">
                    {currentRationaleEntries.map((entry) => (
                      <p key={entry.id}>
                        {entry.label} • recorded {formatTimestamp(entry.recordedAt)} •{" "}
                        {entry.summary}
                      </p>
                    ))}
                    {currentRationaleEntries.length === 0 ? (
                      <p className="muted">No current stale-rationale entries are recorded.</p>
                    ) : null}
                  </div>
                </article>

                <article className="approval-card">
                  <strong>Outdated rationale signals</strong>
                  <div className="note-stack">
                    {outdatedRationaleEntries.map((entry) => {
                      const supersedingDocument =
                        workspaceGraph.documents.find(
                          (document) => document.id === entry.supersededByDocumentId,
                        ) ?? null;

                      return (
                        <p key={entry.id}>
                          {entry.label} • replaced {formatTimestamp(entry.supersededAt)} by{" "}
                          {supersedingDocument?.title ?? "a linked update"} •{" "}
                          {entry.supersededReason ?? entry.summary}
                        </p>
                      );
                    })}
                    {outdatedRationaleEntries.length === 0 ? (
                      <p className="muted">No recorded rationale entries have gone stale.</p>
                    ) : null}
                  </div>
                </article>

                <article className="approval-card">
                  <strong>Linked invalidations</strong>
                  <div className="note-stack">
                    {invalidations.map((invalidation) => {
                      const sourceDocument =
                        workspaceGraph.documents.find(
                          (document) => document.id === invalidation.sourceDocumentId,
                        ) ?? null;

                      return (
                        <p key={invalidation.id}>
                          {sourceDocument?.title ?? "Linked document"} • {invalidation.summary}
                        </p>
                      );
                    })}
                  </div>
                </article>
              </div>
            </article>
          ) : null}

          {selectedStage.id === "approvals" ? (
            <article className="detail-card">
              <div className="editor-pane-header">
                <div>
                  <p className="eyebrow">Approval Snapshot</p>
                  <h3>App-native authority is preserved into the publish record</h3>
                </div>
                <span className="muted">{unresolvedApprovals.length} approvals open</span>
              </div>

              <div className="publish-approval-grid">
                <article className="approval-card">
                  <strong>Lead restoration authority</strong>
                  <div className="note-stack">
                    {leadMemberships.map((membership) => (
                      <p key={membership.id}>{formatMembershipLabel(membership)}</p>
                    ))}
                  </div>
                </article>

                <article className="approval-card">
                  <strong>Unresolved state mix</strong>
                  <div className="note-stack">
                    <p>{unresolvedApprovalCounts.missing} missing approvals</p>
                    <p>{unresolvedApprovalCounts.pending} pending approvals</p>
                    <p>{unresolvedApprovalCounts.rejected} rejected approvals</p>
                  </div>
                </article>

                <article className="approval-card">
                  <strong>Unresolved approvals</strong>
                  <div className="note-stack">
                    {unresolvedApprovals.map((approval) => {
                      const membership =
                        workspaceGraph.memberships.find(
                          (entry) => entry.id === approval.membershipId,
                        ) ?? null;
                      const document =
                        workspaceGraph.documents.find(
                          (entry) => entry.id === approval.documentId,
                        ) ?? null;

                      return (
                        <div key={approval.id} className="approval-candidate">
                          <span>
                            {approval.label} • {unresolvedApprovalToneCopy[approval.status]}
                          </span>
                          <span className="detail-pill">
                            {membership
                              ? formatMembershipLabel(membership)
                              : formatStateLabel(approval.authority)}
                          </span>
                          <p className="muted">
                            {document?.title ?? "Document"} • {approval.summary}
                          </p>
                          <p className="muted">{approval.requiredAction}</p>
                        </div>
                      );
                    })}
                    {unresolvedApprovals.length === 0 ? (
                      <p className="muted">
                        No unresolved approvals are currently attached to this publish record.
                      </p>
                    ) : null}
                  </div>
                </article>
              </div>
            </article>
          ) : null}

          {selectedStage.id === "memo" ? (
            <article className="detail-card">
              <div className="editor-pane-header">
                <div>
                  <p className="eyebrow">Publish Memo</p>
                  <h3>Rationale, AI drafting, and notifications</h3>
                </div>
                <span className="muted">
                  {memoSuggestion ? `${memoSuggestion.provider} draft attached` : "Manual draft"}
                </span>
              </div>

              <div className="publish-memo-grid">
                <article className="approval-card">
                  <strong>Memo body</strong>
                  <p className="muted">
                    {memoSuggestion?.sections[0]?.markdown ??
                      getStaleRationaleMemoFallback(
                        publishRecord.staleRationaleEntries,
                        publishRecord.staleRationale,
                      )}
                  </p>
                </article>

                <article className="approval-card">
                  <strong>Notification plan</strong>
                  <div className="approval-candidate-list">
                    {publishRecord.notificationTargets.map((target) => (
                      <div key={target.id} className="approval-candidate">
                        <span>
                          {target.label} • {target.kind === "in_app" ? "in-app" : "webhook"}
                        </span>
                        <span className="detail-pill">{target.status}</span>
                      </div>
                    ))}
                  </div>
                </article>

                <article className="approval-card">
                  <strong>AI entry points</strong>
                  <AITaskEntryPointList
                    emptyMessage="No publish-scoped AI task entry points are available for this batch yet."
                    entries={publishAIEntryPoints}
                    onLaunchEntryPoint={onLaunchAITaskEntryPoint}
                  />
                </article>
              </div>
            </article>
          ) : null}

          {selectedStage.id === "github" ? (
            <article className="detail-card">
              <div className="editor-pane-header">
                <div>
                  <p className="eyebrow">GitHub Publication</p>
                  <h3>Automation starts only after the app-side review snapshot is ready</h3>
                </div>
                <span className="muted">
                  {workspaceGraph.workspace.docsRepository.defaultBranch} base branch
                </span>
              </div>

              <div className="publish-github-grid">
                <article className="approval-card">
                  <strong>Preflight result</strong>
                  <p className="muted">
                    {publishPreflightStatusCopy[publishPreflight.status]} • {preflightBlockingCount}{" "}
                    blocking • {preflightWarningCount} warnings
                  </p>
                  <p className="muted">{publishPreflight.summary}</p>
                </article>

                <article className="approval-card">
                  <strong>1. Create branch</strong>
                  <p className="muted">
                    Use <code>{publishRecord.publication.repository.branchName}</code> from{" "}
                    <code>{publishRecord.publication.repository.baseBranch}</code> in the mapped
                    docs repository.
                  </p>
                </article>

                <article className="approval-card">
                  <strong>2. Create commit</strong>
                  <p className="muted">{publishRecord.publication.commit.message}</p>
                  <p className="muted">
                    Author{" "}
                    {getPublishActorLabel(
                      publishRecord.publication.commit.authoredByMembershipId,
                      workspaceGraph.memberships,
                    )}
                  </p>
                </article>

                <article className="approval-card">
                  <strong>3. Create pull request</strong>
                  <p className="muted">{publishRecord.publication.pullRequest.title}</p>
                  <p className="muted">
                    Initiated by{" "}
                    {getPublishActorLabel(
                      publishRecord.publication.initiatedByMembershipId,
                      workspaceGraph.memberships,
                    )}
                  </p>
                </article>

                <article className="approval-card">
                  <strong>4. Run live GitHub publish</strong>
                  <p className="muted">
                    This uses the real local GitHub adapter to clone or reuse the mapped docs
                    repository, write markdown files, commit, push, and open a pull request.
                  </p>
                  <button
                    className="primary-button"
                    disabled={executionState.status === "running"}
                    onClick={onExecutePublish}
                    type="button"
                  >
                    {executionState.status === "running" ? "Publishing..." : "Create GitHub PR"}
                  </button>
                  {executionState.status === "failed" ? (
                    <p className="muted">{executionState.error}</p>
                  ) : null}
                  {executionState.status === "succeeded" && executionState.result ? (
                    <div className="note-stack">
                      <p>
                        Branch <code>{executionState.result.branchName}</code> •{" "}
                        {executionState.result.committedFiles.length} file changes
                      </p>
                      <p className="muted">
                        Repo clone <code>{executionState.result.localRepoPath}</code>
                      </p>
                      {executionState.result.pullRequestUrl ? (
                        <a
                          className="markdown-link"
                          href={executionState.result.pullRequestUrl}
                          rel="noreferrer"
                          target="_blank"
                        >
                          Open pull request
                        </a>
                      ) : null}
                    </div>
                  ) : null}
                </article>

                <article className="approval-card">
                  <strong>Preflight findings carried into publish</strong>
                  <div className="note-stack">
                    {publishPreflight.findings.map((finding) => (
                      <p key={finding.id}>
                        {finding.label} • {finding.severity} • {finding.requiredAction}
                      </p>
                    ))}
                    {publishPreflight.findings.length === 0 ? (
                      <p className="muted">
                        No stale-rationale or approval findings remain for GitHub publication.
                      </p>
                    ) : null}
                  </div>
                </article>
              </div>
            </article>
          ) : null}
        </div>
      </div>
    </section>
  );
}
