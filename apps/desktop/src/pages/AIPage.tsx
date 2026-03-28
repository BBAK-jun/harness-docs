import { ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { AITaskEntryPoint } from "../types";
import { EmptyStateCard, translateLabel } from "./pageUtils";

export function AIPage({
  aiEntryPoints,
  onLaunch,
  onGoToDocuments,
  onGoToEditor,
}: {
  aiEntryPoints: AITaskEntryPoint[];
  onLaunch: (entry: AITaskEntryPoint) => Promise<void>;
  onGoToDocuments: () => void;
  onGoToEditor: () => void;
}) {
  if (aiEntryPoints.length === 0) {
    return (
      <EmptyStateCard
        description="지금 워크스페이스 상태에서는 실행할 수 있는 AI 액션이 없습니다. 문서를 먼저 선택하거나 편집 상태를 만들어 주세요."
        title="사용 가능한 AI 액션이 없음"
        actions={
          <div className="flex flex-wrap gap-2">
            <Button onClick={onGoToDocuments} size="sm" variant="secondary">
              문서 목록 열기
            </Button>
            <Button onClick={onGoToEditor} size="sm" variant="outline">
              편집 화면으로 이동
            </Button>
          </div>
        }
      />
    );
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader className="border-b border-[var(--border)]">
        <CardTitle>AI 어시스턴트</CardTitle>
        <CardDescription>
          초안 생성, 링크 제안, 발행 메모 준비 같은 명확한 작업 단위만 노출합니다.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-0 p-0">
        {aiEntryPoints.map((entry) => (
          <button
            className="flex w-full flex-col gap-3 border-b border-[var(--border)] px-5 py-4 text-left transition-colors last:border-b-0 hover:bg-[var(--secondary)]/55"
            key={entry.id}
            onClick={() => void onLaunch(entry)}
            type="button"
          >
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="info">{entry.provider}</Badge>
              <Badge variant="outline">{translateLabel(entry.kind)}</Badge>
              <Badge variant="secondary">{translateLabel(entry.scope)}</Badge>
            </div>
            <div>
              <p className="font-medium text-[var(--foreground)]">{entry.title}</p>
              <p className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">
                {entry.description}
              </p>
            </div>
            <div className="flex items-center gap-2 text-sm text-[var(--muted-foreground)]">
              <span>{entry.contextLabel}</span>
              <ArrowRight className="size-4" />
              <span>{entry.triggerLabel}</span>
            </div>
          </button>
        ))}
      </CardContent>
    </Card>
  );
}
