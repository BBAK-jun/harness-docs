import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useNavigate } from "@tanstack/react-router";
import { FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import type { WorkspaceShellModel } from "../hooks/useWorkspaceShell";
import type { NavigationArea } from "../types";
import { areaMeta } from "../pages/pageUtils";

export function WorkspaceLnb({
  app,
  onNavigate,
}: {
  app: WorkspaceShellModel;
  onNavigate?: () => void;
}) {
  const workspace = app.activeWorkspace!;
  const navigate = useNavigate();
  const documents = app.activeWorkspaceGraph?.documents ?? [];
  const members = app.activeWorkspaceGraph?.memberships ?? [];

  return (
    <div className="flex h-full flex-col rounded-[calc(var(--radius)+0.5rem)] bg-[var(--sidebar-background)] text-[var(--sidebar-foreground)] shadow-[0_40px_120px_-70px_rgba(15,23,42,0.75)]">
      <div className="flex items-center gap-3 border-b border-[var(--sidebar-border)] px-5 py-4">
        <div className="flex size-9 items-center justify-center rounded-xl bg-[var(--sidebar-primary)] text-[var(--sidebar-primary-foreground)]">
          <FileText className="size-4" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-[var(--sidebar-accent-foreground)]">Harness Docs</p>
          <p className="text-xs text-[var(--sidebar-muted)]">Workspace governance</p>
        </div>
      </div>

      <div className="border-b border-[var(--sidebar-border)] px-4 py-4">
        <div className="rounded-[calc(var(--radius)-0.15rem)] bg-[var(--sidebar-accent)] p-3">
          <div className="flex items-center gap-3">
            <Avatar className="size-9">
              <AvatarFallback>{app.user?.avatarInitials ?? "HD"}</AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-[var(--sidebar-accent-foreground)]">
                {workspace.name}
              </p>
              <p className="truncate text-xs text-[var(--sidebar-muted)]">{app.user?.githubLogin}</p>
            </div>
          </div>
          <p className="mt-3 text-xs leading-5 text-[var(--sidebar-foreground)]">
            {documents.length} documents · {members.length} members
          </p>
          <p className="mt-2 text-xs leading-5 text-[var(--sidebar-muted)]">{workspace.description}</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-4">
        {Object.entries(areaMeta).map(([key, meta]) => {
          const areaKey = key as NavigationArea;
          const Icon = meta.icon;

          return (
            <button
              className={cn(
                "flex w-full items-start gap-3 rounded-xl px-3 py-3 text-left transition-colors",
                areaKey === app.activeArea
                  ? "bg-[var(--sidebar-accent)] text-[var(--sidebar-accent-foreground)]"
                  : "text-[var(--sidebar-foreground)] hover:bg-[color:color-mix(in_srgb,var(--sidebar-accent)_68%,transparent)] hover:text-[var(--sidebar-accent-foreground)]",
              )}
              key={areaKey}
              onClick={() => {
                app.handleAreaChange(areaKey);
                onNavigate?.();
              }}
              type="button"
            >
              <Icon className="mt-0.5 size-4 shrink-0" />
              <span className="flex min-w-0 flex-col">
                <span className="text-sm font-medium">{meta.label}</span>
                <span className="mt-1 text-xs leading-5 text-[var(--sidebar-muted)]">
                  {meta.summary}
                </span>
              </span>
            </button>
          );
        })}
      </nav>

      <div className="space-y-2 border-t border-[var(--sidebar-border)] px-4 py-4">
        <Button
          className="w-full justify-start border-[var(--sidebar-border)] bg-transparent text-[var(--sidebar-accent-foreground)] hover:bg-[var(--sidebar-accent)]"
          onClick={() => app.handleWorkspaceLeave()}
          size="sm"
          variant="outline"
        >
          워크스페이스 목록
        </Button>
        <Button
          className="w-full justify-start text-[var(--sidebar-foreground)] hover:bg-[var(--sidebar-accent)] hover:text-[var(--sidebar-accent-foreground)]"
          onClick={() => {
            void navigate({ to: "/sign-out" });
          }}
          size="sm"
          variant="ghost"
        >
          로그아웃
        </Button>
      </div>
    </div>
  );
}
