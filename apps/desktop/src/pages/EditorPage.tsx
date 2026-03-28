import { Lock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import type { AppPageProps } from "./pageUtils";
import { EmptyStateCard, formatDateTime } from "./pageUtils";

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
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>{document.title}</CardTitle>
            <CardDescription>
              한 번에 한 문서만 편집합니다. 원본 옆에 미리보기만 두고 나머지는 제거합니다.
            </CardDescription>
          </div>
          <div className="flex gap-2">
            {isLockedByActiveMember ? (
              <Button variant="outline" onClick={() => app.handleReleaseEditing(document)}>
                잠금 해제
              </Button>
            ) : (
              <Button onClick={() => app.handleStartEditing(document)}>편집 시작</Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="grid gap-4 xl:grid-cols-2">
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2 text-sm text-[var(--muted-foreground)]">
            <Lock className="size-4" />
            <span>
              {app.activeDocumentLock
                ? `잠금 상태 ${app.activeDocumentLock.lifecycle.status} · 마지막 활동 ${formatDateTime(app.activeDocumentLock.lastActivityAt)}`
                : "이 문서에는 현재 활성 잠금이 없습니다."}
            </span>
          </div>
          <Textarea
            className="min-h-[520px] resize-none font-mono text-[13px]"
            disabled={!isLockedByActiveMember}
            onChange={(event) => app.handleDocumentSourceChange(document, event.target.value)}
            value={app.activeDocumentSource}
          />
        </div>
        <div className="rounded-[calc(var(--radius)+0.25rem)] border border-[var(--border)] bg-[var(--surface)] p-5">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-medium text-[var(--foreground)]">미리보기</p>
            <Badge variant="outline">Markdown</Badge>
          </div>
          <Separator className="my-4" />
          <pre className="overflow-auto whitespace-pre-wrap text-sm leading-7 text-[var(--foreground)]">
            {app.activeDocumentSource}
          </pre>
        </div>
      </CardContent>
    </Card>
  );
}
