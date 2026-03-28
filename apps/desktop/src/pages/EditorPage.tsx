import { useState } from "react";
import { Eye, FilePenLine, GitBranch, Link2, Lock, MessageSquareMore, ShieldCheck, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { AppPageProps } from "./pageUtils";
import {
  EmptyStateCard,
  formatDateTime,
  statusBadgeVariant,
  translateDocumentType,
  translateLabel,
} from "./pageUtils";

type EditorTab = "preview" | "edit" | "links" | "comments";

export function EditorPage({ app }: AppPageProps) {
  const [activeTab, setActiveTab] = useState<EditorTab>("preview");
  const document = app.activeDocument;
  const graph = app.activeWorkspaceGraph;

  if (!document || !graph) {
    return (
      <EmptyStateCard
        description="러버블 기준 문서 작업 공간은 문서가 선택돼야 열립니다. 먼저 문서 라이브러리에서 문서를 고르세요."
        title="선택된 문서 없음"
        actions={
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => app.handleAreaChange("documents")} size="sm">
              문서 목록으로 이동
            </Button>
            <Button onClick={() => app.handleAreaChange("dashboard")} size="sm" variant="outline">
              대시보드로 이동
            </Button>
          </div>
        }
      />
    );
  }

  const isLockedByActiveMember =
    app.activeDocumentLock?.lifecycle.status === "active" &&
    app.activeDocumentLock.lockedByMembershipId === app.activeMembershipId;
  const linkedDocuments = graph.documents.filter((entry) => document.linkedDocumentIds.includes(entry.id));
  const commentThreads = graph.commentThreads.filter((thread) => thread.documentId === document.id);
  const approvals = graph.approvals.filter((approval) => approval.documentId === document.id);
  const tabs: Array<{ id: EditorTab; label: string; icon: typeof Eye }> = [
    { id: "preview", label: "미리보기", icon: Eye },
    { id: "edit", label: "편집", icon: FilePenLine },
    { id: "links", label: `연결 문서 ${linkedDocuments.length}`, icon: Link2 },
    { id: "comments", label: `댓글 ${commentThreads.length}`, icon: MessageSquareMore },
  ];

  return (
    <section className="overflow-hidden rounded-[calc(var(--radius)+0.35rem)] border border-[var(--border)] bg-[var(--card)]">
      <div className="border-b border-[var(--border)] px-5 py-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline">{translateDocumentType(document.type)}</Badge>
              <Badge variant="secondary">{translateLabel(document.lifecycle.review.status)}</Badge>
              <Badge variant={statusBadgeVariant(document.lifecycle.review.freshness.status)}>
                {translateLabel(document.lifecycle.review.freshness.status)}
              </Badge>
              <Badge variant={isLockedByActiveMember ? "success" : "warning"}>
                {isLockedByActiveMember ? "편집 잠금 보유 중" : "잠금 필요"}
              </Badge>
            </div>
            <h2 className="mt-3 text-2xl font-semibold text-[var(--foreground)]">{document.title}</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--muted-foreground)]">
              문서 작업 공간은 편집기, 링크, 댓글, 승인 스냅샷을 한 셸에서 다룹니다. 기존 편집 화면이 아니라
              러버블 문서 작업 공간을 기준으로 재구성한 상태입니다.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => app.handleAreaChange("ai")} size="sm" variant="outline">
              <Sparkles />
              AI 지원
            </Button>
            <Button onClick={() => app.handleAreaChange("publish")} size="sm" variant="outline">
              <GitBranch />
              발행
            </Button>
            {isLockedByActiveMember ? (
              <Button onClick={() => app.handleReleaseEditing(document)} variant="outline">
                잠금 해제
              </Button>
            ) : (
              <Button onClick={() => app.handleStartEditing(document)}>
                <FilePenLine />
                편집 시작
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="border-b border-[var(--border)] bg-[var(--surface)] px-5 py-3">
        <div className="flex flex-wrap items-center gap-4 text-sm text-[var(--muted-foreground)]">
          <div className="flex items-center gap-2">
            <Lock className="size-4" />
            <span>
              {app.activeDocumentLock
                ? `잠금 상태 ${translateLabel(app.activeDocumentLock.lifecycle.status)} · 마지막 활동 ${formatDateTime(app.activeDocumentLock.lastActivityAt)}`
                : "이 문서에는 현재 활성 잠금이 없습니다."}
            </span>
          </div>
          <span>연결 문서 {linkedDocuments.length}개</span>
          <span>댓글 스레드 {commentThreads.length}개</span>
          <span>승인 항목 {approvals.length}개</span>
          <span>최종 업데이트 {formatDateTime(document.lifecycle.updatedAt)}</span>
        </div>
      </div>

      <div className="border-b border-[var(--border)] px-5">
        <div className="flex flex-wrap gap-1">
          {tabs.map((tab) => (
            <button
              className={
                activeTab === tab.id
                  ? "inline-flex items-center gap-2 border-b-2 border-[var(--foreground)] px-4 py-3 text-sm font-medium text-[var(--foreground)]"
                  : "inline-flex items-center gap-2 border-b-2 border-transparent px-4 py-3 text-sm text-[var(--muted-foreground)] transition-colors hover:text-[var(--foreground)]"
              }
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              type="button"
            >
              <tab.icon className="size-4" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {activeTab === "edit" ? (
        <div className="grid min-h-[620px] gap-0 xl:grid-cols-2">
          <div className="border-b border-[var(--border)] xl:border-b-0 xl:border-r">
            <div className="flex items-center gap-2 border-b border-[var(--border)] px-5 py-3 text-sm font-medium text-[var(--foreground)]">
              <FilePenLine className="size-4" />
              마크다운 원본
            </div>
            <div className="p-4">
              <Textarea
                className="min-h-[540px] resize-none border-0 bg-transparent font-mono text-[13px] shadow-none focus-visible:ring-0"
                disabled={!isLockedByActiveMember}
                onChange={(event) => app.handleDocumentSourceChange(document, event.target.value)}
                value={app.activeDocumentSource}
              />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2 border-b border-[var(--border)] px-5 py-3 text-sm font-medium text-[var(--foreground)]">
              <Eye className="size-4" />
              실시간 미리보기
            </div>
            <div className="prose-harness h-full overflow-auto px-5 py-4">
              <pre className="m-0 overflow-auto whitespace-pre-wrap bg-transparent p-0 text-sm leading-7 text-[var(--foreground)]">
                {app.activeDocumentSource}
              </pre>
            </div>
          </div>
        </div>
      ) : null}

      {activeTab === "preview" ? (
        <div className="grid gap-5 p-5 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] p-5">
            <div className="flex items-center gap-2 text-sm font-medium text-[var(--foreground)]">
              <Eye className="size-4" />
              마크다운 미리보기
            </div>
            <div className="prose-harness mt-4">
              <pre className="m-0 overflow-auto whitespace-pre-wrap bg-transparent p-0 text-sm leading-7 text-[var(--foreground)]">
                {app.activeDocumentSource}
              </pre>
            </div>
          </div>
          <div className="flex flex-col gap-4">
            <SnapshotCard
              title="최신성"
              description={document.lifecycle.review.freshness.summary}
              meta={translateLabel(document.lifecycle.review.freshness.status)}
            />
            <SnapshotCard
              title="승인"
              description={`미해결 승인 ${document.prePublication.unresolvedApprovalIds.length}개`}
              meta={`검토자 ${approvals.length}명`}
            />
            <SnapshotCard
              title="GitHub 준비 상태"
              description={document.prePublication.github.summary}
              meta={translateLabel(document.prePublication.github.status)}
            />
          </div>
        </div>
      ) : null}

      {activeTab === "links" ? (
        <div className="p-5">
          <div className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)]">
            <div className="border-b border-[var(--border)] px-5 py-4">
              <h3 className="text-lg font-semibold text-[var(--foreground)]">문서 관계</h3>
            </div>
            <div className="divide-y divide-[var(--border)]">
              {linkedDocuments.length === 0 ? (
                <InlineEmptyState
                  title="연결 문서 없음"
                  description="PRD, UX 흐름, 기술 명세, 정책/의사결정 간 관계를 연결하면 이 탭이 문서 영향도 지도로 바뀝니다."
                />
              ) : (
                linkedDocuments.map((entry) => (
                  <button
                    className="block w-full px-5 py-4 text-left transition-colors hover:bg-[var(--secondary)]/55"
                    key={entry.id}
                    onClick={() => app.handleDocumentSelect(entry.id)}
                    type="button"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium text-[var(--foreground)]">{entry.title}</p>
                      <Badge variant="outline">{translateDocumentType(entry.type)}</Badge>
                      <Badge variant={statusBadgeVariant(entry.lifecycle.review.freshness.status)}>
                        {translateLabel(entry.lifecycle.review.freshness.status)}
                      </Badge>
                    </div>
                    <p className="mt-2 text-sm text-[var(--muted-foreground)]">
                      {entry.prePublication.summary}
                    </p>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      ) : null}

      {activeTab === "comments" ? (
        <div className="grid gap-5 p-5 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)]">
            <div className="border-b border-[var(--border)] px-5 py-4">
              <h3 className="text-lg font-semibold text-[var(--foreground)]">대화</h3>
            </div>
            <div className="divide-y divide-[var(--border)]">
              {commentThreads.length === 0 ? (
                <InlineEmptyState
                  title="댓글 스레드 없음"
                  description="리뷰 대화가 아직 없습니다. 블록 댓글을 추가하면 리뷰 페이지와 이 탭이 함께 업데이트됩니다."
                />
              ) : (
                commentThreads.map((thread) => (
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
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)]">
            <div className="border-b border-[var(--border)] px-5 py-4">
              <h3 className="text-lg font-semibold text-[var(--foreground)]">승인 스냅샷</h3>
            </div>
            <div className="divide-y divide-[var(--border)]">
              {approvals.length === 0 ? (
                <InlineEmptyState
                  title="승인 항목 없음"
                  description="이 문서에 연결된 승인 요청이 아직 없습니다."
                />
              ) : (
                approvals.map((approval) => (
                  <div className="px-5 py-4" key={approval.id}>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium text-[var(--foreground)]">{approval.reviewerLabel}</p>
                      <Badge variant="outline">{translateLabel(approval.authority)}</Badge>
                      <Badge variant={statusBadgeVariant(approval.lifecycle.state)}>
                        {translateLabel(approval.lifecycle.state)}
                      </Badge>
                    </div>
                    <p className="mt-2 text-sm text-[var(--muted-foreground)]">
                      요청 {formatDateTime(approval.lifecycle.requestedAt)}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function SnapshotCard({
  title,
  description,
  meta,
}: {
  title: string;
  description: string;
  meta: string;
}) {
  return (
    <div className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] p-4">
      <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted-foreground)]">{title}</p>
      <p className="mt-3 text-sm leading-6 text-[var(--foreground)]">{description}</p>
      <p className="mt-3 text-sm font-medium text-[var(--muted-foreground)]">{meta}</p>
    </div>
  );
}

function InlineEmptyState({
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
