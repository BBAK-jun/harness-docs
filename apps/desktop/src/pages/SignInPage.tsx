import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { useAppBootstrap } from "../hooks/useAppBootstrap";

export function SignInPage({
  app,
  onOpenWorkspaces,
  onOpenSignOut,
}: {
  app: ReturnType<typeof useAppBootstrap>;
  onOpenWorkspaces: () => void;
  onOpenSignOut: () => void;
}) {
  const authentication = app.authentication;
  const isAuthenticated = authentication?.status === "authenticated";

  return (
    <main className="app-frame min-h-screen p-6">
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] max-w-3xl items-center">
        <Card className="w-full border-[var(--app-border-strong)] bg-[linear-gradient(180deg,rgba(255,255,255,0.92),rgba(248,250,252,0.9))]">
          <CardHeader className="gap-4">
            <Badge variant="info" className="w-fit">
              Harness Docs
            </Badge>
            <CardTitle className="text-3xl leading-tight sm:text-4xl">
              {isAuthenticated ? "세션이 연결되어 있습니다" : "GitHub로 로그인"}
            </CardTitle>
            <CardDescription className="max-w-2xl text-base">
              {isAuthenticated
                ? "현재 세션이 활성화되어 있습니다. 바로 워크스페이스로 이동하거나, 로그아웃 페이지에서 세션을 종료할 수 있습니다."
                : "GitHub OAuth로 로그인하면 앱 전용 세션을 만들고 워크스페이스 멤버십을 복원합니다."}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-5">
            <div className="grid gap-3 sm:grid-cols-3">
              {[
                "GitHub OAuth 기반 인증",
                "워크스페이스 멤버십 복원",
                "Git PR 발행 흐름 연결",
              ].map((item) => (
                <div
                  className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] p-4 text-sm leading-6 text-[var(--foreground)]"
                  key={item}
                >
                  {item}
                </div>
              ))}
            </div>

            <div className="rounded-[var(--radius)] border border-dashed border-[var(--border)] bg-[var(--surface)] p-4 text-sm leading-6 text-[var(--muted-foreground)]">
              {isAuthenticated
                ? `${authentication.user.name} (${authentication.user.githubLogin}) 계정으로 로그인되어 있습니다.`
                : "로그인 이후 문서, 승인, 댓글, 발행 화면으로 바로 진입할 수 있습니다."}
            </div>

            {isAuthenticated ? (
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button className="sm:flex-1" onClick={onOpenWorkspaces}>
                  워크스페이스로 이동
                </Button>
                <Button className="sm:flex-1" onClick={onOpenSignOut} variant="outline">
                  로그아웃 페이지 열기
                </Button>
              </div>
            ) : (
              <Button className="w-full" onClick={() => void app.handleSignIn("github_oauth")}>
                GitHub로 계속하기
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
