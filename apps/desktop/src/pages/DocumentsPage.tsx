import { FileText, GitPullRequest, Search, Sparkles } from "lucide-react";
import { useClientActivityLog } from "@/components/ClientActivityLogProvider";
import { CompactPrimaryPageAction, CompactSecondaryPageAction } from "@/components/pageActions";
import { PanelCard, PanelCardHeader, SignalPanel } from "@/components/pagePanels";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { WorkspaceDocument } from "../types/contracts";
import type { AITaskEntryPoint } from "../types/domain-ui";
import type { WorkspaceShellModel } from "../hooks/useWorkspaceShell";
import {
  EmptyStateCard,
  formatDateTime,
  statusBadgeVariant,
  translateDocumentType,
  translateLabel,
} from "./pageUtils";

export function DocumentsPage({
  app,
  aiEntryPoints,
  onGoToDashboard,
  onOpenWorkspaces,
  onGoToAI,
}: {
  app: WorkspaceShellModel;
  aiEntryPoints: AITaskEntryPoint[];
  onGoToDashboard: () => void;
  onOpenWorkspaces: () => void;
  onGoToAI: () => void;
}) {
  const { logEvent } = useClientActivityLog();
  const publishRecord = app.activeWorkspaceGraph?.publishRecords[0] ?? null;
  const documents = app.activeWorkspaceGraph?.documents ?? [];

  if (documents.length === 0) {
    return (
      <EmptyStateCard
        description="문서 라이브러리가 비어 있어도 대시보드는 다음 작업을 안내해야 합니다. 먼저 대시보드에서 상태를 보고, AI로 첫 문서를 시작하거나 워크스페이스를 다시 선택할 수 있습니다."
        title="빈 문서 라이브러리"
        actions={
          <div className="flex flex-wrap gap-2">
            <CompactPrimaryPageAction clientLog="대시보드로 이동" onClick={onGoToDashboard}>
              대시보드로 이동
            </CompactPrimaryPageAction>
            <CompactSecondaryPageAction
              clientLog="워크스페이스 다시 선택"
              onClick={onOpenWorkspaces}
            >
              워크스페이스 다시 선택
            </CompactSecondaryPageAction>
            <CompactSecondaryPageAction clientLog="AI 화면 보기" onClick={onGoToAI}>
              AI 화면 보기
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
          description="지금 GitHub 발행 배치에 포함된 아티팩트 수입니다."
          icon={<GitPullRequest className="size-4 text-[var(--muted-foreground)]" />}
          label="발행 배치"
          value={publishRecord?.artifacts.length ?? 0}
        />
        <SignalPanel
          description="워크스페이스 상태 기준으로 바로 실행할 수 있는 AI 작업 수입니다."
          icon={<Sparkles className="size-4 text-[var(--muted-foreground)]" />}
          label="AI 진입점"
          value={aiEntryPoints.length}
        />
        <SignalPanel
          description={app.activeDocument?.title ?? "상세를 보려면 문서를 선택하세요."}
          icon={<FileText className="size-4 text-[var(--muted-foreground)]" />}
          label="선택된 문서"
          value={app.activeDocument ? 1 : 0}
        />
      </section>

      <PanelCard>
        <PanelCardHeader className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-[var(--foreground)]">문서</h2>
            <p className="mt-1 text-sm text-[var(--muted-foreground)]">
              문서 라이브러리에서 작업 대상을 고르고, 이어지는 리뷰와 발행 흐름으로 이동합니다.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <CompactPrimaryPageAction clientLog="AI 화면 보기" onClick={onGoToAI}>
              AI 화면 보기
            </CompactPrimaryPageAction>
            <CompactSecondaryPageAction clientLog="워크스페이스 변경" onClick={onOpenWorkspaces}>
              워크스페이스 변경
            </CompactSecondaryPageAction>
          </div>
        </PanelCardHeader>

        <div className="border-b border-[var(--border)] px-5 py-4">
          <div className="relative max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--muted-foreground)]" />
            <Input className="pl-9" placeholder="문서 검색 UI 자리" readOnly value="" />
          </div>
        </div>

        <div className="divide-y divide-[var(--border)]">
          {documents.map((document) => (
            <DocumentRow app={app} document={document} key={document.id} />
          ))}
        </div>
      </PanelCard>
    </div>
  );
}

function DocumentRow({
  app,
  document,
}: {
  app: WorkspaceShellModel;
  document: WorkspaceDocument;
}) {
  const { logEvent } = useClientActivityLog();
  return (
    <button
      className={cn(
        "flex w-full flex-col gap-4 px-5 py-4 text-left transition-colors",
        app.activeDocument?.id === document.id
          ? "bg-[color:color-mix(in_srgb,var(--accent)_38%,white)]"
          : "bg-transparent hover:bg-[var(--secondary)]/55",
      )}
      onClick={() => {
        logEvent({
          action: "문서 행 CTA 클릭",
          description: document.title,
          source: "documents-page",
        });
        app.handleDocumentSelect(document.id);
      }}
      type="button"
    >
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-base font-medium text-[var(--foreground)]">{document.title}</p>
            <Badge variant="outline">{translateDocumentType(document.type)}</Badge>
            <Badge variant={statusBadgeVariant(document.lifecycle.review.freshness.status)}>
              {translateLabel(document.lifecycle.review.freshness.status)}
            </Badge>
            <Badge variant="secondary">{translateLabel(document.lifecycle.review.status)}</Badge>
          </div>
          <p className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">
            {document.prePublication.summary}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 lg:justify-end">
          <Badge variant={statusBadgeVariant(document.prePublication.github.status)}>
            {translateLabel(document.prePublication.github.status)}
          </Badge>
          <span className="text-xs font-medium uppercase tracking-[0.16em] text-[var(--muted-foreground)]">
            {document.id}
          </span>
        </div>
      </div>
      <div className="grid gap-3 text-sm text-[var(--muted-foreground)] md:grid-cols-3">
        <span>연결 문서: {document.linkedDocumentIds.length}</span>
        <span>미해결 승인: {document.prePublication.unresolvedApprovalIds.length}</span>
        <span>업데이트: {formatDateTime(document.lifecycle.updatedAt)}</span>
      </div>
    </button>
  );
}
