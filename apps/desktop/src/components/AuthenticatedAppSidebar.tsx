import {
  ArrowRightCircle,
  FilePlus2,
  FolderKanban,
  LogOut,
  PanelLeftOpen,
} from "lucide-react";
import { useClientActivityLog } from "@/components/ClientActivityLogProvider";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
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
  className,
  layout = "desktop",
  lastActiveWorkspaceId,
  onOpenArea,
  onOpenLastWorkspace,
  onSignOutRequest,
  user,
  workspaces,
}: {
  activeArea: OnboardingArea;
  className?: string;
  layout?: "desktop" | "drawer";
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
  const hasWorkspaces = workspaces.length > 0;

  return (
    <aside
      className={cn(
        "flex flex-col bg-[var(--sidebar-background)] text-[var(--sidebar-foreground)]",
        className ??
          (layout === "desktop"
            ? "sticky top-0 hidden h-screen w-64 shrink-0 xl:flex"
            : "min-h-full w-full"),
      )}
    >
      <div className="flex h-14 items-center border-b border-[var(--sidebar-border)] px-5">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded bg-[var(--sidebar-primary)]">
            <PanelLeftOpen className="h-4 w-4 text-[var(--sidebar-primary-foreground)]" />
          </div>
          <div>
            <span className="text-sm font-semibold text-[var(--sidebar-accent-foreground)]">Harness</span>
            <span className="text-sm font-semibold text-[var(--sidebar-primary)]"> Docs</span>
          </div>
        </div>
      </div>

      <div className="border-b border-[var(--sidebar-border)] px-3 py-3">
        <div className="rounded bg-[var(--sidebar-accent)] px-2 py-2">
          <p className="text-xs font-medium text-[var(--sidebar-accent-foreground)]">워크스페이스 접근</p>
          <p className="text-[10px] text-[var(--sidebar-muted)]">
            사용 가능 {workspaces.length}개
            {lastActiveWorkspaceId ? " · 최근 작업 있음" : " · 신규 진입"}
          </p>
        </div>
      </div>

      <div className="space-y-4 px-3 py-3">
        <div className="space-y-1">
          {navItems.map((item) => {
            const active = activeArea === item.area;

            return (
              <button
                className={cn(
                  "flex w-full flex-col items-start gap-1 rounded px-2.5 py-2.5 text-left transition-colors",
                  active
                    ? "bg-[var(--sidebar-accent)] text-[var(--sidebar-accent-foreground)]"
                    : "text-[var(--sidebar-foreground)] hover:bg-[color:color-mix(in_srgb,var(--sidebar-accent)_50%,transparent)] hover:text-[var(--sidebar-accent-foreground)]",
                )}
                key={item.area}
                onClick={() => {
                  logEvent({ action: `${item.title} 사이드바 CTA 클릭`, source: "authenticated-sidebar" });
                  if (item.area === "workspaces" && !hasWorkspaces) {
                    toast("아직 워크스페이스가 없습니다.", {
                      description: "먼저 워크스페이스를 만들거나 초대를 수락한 뒤 목록으로 돌아오세요.",
                      duration: 5000,
                      id: "workspace-list-empty-guide",
                    });
                  }

                  onOpenArea(item.area);
                }}
                type="button"
              >
                <div className="flex items-center gap-2.5">
                  <item.icon className="h-4 w-4 shrink-0" />
                  <span className="text-sm font-medium">{item.title}</span>
                </div>
                <span className="pl-6 text-[11px] leading-5 text-[var(--sidebar-muted)]">
                  {item.description}
                </span>
              </button>
            );
          })}
        </div>

        {hasWorkspaces ? (
          <button
            className="flex w-full items-center gap-2.5 rounded px-2.5 py-2 text-sm text-[var(--sidebar-foreground)] transition-colors hover:bg-[color:color-mix(in_srgb,var(--sidebar-accent)_50%,transparent)] hover:text-[var(--sidebar-accent-foreground)]"
            onClick={() => {
              logEvent({ action: "최근 워크스페이스 열기 CTA 클릭", source: "authenticated-sidebar" });
              onOpenLastWorkspace();
            }}
            type="button"
          >
            <FolderKanban className="h-4 w-4 shrink-0" />
            <span>최근 워크스페이스 열기</span>
          </button>
        ) : null}
      </div>

      <div
        className={cn(
          "space-y-0.5 border-t border-[var(--sidebar-border)] px-3 py-3",
          layout === "desktop" ? "mt-auto" : "mt-6",
        )}
      >
        <div
          className={cn(
            "flex items-center gap-2.5 px-2.5 py-2",
            layout === "drawer" && "rounded border border-[var(--sidebar-border)] bg-[var(--sidebar-accent)]/50",
          )}
        >
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--sidebar-primary)] text-xs font-medium text-[var(--sidebar-primary-foreground)]">
            {user?.avatarInitials ?? "HD"}
          </div>
          <div className="min-w-0">
            <p className="truncate text-xs font-medium text-[var(--sidebar-accent-foreground)]">
              {user?.name ?? "알 수 없는 사용자"}
            </p>
            <p className="truncate text-[10px] text-[var(--sidebar-muted)]">{user?.githubLogin ?? ""}</p>
          </div>
        </div>

        <button
          className={cn(
            "flex w-full items-center gap-2.5 rounded px-2.5 py-2 text-sm text-[var(--sidebar-foreground)] transition-colors hover:bg-[color:color-mix(in_srgb,var(--sidebar-accent)_50%,transparent)] hover:text-[var(--sidebar-accent-foreground)]",
            layout === "drawer" &&
              "mt-2 border border-transparent bg-[color:color-mix(in_srgb,var(--sidebar-accent)_28%,transparent)]",
          )}
          onClick={() => {
            logEvent({ action: "로그아웃 CTA 클릭", source: "authenticated-sidebar" });
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
