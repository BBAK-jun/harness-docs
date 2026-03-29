import type { PublishAttemptResult, PublishPreflightView, StaleReasonCode } from "@harness-docs/contracts";
import { AlertTriangle, CheckCircle2, GitBranch, ShieldCheck } from "lucide-react";
import { useClientActivityLog } from "@/components/ClientActivityLogProvider";
import {
  CompactPrimaryPageAction,
  CompactSecondaryPageAction,
} from "@/components/pageActions";
import {
  ElevatedPanel,
  InsetPanel,
  NoticePanel,
  PanelCard,
  PanelCardContent,
  PanelCardHeader,
  PanelEmptyState,
  SignalPanel,
} from "@/components/pagePanels";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CardDescription, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { WorkspaceShellModel } from "../hooks/useWorkspaceShell";
import type { PublishRecord } from "../types/contracts";
import {
  EmptyStateCard,
  statusBadgeVariant,
  translateDocumentType,
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
  app,
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
  app: WorkspaceShellModel;
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
  const { logEvent } = useClientActivityLog();
  const documents = app.activeWorkspaceGraph?.documents ?? [];
  const readyToPublish = documents.filter(
    (document) => document.lifecycle.status === "approved" || document.lifecycle.status === "published",
  );
  const staleDocs = documents.filter(
    (document) => document.lifecycle.review.freshness.status === "stale",
  );

  if (!publishRecord) {
    return (
      <div className="flex flex-col gap-5">
        <EmptyStateCard
          description="발행 화면은 비어 있더라도 끝나지 않아야 합니다. 대시보드처럼 어떤 문서가 발행 후보인지, 무엇이 아직 막혀 있는지 먼저 설명해야 합니다."
          title="비어 있는 발행 흐름"
          actions={
            <div className="flex flex-wrap gap-2">
              <CompactPrimaryPageAction clientLog="문서 목록 열기" onClick={onGoToDocuments}>
                문서 목록 열기
              </CompactPrimaryPageAction>
              <CompactSecondaryPageAction clientLog="승인 상태 보기" onClick={onGoToApprovals}>
                승인 상태 보기
              </CompactSecondaryPageAction>
            </div>
          }
        />

        <section className="grid gap-4 lg:grid-cols-2">
          <QueueCard
            title="발행 준비 완료"
            items={readyToPublish.map((document) => ({
              id: document.id,
              label: document.title,
              badges: [
                { label: translateDocumentType(document.type), variant: "outline" as const },
                { label: translateLabel(document.lifecycle.status), variant: statusBadgeVariant(document.lifecycle.status) },
              ],
            }))}
            emptyDescription="아직 승인 완료된 문서가 없습니다. 문서가 승인되면 이 패널이 바로 발행 후보 큐가 됩니다."
            onSelect={(documentId) => app.handleDocumentSelect(documentId)}
          />
          <QueueCard
            title="주의 필요"
            items={staleDocs.map((document) => ({
              id: document.id,
              label: document.title,
              badges: [
                {
                  label: translateLabel(document.lifecycle.review.freshness.status),
                  variant: statusBadgeVariant(document.lifecycle.review.freshness.status),
                },
              ],
            }))}
            emptyDescription="현재 오래됨 또는 동기화 경고를 가진 문서가 없습니다."
            onSelect={(documentId) => app.handleDocumentSelect(documentId)}
          />
        </section>
      </div>
    );
  }

  if (!preflight) {
    return (
      <EmptyStateCard
        description={
          preflightState.error ??
          "전검증 대상 문서가 아직 결정되지 않았습니다. 대시보드와 문서 개요에서 대표 문서를 고른 뒤 다시 돌아오세요."
        }
        title="발행 전검증 없음"
        actions={
          <div className="flex flex-wrap gap-2">
            <CompactSecondaryPageAction clientLog="전검증 다시 시도" onClick={() => void onRetryPreflight()}>
              전검증 다시 시도
            </CompactSecondaryPageAction>
            <CompactPrimaryPageAction clientLog="문서 열기" onClick={onGoToDocuments}>
              문서 열기
            </CompactPrimaryPageAction>
          </div>
        }
      />
    );
  }

  return (
      <div className="flex flex-col gap-5">
      {staleDocs.length > 0 ? (
        <NoticePanel
          description="러버블 발행 화면은 먼저 경고를 요약하고, 그 다음에 발행 구성과 사유 입력을 이어서 보여줍니다."
          title={`오래됨 또는 동기화 주의 문서: ${staleDocs.length}`}
          tone="warning"
        />
      ) : null}

      <section className="grid gap-3 md:grid-cols-4">
        <SummaryCard icon={<GitBranch className="size-4 text-[var(--muted-foreground)]" />} label="대표 문서" value={preflight.document.title} />
        <SummaryCard
          badge={<Badge variant="info">{translateLabel(preflight.currentState)}</Badge>}
          icon={<ShieldCheck className="size-4 text-[var(--muted-foreground)]" />}
          label="흐름 상태"
          value={translateLabel(preflight.currentState)}
        />
        <SummaryCard
          badge={
            <Badge variant={getEligibilityBadgeVariant(preflight.document.publishEligibility.status)}>
              {translateLabel(preflight.document.publishEligibility.status)}
            </Badge>
          }
          icon={<CheckCircle2 className="size-4 text-[var(--muted-foreground)]" />}
          label="발행 가능 상태"
          value={translateLabel(preflight.document.publishEligibility.status)}
        />
        <SummaryCard
          badge={
            <Badge variant={getFreshnessBadgeVariant(preflight.document.freshnessStatus)}>
              {translateLabel(preflight.document.freshnessStatus)}
            </Badge>
          }
          icon={<AlertTriangle className="size-4 text-[var(--muted-foreground)]" />}
          label="최신성"
          value={translateLabel(preflight.document.freshnessStatus)}
        />
      </section>

      <div className="grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
        <div className="flex flex-col gap-5">
          <QueueCard
            title="발행 준비 완료"
            items={readyToPublish.map((document) => ({
              id: document.id,
              label: document.title,
              badges: [
                { label: translateDocumentType(document.type), variant: "outline" as const },
                { label: translateLabel(document.lifecycle.status), variant: statusBadgeVariant(document.lifecycle.status) },
              ],
            }))}
            emptyDescription="발행 가능한 문서가 아직 없습니다."
            onSelect={(documentId) => app.handleDocumentSelect(documentId)}
          />

          <InsetPanel>
            <div className="flex items-center justify-between gap-3">
              <p className="font-medium text-[var(--foreground)]">발행 단계</p>
              <Badge variant="outline">{publishRecord.stages.length}개</Badge>
            </div>
            <div className="mt-4 grid gap-3">
              {publishRecord.stages.map((stage) => (
                <InsetPanel className="bg-[var(--card)]" key={stage.id}>
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-medium text-[var(--foreground)]">{stage.title}</p>
                    <Badge variant={statusBadgeVariant(stage.status)}>{translateLabel(stage.status)}</Badge>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">
                    {stage.description}
                  </p>
                </InsetPanel>
              ))}
            </div>
          </InsetPanel>

          <QueueCard
            title="허용된 전이"
            items={preflight.allowedTransitions.map((transition) => ({
              id: `${transition.from}-${transition.trigger}-${transition.to}`,
              label: `${translateLabel(transition.from)} -> ${translateLabel(transition.trigger)} -> ${translateLabel(transition.to)}`,
              badges: [],
            }))}
            emptyDescription="현재 상태에서 더 진행할 수 있는 전이가 없습니다."
          />
        </div>

        <PanelCard>
          <PanelCardHeader>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle>발행 설정</CardTitle>
                <CardDescription>
                  API 전검증 결과, 오래됨 사유, 실행 제한 이유를 한 화면에 모읍니다.
                </CardDescription>
              </div>
              <Button clientLog="발행 실행" disabled={executeDisabledReason !== null} onClick={() => void onExecute()}>
                {publishState.status === "running" ? "발행 중..." : "발행 실행"}
              </Button>
            </div>
          </PanelCardHeader>
          <PanelCardContent className="flex flex-col gap-5">
            <div className="grid gap-4 lg:grid-cols-2">
              <InfoPanel
                title="오래됨 사유"
                emptyDescription="API 전검증에서 오래됨 사유가 보고되지 않았습니다."
                items={preflight.document.staleReasons.map((reason) => ({
                  id: reason.code,
                  title: translateReasonCode(reason.code),
                  summary: reason.summary,
                  badgeLabel: "오래됨",
                  badgeVariant: "warning" as const,
                }))}
                primaryAction={
                  <CompactSecondaryPageAction clientLog="편집기에서 검토" onClick={onGoToEditor}>
                    편집기에서 검토
                  </CompactSecondaryPageAction>
                }
                secondaryAction={
                  <CompactPrimaryPageAction clientLog="문서 열기" onClick={onGoToDocuments}>
                    문서 열기
                  </CompactPrimaryPageAction>
                }
              />
              <InfoPanel
                title="차단 이슈"
                emptyDescription="이 전검증에는 차단 이슈가 없습니다."
                items={preflight.document.publishEligibility.blockingIssues.map((issue) => ({
                  id: `${issue.code}-${issue.summary}`,
                  title: translateReasonCode(issue.code),
                  summary: `${issue.summary} 필요한 조치: ${issue.requiredAction}`,
                  badgeLabel: "차단",
                  badgeVariant: "destructive" as const,
                }))}
                primaryAction={
                  <CompactPrimaryPageAction clientLog="발행 실행" disabled={executeDisabledReason !== null} onClick={() => void onExecute()}>
                    발행 실행
                  </CompactPrimaryPageAction>
                }
                secondaryAction={
                  <CompactSecondaryPageAction clientLog="승인 열기" onClick={onGoToApprovals}>
                    승인 열기
                  </CompactSecondaryPageAction>
                }
              />
            </div>

            {isRationaleRequired ? (
              <NoticePanel
                className="p-4"
                description="이 문서는 발행할 수 있지만, 사용자가 이 PR에서 오래된 상태를 왜 허용하는지 먼저 기록해야 합니다."
                title="오래됨 사유"
                tone="warning"
              >
              </NoticePanel>
            ) : null}

            {isRationaleRequired ? (
              <InsetPanel>
                <p className="font-medium text-[var(--foreground)]">오래됨 사유</p>
                <div className="mt-4 grid gap-4">
                  <div className="grid gap-2">
                    <p className="text-sm font-medium text-[var(--foreground)]">요약</p>
                    <Input
                      onChange={(event) => onRationaleSummaryChange(event.target.value)}
                      placeholder="이 배치에서 오래된 상태 발행을 허용하는 이유를 적어 주세요."
                      value={rationaleDraft.summary}
                    />
                  </div>
                  <div className="grid gap-2">
                    <p className="text-sm font-medium text-[var(--foreground)]">상세</p>
                    <Textarea
                      onChange={(event) => onRationaleDetailsChange(event.target.value)}
                      placeholder="어떤 항목이 오래되었는지, 어떤 트레이드오프가 있는지, 왜 PR을 계속 진행할 수 있는지 기록하세요."
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
                            clientLog={{ action: "오래됨 사유 확인 토글", description: translateReasonCode(reason.code), source: "publish-page" }}
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
              </InsetPanel>
            ) : null}

            {attemptPreview ? (
              <NoticePanel
                tone={
                  attemptPreview.kind === "publish_succeeded"
                    ? "success"
                    : attemptPreview.kind === "rationale_required"
                      ? "warning"
                      : "danger"
                }
                title="시도 미리보기"
                description={`${translateLabel(attemptPreview.transition.from)} -> ${translateLabel(attemptPreview.transition.trigger)} -> ${translateLabel(attemptPreview.transition.to)}`}
                badge={translateLabel(attemptPreview.kind)}
              />
            ) : null}

            {executeDisabledReason ? (
              <NoticePanel
                tone="warning"
                title="실행 제한됨"
                description={executeDisabledReason}
              />
            ) : null}

            {publishState.status === "failed" && publishState.error ? (
              <NoticePanel tone="danger" title="발행 실패" description={publishState.error} />
            ) : null}

            {publishState.status === "succeeded" && publishState.result ? (
              <NoticePanel
                tone="success"
                title="발행 성공"
                description={`저장소 ${publishState.result.repository}에 대해 브랜치 ${publishState.result.branchName}가 준비되었습니다. PR 주소: ${publishState.result.pullRequestUrl ?? "반환되지 않음"}`}
              />
            ) : null}
          </PanelCardContent>
        </PanelCard>
      </div>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  icon: Icon,
  badge,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  badge?: React.ReactNode;
}) {
  return <SignalPanel badge={badge} icon={Icon} label={label} value={<p className="line-clamp-2 font-medium text-[var(--foreground)]">{value}</p>} />;
}

