import {
  CheckCircle2,
  FileText,
  GitBranch,
  LayoutDashboard,
  LogOut,
  Settings,
  Sparkles,
} from "lucide-react";
import { useClientActivityLog } from "@/components/ClientActivityLogProvider";
import { cn } from "@/lib/utils";
import type { WorkspaceShellModel } from "../hooks/useWorkspaceShell";

const navItems = [
  { title: "대시보드", area: "dashboard", icon: LayoutDashboard },
  { title: "문서", area: "documents", icon: FileText },
  { title: "리뷰", area: "comments", icon: CheckCircle2 },
  { title: "발행", area: "publish", icon: GitBranch },
  { title: "AI 어시스턴트", area: "ai", icon: Sparkles },
] as const;

export function AppSidebar({
  app,
  className,
  layout = "desktop",
  onSignOutRequest,
}: {
  app: WorkspaceShellModel;
  className?: string;
  layout?: "desktop" | "drawer";
  onSignOutRequest: () => void;
}) {
  const { logEvent } = useClientActivityLog();
  const documents = app.activeWorkspaceGraph?.documents ?? [];
  const members = app.activeWorkspaceGraph?.memberships ?? [];

  const isActive = (area: (typeof navItems)[number]["area"]) => app.activeArea === area;

  return (
    <aside
      className={cn(
        "flex flex-col bg-[var(--sidebar-background)] text-[var(--sidebar-foreground)]",
        className ??
          (layout === "desktop"
            ? "sticky top-0 hidden h-screen w-56 shrink-0 xl:flex"
            : "min-h-full w-full"),
      )}
    >
      <div className="flex h-14 items-center border-b border-[var(--sidebar-border)] px-5">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded bg-[var(--sidebar-primary)]">
            <FileText className="h-4 w-4 text-[var(--sidebar-primary-foreground)]" />
          </div>
          <div>
            <span className="text-sm font-semibold text-[var(--sidebar-accent-foreground)]">Harness</span>
            <span className="text-sm font-semibold text-[var(--sidebar-primary)]"> Docs</span>
          </div>
        </div>
      </div>

      <div className="border-b border-[var(--sidebar-border)] px-3 py-3">
        <div className="rounded bg-[var(--sidebar-accent)] px-2 py-2">
          <p className="text-xs font-medium text-[var(--sidebar-accent-foreground)]">
            {app.activeWorkspace?.name ?? "워크스페이스"}
          </p>
          <p className="text-[10px] text-[var(--sidebar-muted)]">
            문서 {documents.length}개 · 멤버 {members.length}명
          </p>
        </div>
      </div>

      <nav className="flex-1 space-y-0.5 px-3 py-3">
        {navItems.map((item) => (
          <button
            key={item.area}
            className={cn(
              "flex w-full items-center gap-2.5 rounded px-2.5 py-2 text-sm transition-colors",
              isActive(item.area)
                ? "bg-[var(--sidebar-accent)] font-medium text-[var(--sidebar-accent-foreground)]"
                : "text-[var(--sidebar-foreground)] hover:bg-[color:color-mix(in_srgb,var(--sidebar-accent)_50%,transparent)] hover:text-[var(--sidebar-accent-foreground)]",
            )}
            onClick={() => {
              logEvent({ action: `${item.title} 사이드바 CTA 클릭`, source: "app-sidebar" });
              app.handleAreaChange(item.area);
            }}
            type="button"
          >
            <item.icon className="h-4 w-4 shrink-0" />
            <span>{item.title}</span>
          </button>
        ))}
      </nav>

      <div
        className={cn(
          "space-y-0.5 border-t border-[var(--sidebar-border)] px-3 py-3",
          layout === "desktop" ? "mt-auto" : "mt-6",
        )}
      >
        <button
          className="flex w-full items-center gap-2.5 rounded px-2.5 py-2 text-sm text-[var(--sidebar-foreground)] transition-colors hover:bg-[color:color-mix(in_srgb,var(--sidebar-accent)_50%,transparent)] hover:text-[var(--sidebar-accent-foreground)]"
          onClick={() => {
            logEvent({ action: "워크스페이스 목록 CTA 클릭", source: "app-sidebar" });
            app.handleWorkspaceLeave();
          }}
          type="button"
        >
          <Settings className="h-4 w-4 shrink-0" />
          <span>워크스페이스</span>
        </button>

        <div
          className={cn(
            "mt-2 flex items-center gap-2.5 px-2.5 py-2",
            layout === "drawer" && "rounded border border-[var(--sidebar-border)] bg-[var(--sidebar-accent)]/50",
          )}
        >
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--sidebar-primary)] text-xs font-medium text-[var(--sidebar-primary-foreground)]">
            {app.user?.avatarInitials ?? "HD"}
          </div>
          <div className="min-w-0">
            <p className="truncate text-xs font-medium text-[var(--sidebar-accent-foreground)]">
              {app.user?.name ?? "알 수 없는 사용자"}
            </p>
            <p className="truncate text-[10px] text-[var(--sidebar-muted)]">
              {app.user?.githubLogin ?? ""}
            </p>
          </div>
        </div>

        <button
          className={cn(
            "flex w-full items-center gap-2.5 rounded px-2.5 py-2 text-sm text-[var(--sidebar-foreground)] transition-colors hover:bg-[color:color-mix(in_srgb,var(--sidebar-accent)_50%,transparent)] hover:text-[var(--sidebar-accent-foreground)]",
            layout === "drawer" &&
              "mt-2 border border-transparent bg-[color:color-mix(in_srgb,var(--sidebar-accent)_28%,transparent)]",
          )}
          onClick={() => {
            logEvent({ action: "로그아웃 CTA 클릭", source: "app-sidebar" });
            onSignOutRequest();
          }}
          type="button"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          <span>로그아웃</span>
        </button>
      </div>
    </aside>
  );
}
