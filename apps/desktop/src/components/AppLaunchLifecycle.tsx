import { Component, Suspense, type ReactNode } from "react";
import { QueryErrorResetBoundary, useSuspenseQuery } from "@tanstack/react-query";
import { FileText } from "lucide-react";
import { loadBootstrapState } from "@/hooks/useAppBootstrap";
import { toErrorMessage } from "@/lib/errorToast";
import { RouteErrorStateCard } from "@/pages/pageUtils";
import { desktopQueryKeys } from "@/queries/queryKeys";
import { useHarnessDocsServices } from "@/services/HarnessDocsServicesProvider";

export function AppLaunchBoundary({ children }: { children: ReactNode }) {
  return (
    <QueryErrorResetBoundary>
      {({ reset }) => (
        <AppLaunchErrorBoundary onReset={reset}>
          <Suspense fallback={<AppLaunchSplashPage />}>
            <AppLaunchBootstrap>{children}</AppLaunchBootstrap>
          </Suspense>
        </AppLaunchErrorBoundary>
      )}
    </QueryErrorResetBoundary>
  );
}

function AppLaunchBootstrap({ children }: { children: ReactNode }) {
  const services = useHarnessDocsServices();

  useSuspenseQuery({
    queryKey: desktopQueryKeys.bootstrap(),
    queryFn: () => loadBootstrapState(services),
    retry: false,
  });

  return <>{children}</>;
}

class AppLaunchErrorBoundary extends Component<
  {
    children: ReactNode;
    onReset: () => void;
  },
  {
    error: unknown | null;
  }
> {
  state: {
    error: unknown | null;
  } = {
    error: null,
  };

  static getDerivedStateFromError(error: unknown) {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <RouteErrorStateCard
          description="로그인 상태와 워크스페이스 초기 정보를 확인하지 못했습니다."
          errorMessage={toErrorMessage(this.state.error)}
          onRetry={() => {
            this.setState({ error: null });
            this.props.onReset();
          }}
          title="앱 시작 확인 실패"
        />
      );
    }

    return this.props.children;
  }
}

function AppLaunchSplashPage() {
  const checklist = [
    "GitHub 로그인 상태를 확인하고 있습니다.",
    "마지막 워크스페이스와 bootstrap 데이터를 준비하고 있습니다.",
    "데스크톱 환경 설정을 적용하고 있습니다.",
  ];

  return (
    <main className="app-frame min-h-screen p-4 sm:p-6">
      <div className="mx-auto flex min-h-[calc(100vh-2rem)] max-w-[1440px]">
        <section className="flex w-full flex-col justify-between rounded-[calc(var(--radius)+0.9rem)] border border-[var(--app-border-strong)] bg-[rgba(255,255,255,0.52)] p-6 shadow-[0_40px_120px_-72px_rgba(15,23,42,0.62)] backdrop-blur-xl sm:p-8">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[linear-gradient(180deg,#93c5fd,#2563eb)] text-[var(--primary-foreground)] shadow-[0_16px_36px_rgba(37,99,235,0.3)]">
              <FileText className="size-5" />
            </div>
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
                Harness Docs
              </p>
              <p className="text-sm text-[var(--foreground)]">App Startup</p>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.9fr)] lg:items-end">
            <div className="max-w-3xl">
              <p className="text-xs font-medium uppercase tracking-[0.2em] text-[var(--info-foreground)]">
                Suspense Fallback
              </p>
              <h1 className="mt-4 text-4xl font-semibold tracking-tight text-[var(--foreground)] sm:text-5xl">
                로그인 상태와 작업 공간을 확인하는 동안 앱을 준비합니다.
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-8 text-[var(--muted-foreground)] sm:text-lg">
                React bootstrap이 끝나면 현재 세션과 워크스페이스 상태를 먼저 확인한 뒤 실제
                라우트를 렌더링합니다.
              </p>
            </div>

            <div className="rounded-[calc(var(--radius)+0.4rem)] border border-[var(--border)] bg-[rgba(255,255,255,0.72)] p-5 shadow-[0_24px_80px_-60px_rgba(15,23,42,0.55)]">
              <div className="flex items-center gap-3">
                <div className="h-3 w-3 animate-pulse rounded-full bg-[var(--primary)] shadow-[0_0_0_8px_rgba(37,99,235,0.12)]" />
                <p className="text-sm font-semibold uppercase tracking-[0.14em] text-[var(--foreground)]">
                  Launch Status
                </p>
              </div>
              <div className="mt-5 space-y-3">
                {checklist.map((item) => (
                  <div
                    className="rounded-[var(--radius)] border border-[var(--border)] bg-[rgba(255,255,255,0.58)] px-4 py-3 text-sm leading-6 text-[var(--foreground)]"
                    key={item}
                  >
                    {item}
                  </div>
                ))}
              </div>
              <div className="mt-5 h-2 overflow-hidden rounded-full bg-[rgba(148,163,184,0.16)]">
                <div className="h-full w-2/5 animate-pulse rounded-full bg-[linear-gradient(90deg,rgba(96,165,250,0.28),#60a5fa,rgba(37,99,235,0.62))]" />
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
