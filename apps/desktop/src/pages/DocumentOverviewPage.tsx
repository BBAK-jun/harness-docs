import { FilePenLine, GitBranch, MessageSquareMore, ShieldCheck, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  if (!overview) {
    return (
      <EmptyStateCard
        title="문서 개요를 열 수 없음"
        description="선택된 문서가 없거나 개요에 필요한 데이터가 준비되지 않았습니다."
        actions={
          <Button onClick={() => app.handleAreaChange("documents")} size="sm" variant="secondary">
            문서 목록으로 이동
          </Button>
        }
      />
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <section className="rounded-[calc(var(--radius)+0.35rem)] border border-[var(--border)] bg-[var(--card)] px-5 py-5">
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
            <h2 className="mt-3 text-2xl font-semibold text-[var(--foreground)]">{overview.header.title}</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--muted-foreground)]">
              {overview.header.freshnessSummary}
            </p>
            <p className="mt-2 text-sm text-[var(--muted-foreground)]">
              owner {overview.header.owner?.name ?? "Unknown"} · updated {formatDateTime(overview.header.updatedAt)}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => app.handleAreaChange("editor")} size="sm">
              <FilePenLine />
              Edit
            </Button>
            <Button onClick={() => app.handleAreaChange("comments")} size="sm" variant="outline">
              <MessageSquareMore />
              Comments
            </Button>
            <Button onClick={() => app.handleAreaChange("approvals")} size="sm" variant="outline">
              <ShieldCheck />
              Approvals
            </Button>
            <Button onClick={() => app.handleAreaChange("publish")} size="sm" variant="outline">
              <GitBranch />
              Publish
            </Button>
            <Button onClick={() => app.handleAreaChange("ai")} size="sm" variant="outline">
              <Sparkles />
              AI
            </Button>
          </div>
        </div>
      </section>

      <section className="grid gap-3 lg:grid-cols-4">
        <InfoTile label="Linked Docs" value={overview.header.linkedDocumentCount} />
        <InfoTile label="Review Threads" value={overview.header.reviewThreadCount} />
        <InfoTile label="Unresolved Approvals" value={overview.header.unresolvedApprovalCount} />
        <InfoTile label="Markdown Preview" value={overview.markdownPreview.length} />
      </section>

      <div className="grid gap-5 xl:grid-cols-[1fr_1fr]">
        <section className="rounded-[calc(var(--radius)+0.35rem)] border border-[var(--border)] bg-[var(--card)]">
          <div className="border-b border-[var(--border)] px-5 py-4">
            <h3 className="text-lg font-semibold text-[var(--foreground)]">Linked Documents</h3>
          </div>
          <div className="divide-y divide-[var(--border)]">
            {overview.linkedDocuments.length === 0 ? (
              <SectionEmptyState
                title="문서 링크 없음"
                description="아직 연결된 문서가 없습니다. PRD, UX Flow, Spec, Policy 관계를 붙이면 이 영역이 영향도 지도로 바뀝니다."
              />
            ) : (
              overview.linkedDocuments.map((document) => (
                <button className="block w-full px-5 py-4 text-left transition-colors hover:bg-[var(--secondary)]/55" key={document.id} onClick={() => app.handleDocumentSelect(document.id)} type="button">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium text-[var(--foreground)]">{document.title}</p>
                    <Badge variant="outline">{document.type}</Badge>
                  </div>
                  <p className="mt-2 text-sm text-[var(--muted-foreground)]">{document.shortSummary}</p>
                </button>
              ))
            )}
          </div>
        </section>

        <section className="rounded-[calc(var(--radius)+0.35rem)] border border-[var(--border)] bg-[var(--card)]">
          <div className="border-b border-[var(--border)] px-5 py-4">
            <h3 className="text-lg font-semibold text-[var(--foreground)]">Review and Approval Snapshot</h3>
          </div>
          <div className="divide-y divide-[var(--border)]">
            {overview.reviewThreads.map((thread) => (
              <div className="px-5 py-4" key={thread.id}>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={statusBadgeVariant(thread.status)}>{translateLabel(thread.status)}</Badge>
                  <p className="font-medium text-[var(--foreground)]">{thread.anchorLabel}</p>
                </div>
                <p className="mt-2 text-sm text-[var(--muted-foreground)]">{thread.excerpt}</p>
              </div>
            ))}
            {overview.reviewThreads.length === 0 ? (
              <SectionEmptyState
                title="리뷰 스레드 없음"
                description="아직 열린 리뷰 스레드가 없습니다. 댓글이 생기면 이 영역이 문서의 현재 대화 상태를 요약합니다."
              />
            ) : null}
            {overview.approvals.length === 0 ? (
              <SectionEmptyState
                title="승인 스냅샷 없음"
                description="승인 요청이 아직 없거나 모두 정리되었습니다. 승인 흐름이 생기면 reviewer 상태가 이 패널에 함께 쌓입니다."
              />
            ) : null}
            {overview.approvals.map((approval) => (
              <div className="px-5 py-4" key={approval.id}>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium text-[var(--foreground)]">{approval.reviewerLabel}</p>
                  <Badge variant="outline">{translateLabel(approval.authority)}</Badge>
                  <Badge variant={statusBadgeVariant(approval.state)}>{translateLabel(approval.state)}</Badge>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

function SectionEmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="px-5 py-6">
      <p className="font-medium text-[var(--foreground)]">{title}</p>
      <p className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">{description}</p>
    </div>
  );
}

function InfoTile({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-[calc(var(--radius)+0.25rem)] border border-[var(--border)] bg-[var(--card)] p-4">
      <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted-foreground)]">{label}</p>
      <p className="mt-3 text-3xl font-semibold tracking-tight text-[var(--foreground)]">{value}</p>
    </div>
  );
}
