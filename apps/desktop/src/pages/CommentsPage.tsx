import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { WorkspaceShellModel } from "../hooks/useWorkspaceShell";
import { EmptyStateCard, statusBadgeVariant } from "./pageUtils";

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
        description="Choose a document to inspect threads and mentions."
        title="No review context"
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
                  "@reviewers Please confirm whether stale rationale is enough for this publish batch.",
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
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Review one thread at a time</CardTitle>
            <CardDescription>
              Keep feedback simple: open thread, context excerpt, and the next reply action.
            </CardDescription>
          </div>
          <Button
            onClick={() =>
              app.handleCreateBlockComment(
                document,
                "@reviewers Please confirm whether stale rationale is enough for this publish batch.",
              )
            }
          >
            Add sample thread
          </Button>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {threads.map((thread) => (
          <div
            className="rounded-[calc(var(--radius)+0.25rem)] border border-[var(--border)] bg-[var(--surface)] p-4"
            key={thread.id}
          >
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={statusBadgeVariant(thread.lifecycle.status)}>
                {thread.lifecycle.status}
              </Badge>
              <span className="text-sm text-[var(--muted-foreground)]">
                {thread.anchor.headingPath.join(" / ")}
              </span>
            </div>
            <p className="mt-3 text-sm leading-6 text-[var(--foreground)]">
              {thread.anchor.excerpt}
            </p>
            <p className="mt-3 text-sm text-[var(--muted-foreground)]">
              Participants {thread.participantMembershipIds.length} · linked docs{" "}
              {thread.linkedDocumentIds.length}
            </p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
