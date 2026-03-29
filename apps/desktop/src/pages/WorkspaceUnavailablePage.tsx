import { AlertTriangle } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { CompactPrimaryPageAction, CompactSecondaryPageAction } from "@/components/pageActions";
import { PanelCard, PanelCardFooter, PanelCardHeader } from "@/components/pagePanels";
import { CardDescription, CardTitle } from "@/components/ui/card";
import type { WorkspaceShellModel } from "../hooks/useWorkspaceShell";

export function WorkspaceUnavailablePage({ app }: { app: WorkspaceShellModel }) {
  const navigate = useNavigate();

  return (
    <main className="app-frame flex min-h-screen items-center justify-center p-6">
      <PanelCard className="w-full max-w-2xl">
        <PanelCardHeader>
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-full bg-[var(--warning-soft)] text-[var(--warning-foreground)]">
              <AlertTriangle className="size-5" />
            </div>
            <div>
              <CardTitle>활성 워크스페이스 없음</CardTitle>
              <CardDescription>
                로그인은 유지되지만 활성 워크스페이스 멤버십이 없습니다. 워크스페이스 생성이나 초대
                수락 흐름으로 이동할 수 있습니다.
              </CardDescription>
            </div>
          </div>
        </PanelCardHeader>
        <PanelCardFooter className="flex-wrap gap-2 pt-6">
          <CompactPrimaryPageAction
            clientLog="워크스페이스 만들기"
            onClick={() => {
              void navigate({ to: "/workspace-create" });
            }}
          >
            워크스페이스 만들기
          </CompactPrimaryPageAction>
          <CompactSecondaryPageAction
            clientLog="초대 수락"
            onClick={() => {
              void navigate({ to: "/invitation-acceptance", search: { code: "" } });
            }}
          >
            초대 수락
          </CompactSecondaryPageAction>
          <CompactSecondaryPageAction
            clientLog="로그아웃 페이지"
            onClick={() => {
              void navigate({ to: "/sign-out" });
            }}
          >
            로그아웃 페이지
          </CompactSecondaryPageAction>
        </PanelCardFooter>
      </PanelCard>
    </main>
  );
}
