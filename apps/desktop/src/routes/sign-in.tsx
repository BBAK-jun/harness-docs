import { Navigate, createFileRoute, useRouter } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { useAppBootstrap } from "../hooks/useAppBootstrap";
import { RouteErrorStateCard } from "../pages/pageUtils";
import { SignInPage } from "../pages/SignInPage";

export const Route = createFileRoute("/sign-in")({
  component: SignInRoute,
  errorComponent: SignInRouteErrorBoundary,
});

function SignInRoute() {
  const app = useAppBootstrap();
  const router = useRouter();

  if (app.authentication?.status === "authenticated") {
    return <Navigate to="/workspaces" />;
  }

  return (
    <SignInPage
      app={app}
      onOpenSignOut={() => {
        void router.navigate({ to: "/sign-out" });
      }}
      onOpenWorkspaces={() => {
        void router.navigate({ to: "/workspaces" });
      }}
    />
  );
}

function SignInRouteErrorBoundary({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  const router = useRouter();

  return (
    <RouteErrorStateCard
      description="로그인 화면을 불러오지 못했습니다. 다시 시도하거나 워크스페이스 목록으로 이동하세요."
      errorMessage={error.message}
      onRetry={() => {
        reset();
        void router.invalidate();
      }}
      secondaryAction={
        <Button
          clientLog="워크스페이스 목록"
          onClick={() => {
            reset();
            void router.navigate({ to: "/workspaces" });
          }}
          variant="outline"
        >
          워크스페이스 목록
        </Button>
      }
      title="로그인 화면 오류"
    />
  );
}
