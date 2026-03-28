import { GitBranch, ShieldCheck, Sparkles } from "lucide-react";
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
      <div className="mx-auto grid min-h-[calc(100vh-3rem)] max-w-6xl items-center gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <section className="rounded-[calc(var(--radius)+0.75rem)] border border-[var(--border)] bg-[rgba(255,255,255,0.62)] p-6 shadow-[0_30px_120px_-80px_rgba(15,23,42,0.5)] backdrop-blur-xl sm:p-8">
          <Badge variant="info" className="w-fit">
            Harness Docs
          </Badge>
          <h1 className="mt-4 max-w-3xl text-4xl font-semibold tracking-tight text-[var(--foreground)] sm:text-5xl">
            {isAuthenticated ? "세션이 연결되어 있습니다" : "GitHub OAuth로 문서 워크플로에 진입"}
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-8 text-[var(--muted-foreground)]">
            {isAuthenticated
              ? "현재 세션이 활성화되어 있어 워크스페이스와 발행 흐름으로 바로 이동할 수 있습니다."
              : "Harness Docs는 앱이 문서 상태와 승인 흐름을 소유하고, GitHub는 최종 발행 채널로만 사용합니다."}
          </p>

          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            <FeaturePill icon={ShieldCheck} text="GitHub OAuth 기반 인증" />
            <FeaturePill icon={Sparkles} text="워크스페이스 멤버십 복원" />
            <FeaturePill icon={GitBranch} text="Git PR 발행 흐름 연결" />
          </div>
        </section>

        <Card className="overflow-hidden border-[var(--app-border-strong)]">
          <CardHeader className="border-b border-[var(--border)] gap-4">
            <CardTitle className="text-2xl">
              {isAuthenticated ? "Active Session" : "Continue with GitHub"}
            </CardTitle>
            <CardDescription className="text-base">
              {isAuthenticated
                ? "바로 워크스페이스를 열거나 세션 종료 흐름으로 이동할 수 있습니다."
                : "로그인 후 문서, 승인, 댓글, 발행 화면으로 곧바로 진입합니다."}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-5 pt-6">
            <div className="rounded-[var(--radius)] border border-dashed border-[var(--border)] bg-[var(--surface)] p-4 text-sm leading-6 text-[var(--muted-foreground)]">
              {isAuthenticated
                ? `${authentication.user.name} (${authentication.user.githubLogin}) 계정으로 로그인되어 있습니다.`
                : "앱 전용 세션이 생성되며 이후 워크스페이스 멤버십과 승인 문맥이 복원됩니다."}
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

function FeaturePill({
  icon: Icon,
  text,
}: {
  icon: typeof ShieldCheck;
  text: string;
}) {
  return (
    <div className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] p-4">
      <Icon className="size-4 text-[var(--muted-foreground)]" />
      <p className="mt-3 text-sm leading-6 text-[var(--foreground)]">{text}</p>
    </div>
  );
}
