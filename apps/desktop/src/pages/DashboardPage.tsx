import { ArrowRight, CheckCircle2, Clock3, Eye, FileText, GitBranch, Sparkles, TriangleAlert, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { WorkspaceShellModel } from "../hooks/useWorkspaceShell";
import { formatDateTime, statusBadgeVariant, translateLabel } from "./pageUtils";
import type { WorkspaceDashboardView } from "../view-models/workspaceDashboard";

export function DashboardPage({
  app,
  dashboard,
}: {
  app: WorkspaceShellModel;
  dashboard: WorkspaceDashboardView;
}) {
  const isEmptyWorkspace = dashboard.workspace.documentCount === 0;

  if (isEmptyWorkspace) {
    return (
      <div className="flex flex-col gap-5">
        <section className="rounded-[calc(var(--radius)+0.5rem)] border border-[var(--border)] bg-[var(--card)] px-6 py-6">
          <Badge className="w-fit" variant="info">
            워크스페이스 개요
          </Badge>
          <h2 className="mt-3 text-3xl font-semibold text-[var(--foreground)]">
            이 워크스페이스는 아직 비어 있습니다
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--muted-foreground)]">
            대시보드는 빈 상태에서도 다음 작업을 안내해야 합니다. 먼저 AI로 초안을 만들거나,
            문서 라이브러리에서 첫 문서를 시작할 준비를 확인하세요.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <Button onClick={() => app.handleAreaChange("ai")} size="sm">
              AI로 첫 문서 시작
            </Button>
            <Button onClick={() => app.handleAreaChange("documents")} size="sm" variant="outline">
              빈 문서 라이브러리 보기
            </Button>
            <Button onClick={() => app.handleAreaChange("publish")} size="sm" variant="outline">
              발행 준비 상태 보기
            </Button>
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-3">
          <EmptyGuideCard
            title="1. 문서 흐름 시작"
            description="PRD, UX 흐름, 기술 명세, 정책/의사결정 중 무엇을 먼저 만들지 결정합니다."
          />
          <EmptyGuideCard
            title="2. 리뷰 경로 준비"
            description="문서가 생기면 댓글, 승인, 오래됨 판단이 이 대시보드에서 집계됩니다."
          />
          <EmptyGuideCard
            title="3. 발행 목표 정렬"
            description="GitHub는 최종 발행 채널입니다. 현재는 배치가 비어 있어도 대시보드가 준비 상태를 설명합니다."
          />
        </section>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <section className="px-2 pt-1">
        <h1 className="text-[2.1rem] font-semibold tracking-tight text-[var(--foreground)]">
          워크스페이스 개요
        </h1>
        <p className="mt-2 text-sm text-[var(--muted-foreground)]">
          {dashboard.workspace.name} · 문서 {dashboard.workspace.documentCount}개
        </p>
      </section>

      <section className="grid gap-3 lg:grid-cols-6">
        {dashboard.stats.map((stat) => (
          <div className="rounded-[calc(var(--radius)+0.1rem)] border border-[var(--border)] bg-[var(--card)] p-4" key={stat.label}>
            <div className="flex items-center justify-between gap-3">
              <StatIcon label={stat.label} />
            </div>
            <p className="mt-4 text-4xl font-semibold tracking-tight text-[var(--foreground)]">{stat.value}</p>
            <p className="mt-1 text-sm text-[var(--muted-foreground)]">{stat.label}</p>
          </div>
        ))}
      </section>

      <div className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
        <section className="rounded-[calc(var(--radius)+0.35rem)] border border-[var(--border)] bg-[var(--card)]">
          <div className="border-b border-[var(--border)] px-5 py-4">
            <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-[var(--muted-foreground)]">최근 업데이트</h3>
          </div>
          <div className="divide-y divide-[var(--border)]">
            {dashboard.recentDocuments.length === 0 ? (
              <InlineEmptyState
                title="최근 변경 없음"
                description="아직 최근 변경 문서가 없습니다. 첫 문서가 생성되면 이 패널이 가장 먼저 움직입니다."
              />
            ) : (
              dashboard.recentDocuments.map((document) => (
                <button
                  className="flex w-full items-center gap-3 px-5 py-4 text-left transition-colors hover:bg-[var(--secondary)]/55"
                  key={document.id}
                  onClick={() => app.handleDocumentSelect(document.id)}
                  type="button"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium text-[var(--foreground)]">{document.title}</p>
                      <Badge variant="outline">{document.type}</Badge>
                      <Badge variant={statusBadgeVariant(document.freshnessStatus)}>
                        {translateLabel(document.freshnessStatus)}
                      </Badge>
                    </div>
                    <p className="mt-2 text-sm text-[var(--muted-foreground)]">
                      {document.owner?.avatarInitials ?? "HD"} · 업데이트 {formatDateTime(document.updatedAt)}
                    </p>
                  </div>
                  <ArrowRight className="size-4 text-[var(--muted-foreground)]" />
                </button>
              ))
            )}
          </div>
        </section>

        <div className="flex flex-col gap-5">
          <section className="rounded-[calc(var(--radius)+0.35rem)] border border-[var(--border)] bg-[var(--card)]">
            <div className="border-b border-[var(--border)] px-5 py-4">
              <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-[var(--muted-foreground)]">대기 중인 리뷰</h3>
            </div>
            <div className="divide-y divide-[var(--border)]">
              {dashboard.pendingReviews.length === 0 ? (
                <InlineEmptyState
                  title="열린 리뷰가 없습니다"
                  description="좋은 상태입니다. 리뷰 요청이 생기면 이 영역이 우선순위 큐 역할을 합니다."
                />
              ) : (
                dashboard.pendingReviews.map((review) => (
                  <button className="block w-full px-5 py-4 text-left transition-colors hover:bg-[var(--secondary)]/55" key={review.id} onClick={() => app.handleDocumentSelect(review.id)} type="button">
                    <p className="font-medium text-[var(--foreground)]">{review.title}</p>
                    <p className="mt-2 text-sm text-[var(--muted-foreground)]">
                      승인 {review.unresolvedApprovalCount}/{review.approvalCount}건
                    </p>
                  </button>
                ))
              )}
            </div>
          </section>

          <section className="rounded-[calc(var(--radius)+0.35rem)] border border-[var(--border)] bg-[var(--card)]">
            <div className="border-b border-[var(--border)] px-5 py-4">
              <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-[var(--muted-foreground)]">팀</h3>
            </div>
            <div className="divide-y divide-[var(--border)]">
              {dashboard.teamMembers.length === 0 ? (
                <InlineEmptyState
                  title="팀 멤버 정보 없음"
                  description="활성 멤버가 집계되면 역할과 승인 문맥이 이 패널에 표시됩니다."
                />
              ) : (
                dashboard.teamMembers.map((member) => (
                  <div className="flex items-center gap-3 px-5 py-4" key={member.id}>
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[color:color-mix(in_srgb,var(--primary)_16%,white)] text-xs font-semibold text-[var(--primary)]">
                      {member.avatarInitials}
                    </div>
                    <div>
                      <p className="font-medium text-[var(--foreground)]">{member.name}</p>
                      <p className="mt-1 text-sm capitalize text-[var(--muted-foreground)]">{member.role}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function StatIcon({ label }: { label: string }) {
  const iconClass = "size-4";

  switch (label) {
    case "전체 문서":
      return <FileText className={iconClass} />;
    case "초안":
      return <Clock3 className={iconClass} />;
    case "검토 중":
      return <Eye className={iconClass} />;
    case "승인됨":
      return <CheckCircle2 className={iconClass} />;
    case "발행됨":
      return <GitBranch className={iconClass} />;
    case "오래됨":
      return <TriangleAlert className={iconClass} />;
    default:
      return <Users className={iconClass} />;
  }
}

function EmptyGuideCard({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-[calc(var(--radius)+0.25rem)] border border-[var(--border)] bg-[var(--card)] p-5">
      <p className="font-medium text-[var(--foreground)]">{title}</p>
      <p className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">{description}</p>
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
