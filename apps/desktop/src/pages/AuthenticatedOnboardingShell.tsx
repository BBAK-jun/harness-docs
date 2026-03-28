import { useState } from "react";
import { Menu } from "lucide-react";
import { overlay } from "overlay-kit";
import { useNavigate } from "@tanstack/react-router";
import { AppLayout } from "@/components/AppLayout";
import { AuthenticatedAppSidebar } from "@/components/AuthenticatedAppSidebar";
import { SignOutConfirmOverlay } from "@/components/overlays/SignOutConfirmOverlay";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { WorkspaceSummary } from "../types";

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
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
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
      lastActiveWorkspaceId={lastActiveWorkspaceId}
      onOpenArea={onOpenArea}
      onOpenLastWorkspace={onOpenLastWorkspace}
      onSignOutRequest={() => void handleSignOutRequest()}
      user={user}
      workspaces={workspaces}
    />
  );

  return (
    <AppLayout sidebar={sidebar}>
      <main className="app-frame min-h-screen p-3 sm:p-4">
        <div className="flex min-h-[calc(100vh-2rem)] w-full gap-4">
          <Sheet onOpenChange={setMobileNavOpen} open={mobileNavOpen}>
            <SheetContent side="left">
              <SheetHeader>
                <SheetTitle>앱 탐색</SheetTitle>
                <SheetDescription>인증 이후에도 온보딩 액션을 전환할 수 있습니다.</SheetDescription>
              </SheetHeader>
              <div className="mt-4">{sidebar}</div>
            </SheetContent>
          </Sheet>

          <section className="min-w-0 flex-1 rounded-[calc(var(--radius)+0.75rem)] border border-[var(--border)] bg-[rgba(255,255,255,0.55)] p-4 shadow-[0_30px_120px_-80px_rgba(15,23,42,0.45)] backdrop-blur-xl sm:p-5">
            <header className="mb-4 flex items-center justify-between gap-3 xl:hidden">
              <Button onClick={() => setMobileNavOpen(true)} size="sm" variant="outline">
                <Menu data-icon="inline-start" />
                메뉴
              </Button>
              <div className="min-w-0 text-right">
                <p className="truncate font-medium text-[var(--foreground)]">워크스페이스 접근</p>
                <p className="truncate text-xs uppercase tracking-[0.14em] text-[var(--muted-foreground)]">
                  워크스페이스 &gt; {active.label}
                </p>
                <p className="truncate text-sm text-[var(--muted-foreground)]">{active.description}</p>
              </div>
            </header>

            {children}
          </section>
        </div>
      </main>
    </AppLayout>
  );
}
