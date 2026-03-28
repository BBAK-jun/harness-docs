import { useEffect } from "react";
import {
  BookOpenText,
  Bot,
  CheckCheck,
  FilePenLine,
  GitPullRequestArrow,
  RefreshCw,
  MessageSquareMore,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { showErrorToast } from "../lib/errorToast";
import type { WorkspaceShellModel } from "../hooks/useWorkspaceShell";
import type { NavigationArea, PublishPreflightFinding, WorkspaceDocument } from "../types";

export const areaMeta: Record<
  NavigationArea,
  {
    label: string;
    summary: string;
    icon: typeof BookOpenText;
  }
> = {
  dashboard: {
    label: "대시보드",
    summary: "최근 변경, 리뷰 대기, 팀 상태 요약",
    icon: RefreshCw,
  },
  documents: {
    label: "문서",
    summary: "문서 선택과 현재 워크스페이스 상태",
    icon: BookOpenText,
  },
  editor: {
    label: "편집기",
    summary: "명시적 잠금 소유권과 함께 보는 마크다운 원본/미리보기",
    icon: FilePenLine,
  },
  comments: {
    label: "리뷰",
    summary: "블록 댓글, 멘션, 열린 스레드 정리",
    icon: MessageSquareMore,
  },
  approvals: {
    label: "승인",
    summary: "앱 내부 승인자와 남은 진행 차단 요소",
    icon: CheckCheck,
  },
  publish: {
    label: "발행",
    summary: "전검증, 오래됨 사유 기록, GitHub PR 자동화",
    icon: GitPullRequestArrow,
  },
  ai: {
    label: "AI",
    summary: "Codex와 Claude 작업 진입점",
    icon: Bot,
  },
};

export function formatDateTime(value: string | null | undefined) {
  if (!value) {
    return "정보 없음";
  }

  return new Intl.DateTimeFormat("ko-KR", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

const labelMap: Record<string, string> = {
  active: "활성",
  archived: "보관됨",
  approved: "승인됨",
  attention: "주의 필요",
  authenticated: "인증됨",
  blocked: "차단됨",
  blocking: "차단",
  changes_requested: "수정 요청",
  comment_markdown: "댓글 마크다운",
  complete: "완료",
  current: "최신",
  delivered: "전달됨",
  document_content: "문서 내용",
  document_loaded: "문서 불러옴",
  document_links: "연결 문서",
  document: "문서",
  draft: "초안",
  eligible: "발행 가능",
  eligible_with_warnings: "경고와 함께 가능",
  expired: "만료됨",
  failed: "실패",
  fresh: "최신",
  github_import: "GitHub 가져오기",
  in_app: "앱 내",
  in_review: "검토 중",
  invalidated: "무효화됨",
  idle: "대기",
  lead: "리드",
  loading: "불러오는 중",
  metadata_refresh_required: "메타데이터 갱신 필요",
  missing: "누락",
  not_eligible: "발행 불가",
  not_requested: "요청되지 않음",
  open: "열림",
  optional_reviewer: "선택 리뷰어",
  pending: "대기 중",
  publish: "발행",
  publish_memo: "발행 메모",
  proposed: "제안됨",
  published: "발행됨",
  publishing: "발행 중",
  publish_attempted: "발행 시도",
  publish_failed: "발행 실패",
  publish_started: "발행 시작",
  publish_succeeded: "발행 성공",
  queued: "대기열 등록",
  read: "읽음",
  ready: "준비됨",
  ready_to_publish: "발행 준비됨",
  ready_for_publish: "발행 준비 완료",
  ready_with_warnings: "경고와 함께 준비됨",
  released: "해제됨",
  removed: "제거됨",
  requires_rationale: "사유 필요",
  resolved: "해결됨",
  restored: "복원됨",
  review_requested: "검토 요청됨",
  stale: "오래됨",
  success: "성공",
  suspended: "중단됨",
  sync_required: "동기화 필요",
  sync_completed: "동기화 완료",
  sync_requested: "동기화 요청",
  system: "시스템",
  stale_requires_rationale: "오래됨 사유 필요",
  template: "템플릿",
  validation_required: "검증 필요",
  warning: "경고",
  webhook: "웹훅",
  approver_suggestions: "승인자 제안",
  workspace: "워크스페이스",
  workspace_membership: "워크스페이스 멤버십",
  allowed: "허용됨",
};

const reasonCodeMap: Record<string, string> = {
  active_edit_lock: "활성 편집 잠금",
  approval_invalidated: "승인 무효화",
  approval_missing: "승인 누락",
  approval_pending: "승인 대기",
  changes_requested: "수정 요청",
  github_auth_required: "GitHub 인증 필요",
  linked_document_updated: "연결 문서 변경됨",
  missing_repository_binding: "저장소 연결 누락",
  publish_evaluation_pending: "발행 평가 대기",
  review_request_required: "검토 요청 필요",
  stale_rationale: "오래됨 사유",
  stale_rationale_required: "오래됨 사유 기록 필요",
  unresolved_approval: "미해결 승인",
  rationale_provided: "사유 제공됨",
};

const documentTypeMap: Record<string, string> = {
  PRD: "PRD",
  "Policy/Decision": "정책/의사결정",
  "Technical Spec": "기술 명세",
  "UX Flow": "UX 흐름",
};

const roleMap: Record<string, string> = {
  Editor: "편집자",
  Lead: "리드",
  Reviewer: "리뷰어",
};

export function translateLabel(value: string) {
  return labelMap[value] ?? value;
}

export function translateReasonCode(value: string) {
  return reasonCodeMap[value] ?? translateLabel(value);
}

export function translateDocumentType(value: string) {
  return documentTypeMap[value] ?? value;
}

export function translateWorkspaceRole(value: string) {
  return roleMap[value] ?? value;
}

export function statusBadgeVariant(status: string) {
  if (
    status.includes("approved") ||
    status.includes("published") ||
    status.includes("ready") ||
    status.includes("current") ||
    status.includes("authenticated") ||
    status.includes("success")
  ) {
    return "success" as const;
  }

  if (
    status.includes("warning") ||
    status.includes("stale") ||
    status.includes("pending") ||
    status.includes("attention")
  ) {
    return "warning" as const;
  }

  if (
    status.includes("blocked") ||
    status.includes("blocking") ||
    status.includes("changes_requested") ||
    status.includes("failed")
  ) {
    return "destructive" as const;
  }

  return "secondary" as const;
}

export function pageTitle(area: NavigationArea, document: WorkspaceDocument | null) {
  if (area === "dashboard") {
    return "워크스페이스 개요";
  }

  if (area === "editor" && document) {
    return document.title;
  }

  if (area === "comments" && document) {
    return `${document.title} 리뷰`;
  }

  if (area === "approvals" && document) {
    return `${document.title} 승인`;
  }

  if (area === "publish") {
    return "발행";
  }

  if (area === "ai") {
    return "AI 작업";
  }

  return "문서";
}

export function pageDescription(area: NavigationArea) {
  switch (area) {
    case "dashboard":
      return "워크스페이스 전체 상태와 지금 열어야 할 문서를 먼저 확인합니다.";
    case "documents":
      return "작업할 문서를 선택하세요.";
    case "editor":
      return "한 문서를 원본과 미리보기 중심으로 편집합니다.";
    case "comments":
      return "리뷰 피드백과 다음 답변에 집중합니다.";
    case "approvals":
      return "진행을 막는 승인 상태만 확인합니다.";
    case "publish":
      return "이 발행 배치를 검증하고 준비되면 실행합니다.";
    case "ai":
      return "AI 작업 하나를 선택해 명확하게 실행합니다.";
  }
}

export function pageHierarchy(area: NavigationArea, document: WorkspaceDocument | null) {
  if (area === "dashboard") {
    return ["대시보드"];
  }

  if (area === "documents") {
    return document ? ["문서", document.title] : ["문서"];
  }

  if (area === "editor") {
    return document ? ["문서", document.title, "편집기"] : ["문서", "편집기"];
  }

  if (area === "comments") {
    return document ? ["문서", document.title, "리뷰"] : ["문서", "리뷰"];
  }

  if (area === "approvals") {
    return document ? ["문서", document.title, "승인"] : ["문서", "승인"];
  }

  if (area === "publish") {
    return ["발행"];
  }

  return ["AI 작업"];
}

export function SignalTile({
  label,
  value,
  description,
}: {
  label: string;
  value: number;
  description: string;
}) {
  return (
    <div className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] p-4">
      <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted-foreground)]">{label}</p>
      <p className="mt-3 text-3xl font-semibold tracking-tight text-[var(--foreground)]">{value}</p>
      <p className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">{description}</p>
    </div>
  );
}

