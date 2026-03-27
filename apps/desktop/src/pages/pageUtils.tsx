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
  documents: {
    label: "Documents",
    summary: "Document selection and current workspace state",
    icon: BookOpenText,
  },
  editor: {
    label: "Editor",
    summary: "Markdown source and preview with explicit lock ownership",
    icon: FilePenLine,
  },
  comments: {
    label: "Reviews",
    summary: "Block comments, mentions, and open thread triage",
    icon: MessageSquareMore,
  },
  approvals: {
    label: "Approvals",
    summary: "App-native approvers and remaining blockers",
    icon: CheckCheck,
  },
  publish: {
    label: "Publish",
    summary: "Preflight, stale rationale, and GitHub PR automation",
    icon: GitPullRequestArrow,
  },
  ai: {
    label: "AI",
    summary: "Codex and Claude action entry points",
    icon: Bot,
  },
};

export function formatDateTime(value: string | null | undefined) {
  if (!value) {
    return "Not available";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
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
  if (area === "editor" && document) {
    return document.title;
  }

  if (area === "comments" && document) {
    return `Review ${document.title}`;
  }

  if (area === "approvals" && document) {
    return `Approve ${document.title}`;
  }

  if (area === "publish") {
    return "Publish";
  }

  if (area === "ai") {
    return "AI Actions";
  }

  return "Documents";
}

export function pageDescription(area: NavigationArea) {
  switch (area) {
    case "documents":
      return "Select the document you want to work on.";
    case "editor":
      return "Edit a single document with source and preview only.";
    case "comments":
      return "Focus on review feedback and the next reply.";
    case "approvals":
      return "See only the approval state that blocks progress.";
    case "publish":
      return "Validate this publish batch and execute when ready.";
    case "ai":
      return "Choose one AI task and run it deliberately.";
  }
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
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
        {actions ? <div className="pt-2">{actions}</div> : null}
      </CardHeader>
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
  return (
    <main className="app-frame min-h-screen p-4 sm:p-6">
      <div className="mx-auto max-w-3xl">
        <Card>
          <CardHeader>
            <CardTitle>{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
            <div className="rounded-[var(--radius)] border border-[var(--destructive)]/20 bg-[color:color-mix(in_srgb,var(--destructive)_8%,transparent)] p-4 text-sm leading-6 text-[var(--muted-foreground)]">
              {errorMessage}
            </div>
            <div className="flex flex-wrap gap-2 pt-2">
              <Button onClick={onRetry}>다시 시도</Button>
              {secondaryAction}
            </div>
          </CardHeader>
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
