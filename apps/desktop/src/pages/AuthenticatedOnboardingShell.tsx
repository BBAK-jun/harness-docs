import { overlay } from "overlay-kit";
import { useNavigate } from "@tanstack/react-router";
import { AppShellFrame } from "@/components/AppShellFrame";
import { AuthenticatedAppSidebar } from "@/components/AuthenticatedAppSidebar";
import { SignOutConfirmOverlay } from "@/components/overlays/SignOutConfirmOverlay";
import type { WorkspaceSummary } from "../types/contracts";

type OnboardingArea = "workspaces" | "workspace-create" | "invitation-acceptance";

const areaMeta: Record<OnboardingArea, { label: string; description: string }> = {
  workspaces: {
    label: "워크스페이스 접근",
    description: "참여 중인 워크스페이스를 선택하거나 다음 온보딩 액션으로 이동합니다.",
  },
  "workspace-create": {
    label: "워크스페이스 생성",
    description: "새 워크스페이스를 만들고 바로 대시보드로 진입할 수 있습니다.",
  },
  "invitation-acceptance": {
    label: "초대 수락",
    description: "초대 흐름과 멤버십 연결 상태를 확인하고 다음 단계로 이동합니다.",
  },
};

export function AuthenticatedOnboardingShell({
  activeArea,
  children,
  lastActiveWorkspaceId,
  onOpenArea,
  onOpenLastWorkspace,
  onSignOut,
  user,
  workspaces,
}: {
  activeArea: OnboardingArea;
  children: React.ReactNode;
  lastActiveWorkspaceId: string | null;
  onOpenArea: (area: OnboardingArea) => void;
  onOpenLastWorkspace: () => void;
  onSignOut: () => Promise<void>;
  user: {
    name: string;
    githubLogin: string;
    avatarInitials: string;
  } | null;
  workspaces: WorkspaceSummary[];
}) {
  const navigate = useNavigate();
  const active = areaMeta[activeArea];

  const handleSignOutRequest = async () => {
    const shouldSignOut = await overlay.openAsync<boolean>(({ isOpen, close, unmount }) => (
      <SignOutConfirmOverlay
        close={close}
        isOpen={isOpen}
        onConfirm={onSignOut}
        unmount={unmount}
      />
    ));

    if (!shouldSignOut) {
      return;
    }

    await navigate({ to: "/sign-in" });
  };

  const sidebar = (
    <AuthenticatedAppSidebar
      activeArea={activeArea}
      className="sticky top-0 hidden h-screen w-64 shrink-0 xl:flex"
      lastActiveWorkspaceId={lastActiveWorkspaceId}
      onOpenArea={onOpenArea}
      onOpenLastWorkspace={onOpenLastWorkspace}
      onSignOutRequest={() => void handleSignOutRequest()}
      user={user}
      workspaces={workspaces}
    />
  );

  return (
    <AppShellFrame
      mobileMeta={{
        eyebrow: "워크스페이스 접근",
        title: `워크스페이스 > ${active.label}`,
        description: active.description,
      }}
      mobileNavigation={{
        content: (
          <AuthenticatedAppSidebar
            activeArea={activeArea}
            className="h-full w-full"
            layout="drawer"
            lastActiveWorkspaceId={lastActiveWorkspaceId}
            onOpenArea={onOpenArea}
            onOpenLastWorkspace={onOpenLastWorkspace}
            onSignOutRequest={() => void handleSignOutRequest()}
            user={user}
            workspaces={workspaces}
          />
        ),
        description: "로그인 이후에도 온보딩 단계와 다른 액션 사이를 이동할 수 있습니다.",
        title: "앱 메뉴",
      }}
      sidebar={sidebar}
    >
      {children}
    </AppShellFrame>
  );
}
