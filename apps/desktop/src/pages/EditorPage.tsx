import { Eye, FilePenLine, Lock, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { AppPageProps } from "./pageUtils";
import { EmptyStateCard, formatDateTime, translateDocumentType, translateLabel } from "./pageUtils";

export function EditorPage({ app }: AppPageProps) {
  const document = app.activeDocument;

  if (!document) {
    return (
      <EmptyStateCard
        description="먼저 문서 목록에서 문서를 선택하세요."
        title="선택된 문서 없음"
        actions={
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => app.handleAreaChange("documents")} size="sm" variant="secondary">
              문서 목록으로 이동
            </Button>
          </div>
        }
      />
    );
  }

  const isLockedByActiveMember =
    app.activeDocumentLock?.lifecycle.status === "active" &&
    app.activeDocumentLock.lockedByMembershipId === app.activeMembershipId;

  return (
    <section className="overflow-hidden rounded-[calc(var(--radius)+0.35rem)] border border-[var(--border)] bg-[var(--card)]">
      <div className="border-b border-[var(--border)] px-5 py-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline">{translateDocumentType(document.type)}</Badge>
              <Badge variant="secondary">{translateLabel(document.lifecycle.review.status)}</Badge>
              <Badge variant={isLockedByActiveMember ? "success" : "warning"}>
                {isLockedByActiveMember ? "editing lock owned" : "lock required"}
              </Badge>
            </div>
            <h2 className="mt-3 text-2xl font-semibold text-[var(--foreground)]">{document.title}</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--muted-foreground)]">
              Markdown 원본과 preview를 같은 화면에서 유지합니다. 잠금 소유권이 있어야 저장 가능한
              상태로 전환됩니다.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline">
              <Sparkles />
              AI Assist
            </Button>
            {isLockedByActiveMember ? (
              <Button variant="outline" onClick={() => app.handleReleaseEditing(document)}>
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
                ? `잠금 상태 ${app.activeDocumentLock.lifecycle.status} · 마지막 활동 ${formatDateTime(app.activeDocumentLock.lastActivityAt)}`
                : "이 문서에는 현재 활성 잠금이 없습니다."}
            </span>
          </div>
          <span>연결 문서 {document.linkedDocumentIds.length}개</span>
          <span>최종 업데이트 {formatDateTime(document.lifecycle.updatedAt)}</span>
        </div>
      </div>

      <div className="grid min-h-[620px] gap-0 xl:grid-cols-2">
        <div className="border-b border-[var(--border)] xl:border-b-0 xl:border-r">
          <div className="flex items-center gap-2 border-b border-[var(--border)] px-5 py-3 text-sm font-medium text-[var(--foreground)]">
            <FilePenLine className="size-4" />
            Markdown Source
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
            Live Preview
          </div>
          <div className="prose-harness h-full overflow-auto px-5 py-4">
            <pre className="m-0 overflow-auto whitespace-pre-wrap bg-transparent p-0 text-sm leading-7 text-[var(--foreground)]">
              {app.activeDocumentSource}
            </pre>
          </div>
        </div>
      </div>
    </section>
  );
}
