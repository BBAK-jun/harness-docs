import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
  const document = app.activeDocument;

  if (!document) {
    return (
      <EmptyStateCard
        description="앱 내부 승인 상태를 확인하려면 먼저 문서를 선택하세요."
        title="승인 맥락 없음"
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

  if (approvals.length === 0) {
    return (
      <EmptyStateCard
        description="현재 문서에는 남아 있는 승인 항목이 없습니다. 댓글 맥락을 확인하거나 다른 문서를 선택할 수 있습니다."
        title="남은 승인 없음"
        actions={
          <div className="flex flex-wrap gap-2">
            <Button onClick={onGoToComments} size="sm" variant="secondary">
              리뷰 댓글 보기
            </Button>
            <Button onClick={onGoToDocuments} size="sm" variant="outline">
              다른 문서 보기
            </Button>
          </div>
        }
      />
    );
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader className="border-b border-[var(--border)]">
        <CardTitle>Review Approvals</CardTitle>
        <CardDescription>
          앱 내부 권한 기준으로 남아 있는 승인자와 상태만 보여줍니다.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-0 p-0">
        {approvals.map((approval) => (
          <div
            className="flex flex-col gap-3 border-b border-[var(--border)] px-5 py-4 last:border-b-0 sm:flex-row sm:items-center sm:justify-between"
            key={approval.id}
          >
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-medium text-[var(--foreground)]">{approval.reviewerLabel}</p>
                <Badge variant="outline">{translateLabel(approval.authority)}</Badge>
                <Badge variant="secondary">{translateLabel(approval.source)}</Badge>
              </div>
              <p className="mt-2 text-sm text-[var(--muted-foreground)]">
                요청 시각 {formatDateTime(approval.lifecycle.requestedAt)} · 결정{" "}
                {translateLabel(approval.decision ?? "pending")}
              </p>
            </div>
            <Badge variant={statusBadgeVariant(approval.lifecycle.state)}>
              {translateLabel(approval.lifecycle.state)}
            </Badge>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
