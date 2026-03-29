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
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  useSidebar,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import type { WorkspaceShellModel } from "../hooks/useWorkspaceShell";
import type { NavigationArea } from "../types/contracts";

const navItems = [
  { title: "대시보드", area: "dashboard", icon: LayoutDashboard, activeAreas: ["dashboard"] },
  {
    title: "문서",
    area: "documents",
    icon: FileText,
    activeAreas: ["documents", "editor", "approvals"],
  },
  { title: "리뷰", area: "comments", icon: CheckCircle2, activeAreas: ["comments"] },
  { title: "발행", area: "publish", icon: GitBranch, activeAreas: ["publish"] },
  { title: "AI 어시스턴트", area: "ai", icon: Sparkles, activeAreas: ["ai"] },
] as const satisfies ReadonlyArray<{
  title: string;
  area: NavigationArea;
  icon: typeof LayoutDashboard;
  activeAreas: readonly NavigationArea[];
}>;

export function AppSidebar({
  app,
  onSignOutRequest,
}: {
  app: WorkspaceShellModel;
  onSignOutRequest: () => void;
}) {
  const { logEvent } = useClientActivityLog();
  const { state, toggleSidebar } = useSidebar();
  const documents = app.activeWorkspaceGraph?.documents ?? [];
  const members = app.activeWorkspaceGraph?.memberships ?? [];
  const workspace = app.activeWorkspace;
  const isCollapsed = state === "collapsed";

  return (
    <Sidebar collapsible="icon" variant="sidebar">
      <SidebarHeader className="gap-0 border-b border-[var(--sidebar-border)] bg-[var(--sidebar-background)] p-0 text-[var(--sidebar-foreground)]">
        <button
          aria-label={isCollapsed ? "사이드바 펼치기" : "사이드바 접기"}
          className={cn(
            "flex h-14 w-full items-center border-b border-[var(--sidebar-border)] px-5 text-left transition-colors hover:bg-[color:color-mix(in_srgb,var(--sidebar-accent)_38%,transparent)]",
            isCollapsed && "justify-center px-2",
          )}
          onClick={toggleSidebar}
          type="button"
        >
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded bg-[var(--sidebar-primary)]">
              <FileText className="h-4 w-4 text-[var(--sidebar-primary-foreground)]" />
            </div>
            {!isCollapsed ? (
              <div>
                <span className="text-sm font-semibold text-[var(--sidebar-accent-foreground)]">
                  Harness
                </span>
                <span className="text-sm font-semibold text-[var(--sidebar-primary)]"> Docs</span>
              </div>
            ) : null}
          </div>
        </button>

        {!isCollapsed ? (
          <div className="border-b border-[var(--sidebar-border)] px-3 py-3">
            <div className="rounded bg-[var(--sidebar-accent)] px-2 py-2">
              <p className="text-xs font-medium text-[var(--sidebar-accent-foreground)]">
                {workspace?.name ?? "워크스페이스"}
              </p>
              <p className="text-[10px] text-[var(--sidebar-muted)]">
                문서 {documents.length}개 · 멤버 {members.length}명
              </p>
            </div>
          </div>
        ) : null}
      </SidebarHeader>

      <SidebarContent className="gap-0 bg-[var(--sidebar-background)] px-3 py-3 text-[var(--sidebar-foreground)]">
        <nav className="flex-1 space-y-0.5">
          {navItems.map((item) => {
            const active = item.activeAreas.some((area) => area === app.activeArea);

            return (
              <button
                aria-label={item.title}
                className={cn(
                  "flex w-full items-center gap-2.5 rounded px-2.5 py-2 text-sm transition-colors",
                  isCollapsed && "justify-center px-2",
                  active
                    ? "bg-[var(--sidebar-accent)] font-medium text-[var(--sidebar-accent-foreground)]"
                    : "text-[var(--sidebar-foreground)] hover:bg-[color:color-mix(in_srgb,var(--sidebar-accent)_50%,transparent)] hover:text-[var(--sidebar-accent-foreground)]",
                )}
                key={item.area}
                onClick={() => {
                  logEvent({ action: `${item.title} 사이드바 CTA 클릭`, source: "app-sidebar" });
                  app.handleAreaChange(item.area);
                }}
                title={item.title}
                type="button"
              >
                <item.icon className="h-4 w-4 shrink-0" />
                {!isCollapsed ? <span>{item.title}</span> : null}
              </button>
            );
          })}
        </nav>
      </SidebarContent>

      <SidebarFooter className="gap-0 border-t border-[var(--sidebar-border)] bg-[var(--sidebar-background)] p-3 text-[var(--sidebar-foreground)]">
        <button
          aria-label="워크스페이스 목록"
          className={cn(
            "flex w-full items-center gap-2.5 rounded px-2.5 py-2 text-sm transition-colors hover:bg-[color:color-mix(in_srgb,var(--sidebar-accent)_50%,transparent)] hover:text-[var(--sidebar-accent-foreground)]",
            isCollapsed && "justify-center px-2",
          )}
          onClick={() => {
            logEvent({ action: "워크스페이스 목록 CTA 클릭", source: "app-sidebar" });
            app.handleWorkspaceLeave();
          }}
          title="워크스페이스 목록"
          type="button"
        >
          <Settings className="h-4 w-4 shrink-0" />
          {!isCollapsed ? <span>워크스페이스</span> : null}
        </button>

        <div
          className={cn(
            "mt-2 flex items-center gap-2.5 px-2.5 py-2",
            isCollapsed && "justify-center px-0",
          )}
        >
          <Avatar className="h-7 w-7 rounded-full">
            <AvatarFallback className="bg-[var(--sidebar-primary)] text-xs font-medium text-[var(--sidebar-primary-foreground)]">
              {app.user?.avatarInitials ?? "HD"}
            </AvatarFallback>
          </Avatar>
          {!isCollapsed ? (
            <div className="min-w-0">
              <p className="truncate text-xs font-medium text-[var(--sidebar-accent-foreground)]">
                {app.user?.name ?? "알 수 없는 사용자"}
              </p>
              <p className="truncate text-[10px] text-[var(--sidebar-muted)]">
                {app.user?.githubLogin ?? ""}
              </p>
            </div>
          ) : null}
        </div>

        <button
          aria-label="로그아웃"
          className={cn(
            "mt-2 flex w-full items-center gap-2.5 rounded px-2.5 py-2 text-sm transition-colors hover:bg-[color:color-mix(in_srgb,var(--sidebar-accent)_50%,transparent)] hover:text-[var(--sidebar-accent-foreground)]",
            isCollapsed && "justify-center px-2",
          )}
          onClick={() => {
            logEvent({ action: "로그아웃 CTA 클릭", source: "app-sidebar" });
            onSignOutRequest();
          }}
          title="로그아웃"
          type="button"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          {!isCollapsed ? <span>로그아웃</span> : null}
        </button>
      </SidebarFooter>
    </Sidebar>
  );
}
