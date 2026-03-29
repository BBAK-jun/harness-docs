import { FilePenLine, GitBranch, MessageSquareMore, ShieldCheck, Sparkles } from "lucide-react";
import { useClientActivityLog } from "@/components/ClientActivityLogProvider";
import { CompactPrimaryPageAction, CompactSecondaryPageAction } from "@/components/pageActions";
import {
  ElevatedPanel,
  PanelCard,
  PanelCardHeader,
  PanelEmptyState,
  SignalPanel,
} from "@/components/pagePanels";
import { Badge } from "@/components/ui/badge";
import type { WorkspaceShellModel } from "../hooks/useWorkspaceShell";
import { EmptyStateCard, formatDateTime, statusBadgeVariant, translateLabel } from "./pageUtils";
import type { DocumentOverviewView } from "../view-models/documentViews";

export function DocumentOverviewPage({
  app,
  overview,
}: {
  app: WorkspaceShellModel;
  overview: DocumentOverviewView | null;
}) {
  const { logEvent } = useClientActivityLog();
  if (!overview) {
    return (
      <EmptyStateCard
        title="문서 개요를 열 수 없음"
        description="선택된 문서가 없거나 개요에 필요한 데이터가 준비되지 않았습니다."
        actions={
          <CompactSecondaryPageAction
            clientLog="문서 목록으로 이동"
            onClick={() => app.handleAreaChange("documents")}
          >
            문서 목록으로 이동
          </CompactSecondaryPageAction>
        }
      />
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <ElevatedPanel>
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline">{overview.header.type}</Badge>
              <Badge variant="secondary">{translateLabel(overview.header.status)}</Badge>
              <Badge variant={statusBadgeVariant(overview.header.freshnessStatus)}>
                {translateLabel(overview.header.freshnessStatus)}
              </Badge>
              <Badge variant={statusBadgeVariant(overview.header.githubStatus)}>
                {translateLabel(overview.header.githubStatus)}
              </Badge>
            </div>
            <h2 className="mt-3 text-2xl font-semibold text-[var(--foreground)]">
              {overview.header.title}
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--muted-foreground)]">
              {overview.header.freshnessSummary}
            </p>
            <p className="mt-2 text-sm text-[var(--muted-foreground)]">
              담당자 {overview.header.owner?.name ?? "알 수 없음"} · 업데이트{" "}
              {formatDateTime(overview.header.updatedAt)}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <CompactPrimaryPageAction
              clientLog="문서 편집 이동"
              onClick={() => app.handleAreaChange("editor")}
            >
              <FilePenLine />
              편집
            </CompactPrimaryPageAction>
            <CompactSecondaryPageAction
              clientLog="문서 댓글 이동"
              onClick={() => app.handleAreaChange("comments")}
            >
              <MessageSquareMore />
              댓글
            </CompactSecondaryPageAction>
            <CompactSecondaryPageAction
              clientLog="문서 승인 이동"
              onClick={() => app.handleAreaChange("approvals")}
            >
              <ShieldCheck />
              승인
            </CompactSecondaryPageAction>
            <CompactSecondaryPageAction
              clientLog="문서 발행 이동"
              onClick={() => app.handleAreaChange("publish")}
            >
              <GitBranch />
              발행
            </CompactSecondaryPageAction>
            <CompactSecondaryPageAction
              clientLog="문서 AI 이동"
              onClick={() => app.handleAreaChange("ai")}
            >
              <Sparkles />
              AI
            </CompactSecondaryPageAction>
          </div>
        </div>
      </ElevatedPanel>

      <section className="grid gap-3 lg:grid-cols-4">
        <SignalPanel label="연결 문서" value={overview.header.linkedDocumentCount} />
        <SignalPanel label="리뷰 스레드" value={overview.header.reviewThreadCount} />
        <SignalPanel label="미해결 승인" value={overview.header.unresolvedApprovalCount} />
        <SignalPanel label="마크다운 미리보기" value={overview.markdownPreview.length} />
      </section>

      <div className="grid gap-5 xl:grid-cols-[1fr_1fr]">
        <PanelCard>
          <PanelCardHeader>
            <h3 className="text-lg font-semibold text-[var(--foreground)]">연결 문서</h3>
          </PanelCardHeader>
          <div className="divide-y divide-[var(--border)]">
            {overview.linkedDocuments.length === 0 ? (
              <PanelEmptyState
                title="문서 링크 없음"
                description="아직 연결된 문서가 없습니다. PRD, UX Flow, Spec, Policy 관계를 붙이면 이 영역이 영향도 지도로 바뀝니다."
              />
            ) : (
              overview.linkedDocuments.map((document) => (
                <button
                  className="block w-full px-5 py-4 text-left transition-colors hover:bg-[var(--secondary)]/55"
                  key={document.id}
                  onClick={() => {
                    logEvent({
                      action: "연결 문서 CTA 클릭",
                      description: document.title,
                      source: "document-overview",
                    });
                    app.handleDocumentSelect(document.id);
                  }}
                  type="button"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium text-[var(--foreground)]">{document.title}</p>
                    <Badge variant="outline">{document.type}</Badge>
                  </div>
                  <p className="mt-2 text-sm text-[var(--muted-foreground)]">
                    {document.shortSummary}
                  </p>
                </button>
              ))
            )}
          </div>
        </PanelCard>

        <PanelCard>
          <PanelCardHeader>
            <h3 className="text-lg font-semibold text-[var(--foreground)]">리뷰 및 승인 스냅샷</h3>
          </PanelCardHeader>
          <div className="divide-y divide-[var(--border)]">
            {overview.reviewThreads.map((thread) => (
              <div className="px-5 py-4" key={thread.id}>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={statusBadgeVariant(thread.status)}>
                    {translateLabel(thread.status)}
                  </Badge>
                  <p className="font-medium text-[var(--foreground)]">{thread.anchorLabel}</p>
                </div>
                <p className="mt-2 text-sm text-[var(--muted-foreground)]">{thread.excerpt}</p>
              </div>
            ))}
            {overview.reviewThreads.length === 0 ? (
              <PanelEmptyState
                title="리뷰 스레드 없음"
                description="아직 열린 리뷰 스레드가 없습니다. 댓글이 생기면 이 영역이 문서의 현재 대화 상태를 요약합니다."
              />
            ) : null}
            {overview.approvals.length === 0 ? (
              <PanelEmptyState
                title="승인 스냅샷 없음"
                description="승인 요청이 아직 없거나 모두 정리되었습니다. 승인 흐름이 생기면 reviewer 상태가 이 패널에 함께 쌓입니다."
              />
            ) : null}
            {overview.approvals.map((approval) => (
              <div className="px-5 py-4" key={approval.id}>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium text-[var(--foreground)]">{approval.reviewerLabel}</p>
                  <Badge variant="outline">{translateLabel(approval.authority)}</Badge>
                  <Badge variant={statusBadgeVariant(approval.state)}>
                    {translateLabel(approval.state)}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </PanelCard>
      </div>
    </div>
  );
}