export function MetricTile({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return <SignalTile description="" label={label} value={value} />;
}

export function EmptyStateCard({
  title,
  description,
  actions,
}: {
  title: string;
  description: string;
  actions?: React.ReactNode;
}) {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="border-b border-[var(--border)]">
        <Badge className="w-fit" variant="outline">
          상태
        </Badge>
        <CardTitle className="mt-2 text-2xl">{title}</CardTitle>
        <CardDescription className="max-w-2xl text-base">{description}</CardDescription>
      </CardHeader>
      {actions ? (
        <div className="px-6 py-5">
          <div className="flex flex-wrap gap-2">{actions}</div>
        </div>
      ) : null}
    </Card>
  );
}

export function RouteErrorStateCard({
  title,
  description,
  errorMessage,
  onRetry,
  secondaryAction,
}: {
  title: string;
  description: string;
  errorMessage: string;
  onRetry: () => void;
  secondaryAction?: React.ReactNode;
}) {
  useEffect(() => {
    showErrorToast({
      title,
      description: errorMessage,
    });
  }, [errorMessage, title]);

  return (
    <main className="app-frame min-h-screen p-4 sm:p-6">
      <div className="mx-auto max-w-4xl">
        <Card className="overflow-hidden">
          <CardHeader className="border-b border-[var(--border)]">
            <Badge className="w-fit" variant="destructive">
              오류
            </Badge>
            <CardTitle className="mt-2 text-3xl">{title}</CardTitle>
            <CardDescription className="max-w-2xl text-base">{description}</CardDescription>
          </CardHeader>
          <div className="px-6 py-6">
            <div className="rounded-[var(--radius)] border border-[var(--destructive)]/20 bg-[color:color-mix(in_srgb,var(--destructive)_8%,transparent)] p-4 text-sm leading-6 text-[var(--muted-foreground)]">
              {errorMessage}
            </div>
            <div className="flex flex-wrap gap-2 pt-2">
              <Button onClick={onRetry}>다시 시도</Button>
              {secondaryAction}
            </div>
          </div>
        </Card>
      </div>
    </main>
  );
}

export function PreflightFindingCard({
  finding,
}: {
  finding: PublishPreflightFinding;
}) {
  return (
    <div className="rounded-[calc(var(--radius)+0.25rem)] border border-[var(--border)] bg-[var(--surface)] p-4">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant={statusBadgeVariant(finding.severity)}>{finding.severity}</Badge>
        <Badge variant="outline">{finding.kind}</Badge>
      </div>
      <p className="mt-3 font-medium text-[var(--foreground)]">{finding.label}</p>
      <p className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">{finding.summary}</p>
      <div className="mt-3 flex items-start gap-2 rounded-[var(--radius)] border border-dashed border-[var(--border)] p-3 text-sm text-[var(--muted-foreground)]">
        <RefreshCw className="mt-0.5 size-4 shrink-0" />
        <span>{finding.requiredAction}</span>
      </div>
    </div>
  );
}

export type AppPageProps = {
  app: WorkspaceShellModel;
};
