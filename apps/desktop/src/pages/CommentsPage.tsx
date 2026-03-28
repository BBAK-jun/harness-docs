import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { WorkspaceShellModel } from "../hooks/useWorkspaceShell";
import { EmptyStateCard, statusBadgeVariant, translateLabel } from "./pageUtils";

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
  const document = app.activeDocument;

  if (!document) {
    return (
      <EmptyStateCard
        description="스레드와 멘션을 확인하려면 문서를 선택하세요."
        title="리뷰 맥락 없음"
        actions={
          <div className="flex flex-wrap gap-2">
            <Button onClick={onGoToDocuments} size="sm" variant="secondary">
              문서 선택하기
            </Button>
          </div>
        }
      />
    );
  }

  if (threads.length === 0) {
    return (
      <EmptyStateCard
        description="현재 문서에는 열린 댓글 스레드가 없습니다. 새 스레드를 추가하거나 승인 상태를 확인해 다음 작업을 정할 수 있습니다."
        title="리뷰 스레드 없음"
        actions={
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={() =>
                app.handleCreateBlockComment(
                  document,
                  "@reviewers 이 발행 배치에 이 stale 사유만으로 충분한지 확인해 주세요.",
                )
              }
              size="sm"
            >
              샘플 스레드 추가
            </Button>
            <Button onClick={onGoToApprovals} size="sm" variant="outline">
              승인 상태 보기
            </Button>
          </div>
        }
      />
    );
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader className="border-b border-[var(--border)]">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Discussion</CardTitle>
            <CardDescription>
              열린 리뷰 스레드, 발췌된 문맥, 다음 액션만 빠르게 확인하도록 구성합니다.
            </CardDescription>
          </div>
          <Button
            onClick={() =>
              app.handleCreateBlockComment(
                document,
                "@reviewers 이 발행 배치에 이 stale 사유만으로 충분한지 확인해 주세요.",
              )
            }
          >
            샘플 스레드 추가
          </Button>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-0 p-0">
        {threads.map((thread) => (
          <div
            className="border-b border-[var(--border)] px-5 py-4 last:border-b-0"
            key={thread.id}
          >
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={statusBadgeVariant(thread.lifecycle.status)}>
                {translateLabel(thread.lifecycle.status)}
              </Badge>
              <span className="text-sm text-[var(--muted-foreground)]">
                {thread.anchor.headingPath.join(" / ")}
              </span>
            </div>
            <p className="mt-3 text-sm leading-6 text-[var(--foreground)]">
              {thread.anchor.excerpt}
            </p>
            <div className="mt-3 grid gap-2 text-sm text-[var(--muted-foreground)] sm:grid-cols-2">
              <span>참여자 {thread.participantMembershipIds.length}명</span>
              <span>연결 문서 {thread.linkedDocumentIds.length}개</span>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
