import { FileText } from "lucide-react";
import { useClientActivityLog } from "@/components/ClientActivityLogProvider";
import { Button } from "@/components/ui/button";
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
  const { logEvent } = useClientActivityLog();

  return (
    <div className="min-h-screen bg-sidebar flex">
      <div className="hidden lg:flex lg:w-[480px] flex-col justify-between p-10 border-r border-sidebar-border">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-sidebar-primary rounded flex items-center justify-center">
            <FileText className="w-4.5 h-4.5 text-sidebar-primary-foreground" />
          </div>
          <div>
            <span className="text-base font-semibold text-sidebar-accent-foreground">Harness</span>
            <span className="text-base font-semibold text-sidebar-primary"> Docs</span>
          </div>
        </div>

        <div>
          <h1 className="text-3xl font-bold text-sidebar-accent-foreground leading-tight mb-4">
            제품팀을 위한
            <br />
            문서 거버넌스.
          </h1>
          <p className="text-sm text-sidebar-muted leading-relaxed max-w-sm">
            하나의 워크스페이스에서 제품 문서를 작성하고, 검토하고, 승인하고, 발행하세요. 추적성과 거버넌스를 앱이 직접 관리합니다.
          </p>

          <div className="mt-10 space-y-3">
            {[
              "실시간 미리보기를 지원하는 마크다운 편집기",
              "승인 워크플로와 오래됨 판단",
              "브랜치와 PR 흐름을 포함한 GitHub 발행",
              "AI 기반 초안 작성과 구조 제안",
            ].map((feature) => (
              <div key={feature} className="flex items-center gap-2.5 text-sm text-sidebar-foreground">
                <div className="w-1 h-1 rounded-full bg-sidebar-primary shrink-0" />
                {feature}
              </div>
            ))}
          </div>
        </div>

        <p className="text-xs text-sidebar-muted">
          © 2026 Harness Docs. 크로스펑셔널 팀을 위한 문서 운영 도구.
        </p>
      </div>

      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-sm">
          <div className="lg:hidden flex items-center gap-2.5 justify-center mb-10">
            <div className="w-8 h-8 bg-sidebar-primary rounded flex items-center justify-center">
              <FileText className="w-4.5 h-4.5 text-sidebar-primary-foreground" />
            </div>
            <div>
              <span className="text-base font-semibold text-sidebar-accent-foreground">Harness</span>
              <span className="text-base font-semibold text-sidebar-primary"> Docs</span>
            </div>
          </div>

          <div className="text-center mb-8">
            <h2 className="text-xl font-bold text-sidebar-accent-foreground mb-1.5">워크스페이스에 로그인</h2>
            <p className="text-sm text-sidebar-muted">GitHub 계정을 연결해 시작하세요</p>
          </div>

          <Button
            className="w-full bg-sidebar-accent-foreground py-3 text-sidebar hover:opacity-90 hover:bg-sidebar-accent-foreground"
            clientLog={{
              action: "GitHub 로그인 CTA 클릭",
              description: "로그인 화면에서 GitHub OAuth 흐름을 시작했습니다.",
              source: "sign-in",
            }}
            onClick={() => {
              logEvent({
                action: "GitHub OAuth 요청 시작",
                description: "인증 완료 후 /workspaces 로 이동합니다.",
                source: "sign-in",
              });
              void app.handleSignIn("github_oauth", "/workspaces");
            }}
            type="button"
          >
            GitHub로 계속하기
          </Button>

          <p className="text-xs text-sidebar-muted text-center mt-8 leading-relaxed">
            로그인하면 이용약관과
            <br />
            개인정보처리방침에 동의하게 됩니다.
          </p>
        </div>
      </div>
    </div>
  );
}
