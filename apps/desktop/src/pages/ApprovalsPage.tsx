import { ArrowRight, CheckCheck, Clock3, ShieldCheck } from "lucide-react";
import { useClientActivityLog } from "@/components/ClientActivityLogProvider";
import { CompactPrimaryPageAction, CompactSecondaryPageAction } from "@/components/pageActions";
import { PanelCard, PanelCardHeader, PanelEmptyState, SignalPanel } from "@/components/pagePanels";
import { Badge } from "@/components/ui/badge";
import type { WorkspaceShellModel } from "../hooks/useWorkspaceShell";
import {
  EmptyStateCard,
  formatDateTime,
  statusBadgeVariant,
  translateLabel,
} from "./pageUtils";

export function ApprovalsPage({
  app,
  approvals,
  onGoToDocuments,
  onGoToComments,
}: {
  app: WorkspaceShellModel;
  approvals: Array<NonNullable<WorkspaceShellModel["activeWorkspaceGraph"]>["approvals"][number]>;
  onGoToDocuments: () => void;
  onGoToComments: () => void;
}) {
  const { logEvent } = useClientActivityLog();
  const graph = app.activeWorkspaceGraph;
  const documents = graph?.documents ?? [];
  const allApprovals = graph?.approvals ?? [];
  const pendingApprovals = allApprovals.filter(
    (approval) =>
      approval.lifecycle.state === "pending" ||
      approval.lifecycle.state === "changes_requested" ||
      approval.lifecycle.state === "invalidated" ||
      approval.lifecycle.state === "not_requested",
  );
  const resolvedApprovals = allApprovals
    .filter((approval) => approval.lifecycle.state === "approved" || approval.lifecycle.state === "restored")
    .sort(
      (left, right) =>
        new Date(right.lifecycle.updatedAt).getTime() - new Date(left.lifecycle.updatedAt).getTime(),
    )
    .slice(0, 6);
  const selectedDocument = app.activeDocument;

  if (!graph || documents.length === 0) {
    return (
      <EmptyStateCard
        description="승인 화면도 빈 상태에서 끝나면 안 됩니다. 먼저 문서를 만들고 리뷰 요청을 보내면 이 페이지가 승인 큐와 차단 이슈를 집계합니다."
        title="승인 큐 없음"
        actions={
          <div className="flex flex-wrap gap-2">
            <CompactPrimaryPageAction clientLog="문서 라이브러리 열기" onClick={onGoToDocuments}>
              문서 라이브러리 열기
            </CompactPrimaryPageAction>
            <CompactSecondaryPageAction clientLog="대시보드로 이동" onClick={() => app.handleAreaChange("dashboard")}>
              대시보드로 이동
            </CompactSecondaryPageAction>
          </div>
        }
      />
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <section className="grid gap-3 lg:grid-cols-3">
        <SignalPanel
          description="현재 워크스페이스에서 아직 정리되지 않은 승인 항목 수입니다."
          label="대기 중인 승인"
          value={pendingApprovals.length}
        />
        <SignalPanel
          description="선택된 문서에 연결된 승인 항목 수입니다."
          label="집중 문서"
          value={approvals.length}
        />
        <SignalPanel
          description="현재 문서가 막힌 이유를 가장 빠르게 찾을 수 있는 unresolved approval 개수입니다."
          label="차단 신호"
          value={documents.reduce((count, document) => count + document.prePublication.unresolvedApprovalIds.length, 0)}
        />
      </section>

      <div className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
        <PanelCard>
          <PanelCardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-[var(--foreground)]">승인 큐</h2>
              <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                이 페이지는 앱 내부 권한 체계 기준으로 남은 승인자와 차단 상태를 모읍니다.
              </p>
            </div>
            <CompactSecondaryPageAction clientLog="리뷰 큐 보기" onClick={onGoToComments}>
              리뷰 큐 보기
            </CompactSecondaryPageAction>
          </PanelCardHeader>
          <div className="divide-y divide-[var(--border)]">
            {pendingApprovals.length === 0 ? (
              <PanelEmptyState
                title="남은 승인 없음"
                description="좋은 상태입니다. 새로운 리뷰 요청이 생기면 이 영역이 진행 차단 요소를 먼저 보여줍니다."
              />
            ) : (
              pendingApprovals.map((approval) => (
                <button
                  className="flex w-full items-start gap-4 px-5 py-4 text-left transition-colors hover:bg-[var(--secondary)]/55"
                  key={approval.id}
                  onClick={() => {
                    if (!approval.documentId) {
                      return;
                    }

                    logEvent({ action: "승인 큐 항목 CTA 클릭", description: approval.reviewerLabel, source: "approvals-page" });
                    app.handleDocumentSelect(approval.documentId);
                  }}
                  type="button"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium text-[var(--foreground)]">{approval.reviewerLabel}</p>
                      <Badge variant="outline">{translateLabel(approval.authority)}</Badge>
                      <Badge variant="secondary">{translateLabel(approval.source)}</Badge>
                      <Badge variant={statusBadgeVariant(approval.lifecycle.state)}>
                        {translateLabel(approval.lifecycle.state)}
                      </Badge>
                    </div>
                    <p className="mt-2 text-sm text-[var(--muted-foreground)]">
                      요청 {formatDateTime(approval.lifecycle.requestedAt)} · 결정{" "}
                      {translateLabel(approval.decision ?? "pending")}
                    </p>
                  </div>
                  <ArrowRight className="mt-1 size-4 text-[var(--muted-foreground)]" />
                </button>
              ))
            )}
          </div>
        </PanelCard>

        <div className="flex flex-col gap-5">
          <PanelCard>
            <PanelCardHeader>
              <h2 className="flex items-center gap-2 text-lg font-semibold text-[var(--foreground)]">
                <CheckCheck className="size-4" />
                최근 해결됨
              </h2>
            </PanelCardHeader>
            <div className="divide-y divide-[var(--border)]">
              {resolvedApprovals.length === 0 ? (
                <PanelEmptyState
                  title="최근 해결된 승인 없음"
                  description="승인 완료나 복원 이력이 생기면 이 패널이 최근 정리된 흐름을 보여줍니다."
                />
              ) : (
                resolvedApprovals.map((approval) => (
                  <div className="px-5 py-4" key={approval.id}>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium text-[var(--foreground)]">{approval.reviewerLabel}</p>
                      <Badge variant="outline">{translateLabel(approval.authority)}</Badge>
                      <Badge variant={statusBadgeVariant(approval.lifecycle.state)}>
                        {translateLabel(approval.lifecycle.state)}
                      </Badge>
                    </div>
                    <p className="mt-2 text-sm text-[var(--muted-foreground)]">
                      업데이트 {formatDateTime(approval.lifecycle.updatedAt)}
                    </p>
                  </div>
                ))
              )}
            </div>
          </PanelCard>

          <PanelCard>
            <PanelCardHeader>
              <h2 className="flex items-center gap-2 text-lg font-semibold text-[var(--foreground)]">
                <ShieldCheck className="size-4" />
                집중 문서
              </h2>
            </PanelCardHeader>
            <div className="divide-y divide-[var(--border)]">
              {!selectedDocument ? (
                <PanelEmptyState
                  title="선택된 문서 없음"
                  description="왼쪽 승인 큐에서 문서를 고르면 해당 문서의 승인자만 이 패널에서 더 자세히 보여줍니다."
                />
              ) : approvals.length === 0 ? (
                <PanelEmptyState
                  title="문서 승인 항목 없음"
                  description="현재 문서에는 남은 승인 항목이 없습니다. 리뷰 스레드나 문서 개요에서 다음 액션을 확인하세요."
                  actions={
                    <>
                      <CompactPrimaryPageAction clientLog="리뷰 보기" onClick={onGoToComments}>
                        리뷰 보기
                      </CompactPrimaryPageAction>
                      <CompactSecondaryPageAction clientLog="문서 목록" onClick={onGoToDocuments}>
                        문서 목록
                      </CompactSecondaryPageAction>
                    </>
                  }
                />
              ) : (
                approvals.map((approval) => (
                  <div className="px-5 py-4" key={approval.id}>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium text-[var(--foreground)]">{approval.reviewerLabel}</p>
                      <Badge variant="outline">{translateLabel(approval.authority)}</Badge>
                      <Badge variant="secondary">{translateLabel(approval.source)}</Badge>
                    </div>
                    <p className="mt-2 text-sm text-[var(--muted-foreground)]">
                      요청 {formatDateTime(approval.lifecycle.requestedAt)} · 상태{" "}
                      {translateLabel(approval.lifecycle.state)}
                    </p>
                  </div>
                ))
              )}
            </div>
          </PanelCard>
        </div>
      </div>
    </div>
  );
}