function QueueCard({
  title,
  items,
  emptyDescription,
  onSelect,
}: {
  title: string;
  items: Array<{
    id: string;
    label: string;
    badges: Array<{ label: string; variant: "outline" | "secondary" | "success" | "warning" | "destructive" }>;
  }>;
  emptyDescription: string;
  onSelect?: (id: string) => void;
}) {
  const { logEvent } = useClientActivityLog();
  return (
    <PanelCard>
      <PanelCardHeader>
        <p className="font-medium text-[var(--foreground)]">{title}</p>
      </PanelCardHeader>
      <div className="divide-y divide-[var(--border)]">
        {items.length === 0 ? (
          <PanelEmptyState description={emptyDescription} title={`${title} 없음`} />
        ) : (
          items.map((item) =>
            onSelect ? (
              <button
                className="block w-full px-5 py-4 text-left transition-colors hover:bg-[var(--secondary)]/55"
                key={item.id}
                onClick={() => {
                  logEvent({ action: `${title} 항목 CTA 클릭`, description: item.label, source: "publish-page" });
                  onSelect(item.id);
                }}
                type="button"
              >
                <p className="font-medium text-[var(--foreground)]">{item.label}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {item.badges.map((badge) => (
                    <Badge key={`${item.id}-${badge.label}`} variant={badge.variant}>
                      {badge.label}
                    </Badge>
                  ))}
                </div>
              </button>
            ) : (
              <div className="px-5 py-4" key={item.id}>
                <p className="font-medium text-[var(--foreground)]">{item.label}</p>
              </div>
            ),
          )
        )}
      </div>
    </PanelCard>
  );
}

