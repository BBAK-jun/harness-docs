import { FileText, GitPullRequest, Search, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { AITaskEntryPoint, WorkspaceDocument } from "../types";
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
  const publishRecord = app.activeWorkspaceGraph?.publishRecords[0] ?? null;
  const documents = app.activeWorkspaceGraph?.documents ?? [];

  if (documents.length === 0) {
    return (
      <EmptyStateCard
        description="문서 라이브러리가 비어 있어도 대시보드는 다음 작업을 안내해야 합니다. 먼저 대시보드에서 상태를 보고, AI로 첫 문서를 시작하거나 워크스페이스를 다시 선택할 수 있습니다."
        title="빈 문서 라이브러리"
        actions={
          <div className="flex flex-wrap gap-2">
            <Button onClick={onGoToDashboard} size="sm">
              대시보드로 이동
            </Button>
            <Button onClick={onOpenWorkspaces} size="sm" variant="secondary">
              워크스페이스 다시 선택
            </Button>
            <Button onClick={onGoToAI} size="sm" variant="outline">
              AI 화면 보기
            </Button>
          </div>
        }
      />
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <section className="grid gap-3 lg:grid-cols-3">
        <SignalCard
          description="지금 GitHub 발행 배치에 포함된 아티팩트 수입니다."
          icon={GitPullRequest}
          label="발행 배치"
          value={publishRecord?.artifacts.length ?? 0}
        />
        <SignalCard
          description="워크스페이스 상태 기준으로 바로 실행할 수 있는 AI 작업 수입니다."
          icon={Sparkles}
          label="AI 진입점"
          value={aiEntryPoints.length}
        />
        <SignalCard
          description={app.activeDocument?.title ?? "상세를 보려면 문서를 선택하세요."}
          icon={FileText}
          label="선택된 문서"
          value={app.activeDocument ? 1 : 0}
        />
      </section>

      <section className="rounded-[calc(var(--radius)+0.35rem)] border border-[var(--border)] bg-[var(--card)]">
        <div className="flex flex-col gap-4 border-b border-[var(--border)] px-5 py-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-[var(--foreground)]">문서</h2>
            <p className="mt-1 text-sm text-[var(--muted-foreground)]">
              문서 라이브러리에서 작업 대상을 고르고, 이어지는 리뷰와 발행 흐름으로 이동합니다.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={onGoToAI} size="sm">
              AI 화면 보기
            </Button>
            <Button onClick={onOpenWorkspaces} size="sm" variant="outline">
              워크스페이스 변경
            </Button>
          </div>
        </div>

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
      </section>
    </div>
  );
}

function SignalCard({
  label,
  value,
  description,
  icon: Icon,
}: {
  label: string;
  value: number;
  description: string;
  icon: typeof FileText;
}) {
  return (
    <div className="rounded-[calc(var(--radius)+0.25rem)] border border-[var(--border)] bg-[var(--card)] p-5 shadow-[0_24px_90px_-60px_rgba(15,23,42,0.22)]">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
          {label}
        </p>
        <Icon className="size-4 text-[var(--muted-foreground)]" />
      </div>
      <p className="mt-4 text-3xl font-semibold tracking-tight text-[var(--foreground)]">{value}</p>
      <p className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">{description}</p>
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
  return (
    <button
      className={cn(
        "flex w-full flex-col gap-4 px-5 py-4 text-left transition-colors",
        app.activeDocument?.id === document.id
          ? "bg-[color:color-mix(in_srgb,var(--accent)_38%,white)]"
          : "bg-transparent hover:bg-[var(--secondary)]/55",
      )}
      onClick={() => app.handleDocumentSelect(document.id)}
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
