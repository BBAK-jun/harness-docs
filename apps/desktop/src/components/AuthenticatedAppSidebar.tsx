import { ArrowRightCircle, FilePlus2, FolderKanban, LogOut, PanelLeftOpen } from "lucide-react";
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
import { toast } from "sonner";
import type { WorkspaceSummary } from "../types/contracts";

type OnboardingArea = "workspaces" | "workspace-create" | "invitation-acceptance";

const navItems = [
  {
    title: "워크스페이스 목록",
    description: "참여 가능한 워크스페이스와 상태 확인",
    area: "workspaces",
    icon: FolderKanban,
  },
  {
    title: "워크스페이스 만들기",
    description: "새 문서 운영 공간 생성",
    area: "workspace-create",
    icon: FilePlus2,
  },
  {
    title: "초대 수락",
    description: "팀 초대 흐름과 접근 연결",
    area: "invitation-acceptance",
    icon: ArrowRightCircle,
  },
] as const satisfies ReadonlyArray<{
  title: string;
  description: string;
  area: OnboardingArea;
  icon: typeof FolderKanban;
}>;

export function AuthenticatedAppSidebar({
  activeArea,
  lastActiveWorkspaceId,
  onOpenArea,
  onOpenLastWorkspace,
  onSignOutRequest,
  user,
  workspaces,
}: {
  activeArea: OnboardingArea;
  lastActiveWorkspaceId: string | null;
  onOpenArea: (area: OnboardingArea) => void;
  onOpenLastWorkspace: () => void;
  onSignOutRequest: () => void;
  user: {
    name: string;
    githubLogin: string;
    avatarInitials: string;
  } | null;
  workspaces: WorkspaceSummary[];
}) {
  const { logEvent } = useClientActivityLog();
  const { state, toggleSidebar } = useSidebar();
  const hasWorkspaces = workspaces.length > 0;
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
              <PanelLeftOpen className="h-4 w-4 text-[var(--sidebar-primary-foreground)]" />
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
                워크스페이스 접근
              </p>
              <p className="text-[10px] text-[var(--sidebar-muted)]">
                사용 가능 {workspaces.length}개
                {lastActiveWorkspaceId ? " · 최근 작업 있음" : " · 신규 진입"}
              </p>
            </div>
          </div>
        ) : null}
      </SidebarHeader>

      <SidebarContent className="gap-0 bg-[var(--sidebar-background)] px-3 py-3 text-[var(--sidebar-foreground)]">
        <div className="space-y-4">
          <div className="space-y-1">
            {navItems.map((item) => {
              const active = activeArea === item.area;

              return (
                <button
                  aria-label={item.title}
                  className={cn(
                    "flex w-full items-start gap-2.5 rounded px-2.5 py-2.5 text-left transition-colors",
                    isCollapsed && "justify-center px-2",
                    active
                      ? "bg-[var(--sidebar-accent)] text-[var(--sidebar-accent-foreground)]"
                      : "text-[var(--sidebar-foreground)] hover:bg-[color:color-mix(in_srgb,var(--sidebar-accent)_50%,transparent)] hover:text-[var(--sidebar-accent-foreground)]",
                  )}
                  key={item.area}
                  onClick={() => {
                    logEvent({
                      action: `${item.title} 사이드바 CTA 클릭`,
                      source: "authenticated-sidebar",
                    });
                    if (item.area === "workspaces" && !hasWorkspaces) {
                      toast("아직 워크스페이스가 없습니다.", {
                        description:
                          "먼저 워크스페이스를 만들거나 초대를 수락한 뒤 목록으로 돌아오세요.",
                        duration: 5000,
                        id: "workspace-list-empty-guide",
                      });
                    }

                    onOpenArea(item.area);
                  }}
                  title={item.title}
                  type="button"
                >
                  <item.icon className="mt-0.5 h-4 w-4 shrink-0" />
                  {!isCollapsed ? (
                    <span className="flex min-w-0 flex-col">
                      <span className="text-sm font-medium">{item.title}</span>
                      <span className="mt-1 text-[11px] leading-5 text-[var(--sidebar-muted)]">
                        {item.description}
                      </span>
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>

          {hasWorkspaces ? (
            <button
              aria-label="최근 워크스페이스 열기"
              className={cn(
                "flex w-full items-center gap-2.5 rounded px-2.5 py-2 text-sm text-[var(--sidebar-foreground)] transition-colors hover:bg-[color:color-mix(in_srgb,var(--sidebar-accent)_50%,transparent)] hover:text-[var(--sidebar-accent-foreground)]",
                isCollapsed && "justify-center px-2",
              )}
              onClick={() => {
                logEvent({
                  action: "최근 워크스페이스 열기 CTA 클릭",
                  source: "authenticated-sidebar",
                });
                onOpenLastWorkspace();
              }}
              title="최근 워크스페이스 열기"
              type="button"
            >
              <FolderKanban className="h-4 w-4 shrink-0" />
              {!isCollapsed ? <span>최근 워크스페이스 열기</span> : null}
            </button>
          ) : null}
        </div>
      </SidebarContent>

      <SidebarFooter className="gap-0 border-t border-[var(--sidebar-border)] bg-[var(--sidebar-background)] p-3 text-[var(--sidebar-foreground)]">
        <div
          className={cn(
            "flex items-center gap-2.5 px-2.5 py-2",
            isCollapsed && "justify-center px-0",
          )}
        >
          <Avatar className="h-7 w-7 rounded-full">
            <AvatarFallback className="bg-[var(--sidebar-primary)] text-xs font-medium text-[var(--sidebar-primary-foreground)]">
              {user?.avatarInitials ?? "HD"}
            </AvatarFallback>
          </Avatar>
          {!isCollapsed ? (
            <div className="min-w-0">
              <p className="truncate text-xs font-medium text-[var(--sidebar-accent-foreground)]">
                {user?.name ?? "알 수 없는 사용자"}
              </p>
              <p className="truncate text-[10px] text-[var(--sidebar-muted)]">
                {user?.githubLogin ?? ""}
              </p>
            </div>
          ) : null}
        </div>

        <button
          aria-label="로그아웃"
          className={cn(
            "mt-2 flex w-full items-center gap-2.5 rounded px-2.5 py-2 text-sm text-[var(--sidebar-foreground)] transition-colors hover:bg-[color:color-mix(in_srgb,var(--sidebar-accent)_50%,transparent)] hover:text-[var(--sidebar-accent-foreground)]",
            isCollapsed && "justify-center px-2",
          )}
          onClick={() => {
            logEvent({ action: "로그아웃 CTA 클릭", source: "authenticated-sidebar" });
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