function InfoPanel({
  title,
  items,
  emptyDescription,
  primaryAction,
  secondaryAction,
}: {
  title: string;
  items: Array<{
    id: string;
    title: string;
    summary: string;
    badgeLabel: string;
    badgeVariant: "warning" | "destructive";
  }>;
  emptyDescription: string;
  primaryAction?: React.ReactNode;
  secondaryAction?: React.ReactNode;
}) {
  return (
    <ElevatedPanel>
      <p className="font-medium text-[var(--foreground)]">{title}</p>
      {items.length === 0 ? (
        <div className="mt-3 flex flex-col gap-3">
          <p className="text-sm leading-6 text-[var(--muted-foreground)]">{emptyDescription}</p>
          <div className="flex flex-wrap gap-2">
            {primaryAction}
            {secondaryAction}
          </div>
        </div>
      ) : (
        <div className="mt-3 flex flex-col gap-3">
          {items.map((item) => (
            <InsetPanel className="bg-[var(--card)]" key={item.id} padding="md">
              <div className="flex items-center justify-between gap-3">
                <p className="font-medium text-[var(--foreground)]">{item.title}</p>
                <Badge variant={item.badgeVariant}>{item.badgeLabel}</Badge>
              </div>
              <p className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">{item.summary}</p>
            </InsetPanel>
          ))}
        </div>
      )}
    </ElevatedPanel>
  );
}
