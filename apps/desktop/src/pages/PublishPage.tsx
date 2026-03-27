import type { PublishAttemptResult, PublishPreflightView, StaleReasonCode } from "@harness-docs/contracts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { PublishRecord } from "../types";
import { EmptyStateCard, statusBadgeVariant } from "./pageUtils";

function getEligibilityBadgeVariant(status: PublishPreflightView["document"]["publishEligibility"]["status"]) {
  switch (status) {
    case "allowed":
      return "success";
    case "requires_rationale":
      return "warning";
    case "blocked":
      return "destructive";
  }
}

function getFreshnessBadgeVariant(status: PublishPreflightView["document"]["freshnessStatus"]) {
  switch (status) {
    case "fresh":
      return "success";
    case "stale":
    case "sync_required":
    case "validation_required":
    case "metadata_refresh_required":
      return "warning";
  }
}

export function PublishPage({
  publishRecord,
  preflight,
  preflightState,
  attemptPreview,
  rationaleDraft,
  isRationaleRequired,
  executeDisabledReason,
  onRationaleSummaryChange,
  onRationaleDetailsChange,
  onReasonCodeToggle,
  onGoToDocuments,
  onGoToEditor,
  onGoToApprovals,
  onRetryPreflight,
  onExecute,
  publishState,
}: {
  publishRecord: PublishRecord | null;
  preflight: PublishPreflightView | null;
  preflightState: {
    status: "loading" | "error" | "ready";
    error: string | null;
  };
  attemptPreview: PublishAttemptResult | null;
  rationaleDraft: {
    summary: string;
    details: string;
    acknowledgedReasonCodes: StaleReasonCode[];
  };
  isRationaleRequired: boolean;
  executeDisabledReason: string | null;
  onRationaleSummaryChange: (summary: string) => void;
  onRationaleDetailsChange: (details: string) => void;
  onReasonCodeToggle: (code: StaleReasonCode) => void;
  onGoToDocuments: () => void;
  onGoToEditor: () => void;
  onGoToApprovals: () => void;
  onRetryPreflight: () => Promise<void>;
  onExecute: () => Promise<void>;
  publishState: {
    status: "idle" | "running" | "succeeded" | "failed";
    error: string | null;
    result: {
      repository: string;
      localRepoPath: string;
      branchName: string;
      commitSha: string | null;
      pullRequestNumber: number | null;
      pullRequestUrl: string | null;
      committedFiles: string[];
      startedAt: string;
      completedAt: string;
    } | null;
  };
}) {
  if (!publishRecord) {
    return (
      <EmptyStateCard
        description="현재 워크스페이스에는 발행 배치가 없습니다. 문서를 검토하거나 승인 상태를 확인한 뒤 다시 발행 화면으로 돌아오세요."
        title="No publish batch"
        actions={
          <div className="flex flex-wrap gap-2">
            <Button onClick={onGoToDocuments} size="sm" variant="secondary">
              문서 목록 열기
            </Button>
            <Button onClick={onGoToApprovals} size="sm" variant="outline">
              승인 상태 보기
            </Button>
          </div>
        }
      />
    );
  }

  if (!preflight) {
    return (
      <EmptyStateCard
        description={
          preflightState.error ??
          "The publish route could not determine which document to evaluate for preflight."
        }
        title="No publish preflight"
        actions={
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => void onRetryPreflight()} size="sm" variant="outline">
              Retry preflight
            </Button>
            <Button onClick={onGoToDocuments} size="sm" variant="secondary">
              Open documents
            </Button>
          </div>
        }
      />
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Publish this batch</CardTitle>
            <CardDescription>
              The publish route renders batch stages together with the API-driven preflight for the
              representative document currently selected for publish.
            </CardDescription>
          </div>
          <Button disabled={executeDisabledReason !== null} onClick={() => void onExecute()}>
            {publishState.status === "running" ? "Publishing..." : "Execute publish"}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="grid gap-3 md:grid-cols-4">
          <div className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
              Representative document
            </p>
            <p className="mt-2 font-medium text-[var(--foreground)]">{preflight.document.title}</p>
          </div>
          <div className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
              Flow state
            </p>
            <div className="mt-2">
              <Badge variant="info">{preflight.currentState}</Badge>
            </div>
          </div>
          <div className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
              Eligibility
            </p>
            <div className="mt-2">
              <Badge variant={getEligibilityBadgeVariant(preflight.document.publishEligibility.status)}>
                {preflight.document.publishEligibility.status}
              </Badge>
            </div>
          </div>
          <div className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
              Freshness
            </p>
            <div className="mt-2">
              <Badge variant={getFreshnessBadgeVariant(preflight.document.freshnessStatus)}>
                {preflight.document.freshnessStatus}
              </Badge>
            </div>
          </div>
        </div>
        <div className="grid gap-3 md:grid-cols-5">
          {publishRecord.stages.map((stage) => (
            <div
              className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] p-4"
              key={stage.id}
            >
              <div className="flex items-center justify-between gap-3">
                <p className="font-medium text-[var(--foreground)]">{stage.title}</p>
                <Badge variant={statusBadgeVariant(stage.status)}>{stage.status}</Badge>
              </div>
              <p className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">
                {stage.description}
              </p>
            </div>
          ))}
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-[calc(var(--radius)+0.25rem)] border border-[var(--border)] bg-[var(--surface)] p-4">
            <p className="font-medium text-[var(--foreground)]">Stale reasons</p>
            {preflight.document.staleReasons.length === 0 ? (
              <div className="mt-2 flex flex-col gap-3">
                <p className="text-sm leading-6 text-[var(--muted-foreground)]">
                  No stale reasons were reported by the API preflight. You can review the selected
                  draft again or move back to documents to choose a different publish candidate.
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button onClick={onGoToEditor} size="sm" variant="outline">
                    Review in editor
                  </Button>
                  <Button onClick={onGoToDocuments} size="sm" variant="secondary">
                    Open documents
                  </Button>
                </div>
              </div>
            ) : (
              <div className="mt-3 flex flex-col gap-3">
                {preflight.document.staleReasons.map((reason) => (
                  <div
                    className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--card)] p-3"
                    key={reason.code}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-medium text-[var(--foreground)]">{reason.code}</p>
                      <Badge variant="warning">stale</Badge>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">
                      {reason.summary}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="rounded-[calc(var(--radius)+0.25rem)] border border-[var(--border)] bg-[var(--surface)] p-4">
            <p className="font-medium text-[var(--foreground)]">Blocking issues</p>
            {preflight.document.publishEligibility.blockingIssues.length === 0 ? (
              <div className="mt-2 flex flex-col gap-3">
                <p className="text-sm leading-6 text-[var(--muted-foreground)]">
                  No blocking issues are attached to this preflight. You can continue with publish,
                  or open approvals if you want to inspect the current review state before
                  proceeding.
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button
                    disabled={executeDisabledReason !== null}
                    onClick={() => void onExecute()}
                    size="sm"
                  >
                    Execute publish
                  </Button>
                  <Button onClick={onGoToApprovals} size="sm" variant="outline">
                    Open approvals
                  </Button>
                </div>
              </div>
            ) : (
              <div className="mt-3 flex flex-col gap-3">
                {preflight.document.publishEligibility.blockingIssues.map((issue) => (
                  <div
                    className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--card)] p-3"
                    key={`${issue.code}-${issue.summary}`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-medium text-[var(--foreground)]">{issue.code}</p>
                      <Badge variant="destructive">blocked</Badge>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">
                      {issue.summary}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">
                      Required action: {issue.requiredAction}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="rounded-[calc(var(--radius)+0.25rem)] border border-[var(--border)] bg-[var(--surface)] p-4">
          <div className="flex items-center justify-between gap-3">
            <p className="font-medium text-[var(--foreground)]">Allowed transitions</p>
            <Badge variant="outline">{preflight.allowedTransitions.length} transitions</Badge>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {preflight.allowedTransitions.length === 0 ? (
              <div className="flex flex-col gap-3">
                <p className="text-sm leading-6 text-[var(--muted-foreground)]">
                  No further transitions are available from the current state. Refresh the preflight
                  or revisit documents to change the publish input.
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button onClick={() => void onRetryPreflight()} size="sm" variant="outline">
                    Retry preflight
                  </Button>
                  <Button onClick={onGoToDocuments} size="sm" variant="secondary">
                    Open documents
                  </Button>
                </div>
              </div>
            ) : (
              preflight.allowedTransitions.map((transition) => (
                <Badge
                  className="normal-case tracking-normal"
                  key={`${transition.from}-${transition.trigger}-${transition.to}`}
                  variant="secondary"
                >
                  {transition.from} {"->"} {transition.trigger} {"->"} {transition.to}
                </Badge>
              ))
            )}
          </div>
        </div>
        {isRationaleRequired ? (
          <div className="rounded-[calc(var(--radius)+0.25rem)] border border-[var(--warning-foreground)]/20 bg-[var(--warning-soft)]/40 p-4">
            <p className="font-medium text-[var(--foreground)]">Stale rationale</p>
            <p className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">
              This document can publish, but only after the user records why stale state is
              acceptable for this PR.
            </p>
            <div className="mt-4 grid gap-4">
              <div className="grid gap-2">
                <p className="text-sm font-medium text-[var(--foreground)]">Summary</p>
                <Input
                  onChange={(event) => onRationaleSummaryChange(event.target.value)}
                  placeholder="Why is stale publish acceptable for this batch?"
                  value={rationaleDraft.summary}
                />
              </div>
              <div className="grid gap-2">
                <p className="text-sm font-medium text-[var(--foreground)]">Details</p>
                <Textarea
                  onChange={(event) => onRationaleDetailsChange(event.target.value)}
                  placeholder="Capture the tradeoff, what is stale, and why the PR may still proceed."
                  value={rationaleDraft.details}
                />
              </div>
              <div className="grid gap-2">
                <p className="text-sm font-medium text-[var(--foreground)]">Acknowledge reasons</p>
                <div className="flex flex-wrap gap-2">
                  {preflight.document.staleReasons.map((reason) => {
                    const selected = rationaleDraft.acknowledgedReasonCodes.includes(reason.code);

                    return (
                      <Button
                        key={reason.code}
                        onClick={() => onReasonCodeToggle(reason.code)}
                        size="sm"
                        type="button"
                        variant={selected ? "default" : "outline"}
                      >
                        {reason.code}
                      </Button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        ) : null}
        {attemptPreview ? (
          <div className="rounded-[calc(var(--radius)+0.25rem)] border border-[var(--border)] bg-[var(--surface)] p-4">
            <p className="font-medium text-[var(--foreground)]">Attempt preview</p>
            <div className="mt-3 flex items-center gap-3">
              <Badge
                variant={
                  attemptPreview.kind === "publish_succeeded"
                    ? "success"
                    : attemptPreview.kind === "rationale_required"
                      ? "warning"
                      : "destructive"
                }
              >
                {attemptPreview.kind}
              </Badge>
              <p className="text-sm text-[var(--muted-foreground)]">
                {attemptPreview.transition.from} {"->"} {attemptPreview.transition.trigger} {"->"}{" "}
                {attemptPreview.transition.to}
              </p>
            </div>
          </div>
        ) : null}
        {executeDisabledReason ? (
          <div className="rounded-[calc(var(--radius)+0.25rem)] border border-[var(--warning-foreground)]/20 bg-[var(--warning-soft)]/40 p-4">
            <p className="font-medium text-[var(--foreground)]">Execution gated</p>
            <p className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">
              {executeDisabledReason}
            </p>
          </div>
        ) : null}
        {publishState.status === "failed" && publishState.error ? (
          <div className="rounded-[calc(var(--radius)+0.25rem)] border border-[var(--destructive)]/20 bg-[color:color-mix(in_srgb,var(--destructive)_8%,transparent)] p-4">
            <p className="font-medium text-[var(--foreground)]">Publish failed</p>
            <p className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">
              {publishState.error}
            </p>
          </div>
        ) : null}
        {publishState.status === "succeeded" && publishState.result ? (
          <div className="rounded-[calc(var(--radius)+0.25rem)] border border-[var(--success-foreground)]/20 bg-[var(--success-soft)]/40 p-4">
            <p className="font-medium text-[var(--foreground)]">Publish succeeded</p>
            <p className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">
              Branch `{publishState.result.branchName}` prepared for repository{" "}
              {publishState.result.repository}.
            </p>
            <p className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">
              PR URL: {publishState.result.pullRequestUrl ?? "Not returned"}
            </p>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
