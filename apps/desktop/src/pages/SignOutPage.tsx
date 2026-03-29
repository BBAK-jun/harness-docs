import { LogOut, ShieldCheck } from "lucide-react";
import { CompactPrimaryPageAction, CompactSecondaryPageAction } from "@/components/pageActions";
import { ElevatedPanel, InsetPanel, PanelCard, PanelCardContent, PanelCardHeader } from "@/components/pagePanels";
import { Badge } from "@/components/ui/badge";
import { CardDescription, CardTitle } from "@/components/ui/card";
import type { useAppBootstrap } from "../hooks/useAppBootstrap";

export function SignOutPage({
  app,
  onOpenSignIn,
  onOpenWorkspaces,
}: {
  app: ReturnType<typeof useAppBootstrap>;
  onOpenSignIn: () => void;
  onOpenWorkspaces: () => void;
}) {
  const authentication = app.authentication;
  const isAuthenticated = authentication?.status === "authenticated";

  return (
    <main className="app-frame min-h-screen p-6">
      <div className="mx-auto grid min-h-[calc(100vh-3rem)] max-w-6xl items-center gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <ElevatedPanel padding="lg">
          <Badge className="w-fit" variant="outline">
            세션
          </Badge>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight text-[var(--foreground)]">
            {isAuthenticated ? "앱 세션을 종료합니다" : "이미 로그아웃된 상태입니다"}
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-8 text-[var(--muted-foreground)]">
            {isAuthenticated
              ? "로그아웃 이후에는 워크스페이스와 문서 작업에 다시 로그인해야 접근할 수 있습니다."
              : "현재 활성 세션이 없습니다. 로그인 화면으로 이동해 다시 인증을 시작할 수 있습니다."}
          </p>
        </ElevatedPanel>

        <PanelCard>
          <PanelCardHeader className="gap-4">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-full bg-[var(--surface)] text-[var(--foreground)]">
                {isAuthenticated ? <LogOut className="size-5" /> : <ShieldCheck className="size-5" />}
              </div>
              <div>
                <CardTitle>{isAuthenticated ? "로그아웃" : "세션 상태"}</CardTitle>
                <CardDescription>
                  {isAuthenticated ? "현재 연결된 계정과 세션 상태입니다." : "이 디바이스에는 활성 세션이 없습니다."}
                </CardDescription>
              </div>
            </div>
          </PanelCardHeader>
          <PanelCardContent className="flex flex-col gap-4 pt-6">
            <InsetPanel className="text-sm leading-6">
              {isAuthenticated
                ? `${authentication.user.name} (${authentication.user.githubLogin}) 계정이 현재 이 디바이스 세션에 연결되어 있습니다.`
                : "세션 상태가 로그아웃됨입니다."}
            </InsetPanel>
            <div className="flex flex-wrap gap-2">
              {isAuthenticated ? (
                <>
                  <CompactPrimaryPageAction clientLog="로그아웃 실행" onClick={() => void app.handleSignOut()}>
                    로그아웃 실행
                  </CompactPrimaryPageAction>
                  <CompactSecondaryPageAction clientLog="워크스페이스로 돌아가기" onClick={onOpenWorkspaces}>
                    워크스페이스로 돌아가기
                  </CompactSecondaryPageAction>
                </>
              ) : (
                <>
                  <CompactPrimaryPageAction clientLog="로그인 페이지로 이동" onClick={onOpenSignIn}>
                    로그인 페이지로 이동
                  </CompactPrimaryPageAction>
                  <CompactSecondaryPageAction clientLog="워크스페이스 목록" onClick={onOpenWorkspaces}>
                    워크스페이스 목록
                  </CompactSecondaryPageAction>
                </>
              )}
            </div>
          </PanelCardContent>
        </PanelCard>
      </div>
    </main>
  );
}
