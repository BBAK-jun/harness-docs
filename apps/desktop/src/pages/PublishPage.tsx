import type { PublishAttemptResult, PublishPreflightView, StaleReasonCode } from "@harness-docs/contracts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { PublishRecord } from "../types";
import {
  EmptyStateCard,
  statusBadgeVariant,
  translateLabel,
  translateReasonCode,
} from "./pageUtils";

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
        title="발행 배치 없음"
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
          "발행 전검증에 사용할 문서를 결정하지 못했습니다."
        }
        title="발행 전검증 없음"
        actions={
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => void onRetryPreflight()} size="sm" variant="outline">
              전검증 다시 시도
            </Button>
            <Button onClick={onGoToDocuments} size="sm" variant="secondary">
              문서 열기
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
            <CardTitle>이 배치 발행</CardTitle>
            <CardDescription>
              발행 화면은 현재 대표 문서의 API 기반 전검증 결과와 배치 단계를 함께 보여줍니다.
            </CardDescription>
          </div>
          <Button disabled={executeDisabledReason !== null} onClick={() => void onExecute()}>
            {publishState.status === "running" ? "발행 중..." : "발행 실행"}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="grid gap-3 md:grid-cols-4">
          <div className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
              대표 문서
            </p>
            <p className="mt-2 font-medium text-[var(--foreground)]">{preflight.document.title}</p>
          </div>
          <div className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
              흐름 상태
            </p>
            <div className="mt-2">
              <Badge variant="info">{translateLabel(preflight.currentState)}</Badge>
            </div>
          </div>
          <div className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
              발행 가능 상태
            </p>
            <div className="mt-2">
              <Badge variant={getEligibilityBadgeVariant(preflight.document.publishEligibility.status)}>
                {translateLabel(preflight.document.publishEligibility.status)}
              </Badge>
            </div>
          </div>
          <div className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
              최신성
            </p>
            <div className="mt-2">
              <Badge variant={getFreshnessBadgeVariant(preflight.document.freshnessStatus)}>
                {translateLabel(preflight.document.freshnessStatus)}
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
                <Badge variant={statusBadgeVariant(stage.status)}>{translateLabel(stage.status)}</Badge>
              </div>
              <p className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">
                {stage.description}
              </p>
            </div>
          ))}
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-[calc(var(--radius)+0.25rem)] border border-[var(--border)] bg-[var(--surface)] p-4">
            <p className="font-medium text-[var(--foreground)]">stale 사유</p>
            {preflight.document.staleReasons.length === 0 ? (
              <div className="mt-2 flex flex-col gap-3">
                <p className="text-sm leading-6 text-[var(--muted-foreground)]">
                  API 전검증에서 stale 사유가 보고되지 않았습니다. 선택한 초안을 다시 검토하거나
                  문서 목록으로 돌아가 다른 발행 후보를 선택할 수 있습니다.
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button onClick={onGoToEditor} size="sm" variant="outline">
                    편집기에서 검토
                  </Button>
                  <Button onClick={onGoToDocuments} size="sm" variant="secondary">
                    문서 열기
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
                      <p className="font-medium text-[var(--foreground)]">
                        {translateReasonCode(reason.code)}
                      </p>
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
            <p className="font-medium text-[var(--foreground)]">차단 이슈</p>
            {preflight.document.publishEligibility.blockingIssues.length === 0 ? (
              <div className="mt-2 flex flex-col gap-3">
                <p className="text-sm leading-6 text-[var(--muted-foreground)]">
                  이 전검증에는 차단 이슈가 없습니다. 그대로 발행을 계속하거나, 진행 전에 현재
                  리뷰 상태를 확인하려면 승인 화면을 열 수 있습니다.
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button
                    disabled={executeDisabledReason !== null}
                    onClick={() => void onExecute()}
                    size="sm"
                  >
                    발행 실행
                  </Button>
                  <Button onClick={onGoToApprovals} size="sm" variant="outline">
                    승인 열기
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
                      <p className="font-medium text-[var(--foreground)]">
                        {translateReasonCode(issue.code)}
                      </p>
                      <Badge variant="destructive">차단</Badge>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">
                      {issue.summary}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">
                      필요한 조치: {issue.requiredAction}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="rounded-[calc(var(--radius)+0.25rem)] border border-[var(--border)] bg-[var(--surface)] p-4">
          <div className="flex items-center justify-between gap-3">
            <p className="font-medium text-[var(--foreground)]">허용된 전이</p>
            <Badge variant="outline">{preflight.allowedTransitions.length}개</Badge>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {preflight.allowedTransitions.length === 0 ? (
              <div className="flex flex-col gap-3">
                <p className="text-sm leading-6 text-[var(--muted-foreground)]">
                  현재 상태에서 더 진행할 수 있는 전이가 없습니다. 전검증을 새로고침하거나
                  문서로 돌아가 발행 입력을 바꾸세요.
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button onClick={() => void onRetryPreflight()} size="sm" variant="outline">
                    전검증 다시 시도
                  </Button>
                  <Button onClick={onGoToDocuments} size="sm" variant="secondary">
                    문서 열기
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
                  {translateLabel(transition.from)} {"->"} {translateLabel(transition.trigger)} {"->"}{" "}
                  {translateLabel(transition.to)}
                </Badge>
              ))
            )}
          </div>
        </div>
        {isRationaleRequired ? (
          <div className="rounded-[calc(var(--radius)+0.25rem)] border border-[var(--warning-foreground)]/20 bg-[var(--warning-soft)]/40 p-4">
            <p className="font-medium text-[var(--foreground)]">stale 사유</p>
            <p className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">
              이 문서는 발행할 수 있지만, 사용자가 이 PR에서 stale 상태를 왜 허용하는지
              먼저 기록해야 합니다.
            </p>
            <div className="mt-4 grid gap-4">
              <div className="grid gap-2">
                <p className="text-sm font-medium text-[var(--foreground)]">요약</p>
                <Input
                  onChange={(event) => onRationaleSummaryChange(event.target.value)}
                  placeholder="이 배치에서 stale 발행을 허용하는 이유를 적어 주세요."
                  value={rationaleDraft.summary}
                />
              </div>
              <div className="grid gap-2">
                <p className="text-sm font-medium text-[var(--foreground)]">상세</p>
                <Textarea
                  onChange={(event) => onRationaleDetailsChange(event.target.value)}
                  placeholder="어떤 항목이 stale 인지, 어떤 트레이드오프가 있는지, 왜 PR을 계속 진행할 수 있는지 기록하세요."
                  value={rationaleDraft.details}
                />
              </div>
              <div className="grid gap-2">
                <p className="text-sm font-medium text-[var(--foreground)]">사유 확인</p>
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
                        {translateReasonCode(reason.code)}
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
            <p className="font-medium text-[var(--foreground)]">시도 미리보기</p>
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
                {translateLabel(attemptPreview.kind)}
              </Badge>
              <p className="text-sm text-[var(--muted-foreground)]">
                {translateLabel(attemptPreview.transition.from)} {"->"}{" "}
                {translateLabel(attemptPreview.transition.trigger)} {"->"}{" "}
                {translateLabel(attemptPreview.transition.to)}
              </p>
            </div>
          </div>
        ) : null}
        {executeDisabledReason ? (
          <div className="rounded-[calc(var(--radius)+0.25rem)] border border-[var(--warning-foreground)]/20 bg-[var(--warning-soft)]/40 p-4">
            <p className="font-medium text-[var(--foreground)]">실행 제한됨</p>
            <p className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">
              {executeDisabledReason}
            </p>
          </div>
        ) : null}
        {publishState.status === "failed" && publishState.error ? (
          <div className="rounded-[calc(var(--radius)+0.25rem)] border border-[var(--destructive)]/20 bg-[color:color-mix(in_srgb,var(--destructive)_8%,transparent)] p-4">
            <p className="font-medium text-[var(--foreground)]">발행 실패</p>
            <p className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">
              {publishState.error}
            </p>
          </div>
        ) : null}
        {publishState.status === "succeeded" && publishState.result ? (
          <div className="rounded-[calc(var(--radius)+0.25rem)] border border-[var(--success-foreground)]/20 bg-[var(--success-soft)]/40 p-4">
            <p className="font-medium text-[var(--foreground)]">발행 성공</p>
            <p className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">
              저장소 {publishState.result.repository}에 대해 브랜치 `{publishState.result.branchName}`가 준비되었습니다.
            </p>
            <p className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">
              PR URL: {publishState.result.pullRequestUrl ?? "반환되지 않음"}
            </p>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
