import { ArrowRight, CheckCircle2, Clock3, MessageSquareMore } from "lucide-react";
import { useClientActivityLog } from "@/components/ClientActivityLogProvider";
import { CompactPrimaryPageAction, CompactSecondaryPageAction } from "@/components/pageActions";
import { PanelCard, PanelCardHeader, PanelEmptyState, SignalPanel } from "@/components/pagePanels";
import { Badge } from "@/components/ui/badge";
import type { WorkspaceShellModel } from "../hooks/useWorkspaceShell";
import { getMemberSummaryByMembershipId } from "../view-models/memberSummaries";
import {
  EmptyStateCard,
  formatDateTime,
  statusBadgeVariant,
  translateDocumentType,
  translateLabel,
} from "./pageUtils";

export function CommentsPage({
  app,
  threads,
  onGoToDocuments,
  onGoToApprovals,
}: {
  app: WorkspaceShellModel;
  threads: Array<NonNullable<WorkspaceShellModel["activeWorkspaceGraph"]>["commentThreads"][number]>;
  onGoToDocuments: () => void;
  onGoToApprovals: () => void;
}) {
  const { logEvent } = useClientActivityLog();
  const graph = app.activeWorkspaceGraph;
  const documents = graph?.documents ?? [];
  const reviewQueue = documents
    .filter(
      (document) =>
        document.lifecycle.review.status === "review_requested" ||
        document.lifecycle.review.status === "changes_requested",
    )
    .map((document) => ({
      id: document.id,
      title: document.title,
      type: document.type,
      freshnessStatus: document.lifecycle.review.freshness.status,
      unresolvedThreadCount: (graph?.commentThreads ?? []).filter(
        (thread) => thread.documentId === document.id && thread.lifecycle.status === "open",
      ).length,
      unresolvedApprovalCount: document.prePublication.unresolvedApprovalIds.length,
      owner:
        graph ? getMemberSummaryByMembershipId(graph, document.ownerMembershipId)?.name ?? "알 수 없음" : "알 수 없음",
      updatedAt: document.lifecycle.updatedAt,
    }));
  const recentlyApproved = documents
    .filter(
      (document) =>
        document.lifecycle.review.status === "approved" ||
        document.lifecycle.status === "approved" ||
        document.lifecycle.status === "published",
    )
    .sort(
      (left, right) =>
        new Date(right.lifecycle.updatedAt).getTime() - new Date(left.lifecycle.updatedAt).getTime(),
    )
    .slice(0, 5);
  const openThreadCount = (graph?.commentThreads ?? []).filter(
    (thread) => thread.lifecycle.status === "open",
  ).length;
  const selectedDocument = app.activeDocument;

  if (!graph || documents.length === 0) {
    return (
      <EmptyStateCard
        description="리뷰 페이지는 문서가 없더라도 다음 협업 단계를 설명해야 합니다. 먼저 문서를 만들고 검토 요청을 보내면 이 화면이 워크스페이스 리뷰 큐로 바뀝니다."
        title="아직 리뷰할 문서가 없음"
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
          description="검토 요청 또는 수정 요청 상태의 문서 수입니다."
          label="검토 대기"
          value={reviewQueue.length}
        />
        <SignalPanel
          description="워크스페이스에서 아직 해결되지 않은 댓글 스레드 수입니다."
          label="열린 스레드"
          value={openThreadCount}
        />
        <SignalPanel
          description={selectedDocument ? selectedDocument.title : "문서를 선택하면 해당 문서의 대화 맥락을 함께 봅니다."}
          label="집중 문서"
          value={selectedDocument ? 1 : 0}
        />
      </section>

      <div className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
        <PanelCard>
          <PanelCardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-[var(--foreground)]">검토 대기</h2>
              <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                러버블 기준으로 리뷰 페이지는 현재 문서가 아니라 워크스페이스 리뷰 큐를 먼저 보여줍니다.
              </p>
            </div>
            <CompactSecondaryPageAction clientLog="승인 큐 보기" onClick={onGoToApprovals}>
              승인 큐 보기
            </CompactSecondaryPageAction>
          </PanelCardHeader>
          <div className="divide-y divide-[var(--border)]">
            {reviewQueue.length === 0 ? (
              <PanelEmptyState
                title="리뷰 대기 항목 없음"
                description="아직 검토 요청된 문서가 없습니다. 문서 개요에서 리뷰 요청을 만들면 이 목록이 우선순위 큐 역할을 합니다."
              />
            ) : (
              reviewQueue.map((document) => (
                <button
                  className="flex w-full items-start gap-4 px-5 py-4 text-left transition-colors hover:bg-[var(--secondary)]/55"
                  key={document.id}
                  onClick={() => {
                    logEvent({ action: "검토 대기 문서 CTA 클릭", description: document.title, source: "comments-page" });
                    app.handleDocumentSelect(document.id);
                  }}
                  type="button"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium text-[var(--foreground)]">{document.title}</p>
                      <Badge variant="outline">{translateDocumentType(document.type)}</Badge>
                      <Badge variant={statusBadgeVariant(document.freshnessStatus)}>
                        {translateLabel(document.freshnessStatus)}
                      </Badge>
                    </div>
                    <p className="mt-2 text-sm text-[var(--muted-foreground)]">
                      {document.owner} · 업데이트 {formatDateTime(document.updatedAt)}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Badge variant="secondary">열린 스레드 {document.unresolvedThreadCount}</Badge>
                      <Badge variant="secondary">미해결 승인 {document.unresolvedApprovalCount}</Badge>
                    </div>
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
                <CheckCircle2 className="size-4" />
                최근 승인됨
              </h2>
            </PanelCardHeader>
            <div className="divide-y divide-[var(--border)]">
              {recentlyApproved.length === 0 ? (
                <PanelEmptyState
                  title="최근 승인 문서 없음"
                  description="승인 완료된 문서가 생기면 리뷰 완료 흐름을 여기서 다시 추적합니다."
                />
              ) : (
                recentlyApproved.map((document) => (
                  <button
                    className="block w-full px-5 py-4 text-left transition-colors hover:bg-[var(--secondary)]/55"
                    key={document.id}
                    onClick={() => {
                      logEvent({ action: "최근 승인 문서 CTA 클릭", description: document.title, source: "comments-page" });
                      app.handleDocumentSelect(document.id);
                    }}
                    type="button"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium text-[var(--foreground)]">{document.title}</p>
                      <Badge variant="outline">{translateDocumentType(document.type)}</Badge>
                      <Badge variant={statusBadgeVariant(document.lifecycle.status)}>
                        {translateLabel(document.lifecycle.status)}
                      </Badge>
                    </div>
                    <p className="mt-2 text-sm text-[var(--muted-foreground)]">
                      업데이트 {formatDateTime(document.lifecycle.updatedAt)}
                    </p>
                  </button>
                ))
              )}
            </div>
          </PanelCard>

          <PanelCard>
            <PanelCardHeader>
              <h2 className="flex items-center gap-2 text-lg font-semibold text-[var(--foreground)]">
                <MessageSquareMore className="size-4" />
                집중 대화
              </h2>
            </PanelCardHeader>
            <div className="divide-y divide-[var(--border)]">
              {!selectedDocument ? (
                <PanelEmptyState
                  title="선택된 문서 없음"
                  description="왼쪽 리뷰 큐에서 문서를 고르면 해당 문서의 열린 스레드를 이 패널에서 바로 이어서 확인할 수 있습니다."
                />
              ) : threads.length === 0 ? (
                <PanelEmptyState
                  title="열린 스레드 없음"
                  description="현재 문서에는 열린 리뷰 스레드가 없습니다. 승인 상태를 확인하거나 샘플 스레드를 추가해 흐름을 시작할 수 있습니다."
                  actions={
                    <>
                      <CompactPrimaryPageAction
                        clientLog="샘플 스레드 추가"
                        onClick={() =>
                          app.handleCreateBlockComment(
                            selectedDocument,
                            "@reviewers 이 발행 배치에 이 오래됨 사유만으로 충분한지 확인해 주세요.",
                          )
                        }
                      >
                        샘플 스레드 추가
                      </CompactPrimaryPageAction>
                      <CompactSecondaryPageAction clientLog="승인 상태 보기" onClick={onGoToApprovals}>
                        승인 상태 보기
                      </CompactSecondaryPageAction>
                    </>
                  }
                />
              ) : (
                threads.map((thread) => (
                  <div className="px-5 py-4" key={thread.id}>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={statusBadgeVariant(thread.lifecycle.status)}>
                        {translateLabel(thread.lifecycle.status)}
                      </Badge>
                      <p className="font-medium text-[var(--foreground)]">
                        {thread.anchor.headingPath.join(" / ")}
                      </p>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">
                      {thread.anchor.excerpt}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2 text-sm text-[var(--muted-foreground)]">
                      <span>참여자 {thread.participantMembershipIds.length}명</span>
                      <span>연결 문서 {thread.linkedDocumentIds.length}개</span>
                      <span>마지막 댓글 {formatDateTime(thread.lifecycle.lastCommentAt)}</span>
                    </div>
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
