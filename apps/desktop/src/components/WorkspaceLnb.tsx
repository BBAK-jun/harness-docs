import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useNavigate } from "@tanstack/react-router";
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

  return (
    <div className="flex flex-col gap-4 rounded-[calc(var(--radius)+0.75rem)] border border-[var(--app-border-strong)] bg-[rgba(255,255,255,0.82)] p-4 shadow-[0_30px_100px_-60px_rgba(15,23,42,0.35)] backdrop-blur-xl">
      <div className="flex items-center gap-3">
        <Avatar className="size-10">
          <AvatarFallback>{app.user?.avatarInitials ?? "HD"}</AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <p className="truncate font-semibold text-[var(--foreground)]">{workspace.name}</p>
          <p className="truncate text-sm text-[var(--muted-foreground)]">{app.user?.githubLogin}</p>
        </div>
      </div>

      <div className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] p-4">
        <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
          Workspace
        </p>
        <p className="mt-3 text-sm leading-6 text-[var(--foreground)]">{workspace.description}</p>
      </div>

      <nav className="flex flex-col gap-2">
        {Object.entries(areaMeta).map(([key, meta]) => {
          const areaKey = key as NavigationArea;
          const Icon = meta.icon;

          return (
            <button
              className={cn(
                "flex items-start gap-3 rounded-[calc(var(--radius)+0.25rem)] border px-3 py-3 text-left transition-colors",
                areaKey === app.activeArea
                  ? "border-[var(--app-border-strong)] bg-[var(--secondary)]"
                  : "border-transparent hover:border-[var(--border)] hover:bg-[var(--surface)]",
              )}
              key={areaKey}
              onClick={() => {
                app.handleAreaChange(areaKey);
                onNavigate?.();
              }}
              type="button"
            >
              <Icon className="mt-0.5 size-4 text-[var(--muted-foreground)]" />
              <span className="flex min-w-0 flex-col gap-1">
                <span className="font-medium text-[var(--foreground)]">{meta.label}</span>
                <span className="text-xs leading-5 text-[var(--muted-foreground)]">
                  {meta.summary}
                </span>
              </span>
            </button>
          );
        })}
      </nav>

      <div className="flex flex-col gap-2">
        <Button onClick={() => app.handleWorkspaceLeave()} size="sm" variant="outline">
          Workspaces
        </Button>
        <Button
          onClick={() => {
            void navigate({ to: "/sign-out" });
          }}
          size="sm"
          variant="ghost"
        >
          Sign out
        </Button>
      </div>
    </div>
  );
}
