import { Navigate, createFileRoute, useRouter } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { useAppBootstrap } from "../hooks/useAppBootstrap";
import { RouteErrorStateCard } from "../pages/pageUtils";

export const Route = createFileRoute("/sign-out")({
  component: SignOutRoute,
  errorComponent: SignOutRouteErrorBoundary,
});

function SignOutRoute() {
  const app = useAppBootstrap();
  const router = useRouter();
  const hasStartedSignOutRef = useRef(false);

  useEffect(() => {
    if (app.authentication?.status !== "authenticated" || hasStartedSignOutRef.current) {
      return;
    }

    hasStartedSignOutRef.current = true;

    void app.handleSignOut().finally(() => {
      void router.navigate({ to: "/sign-in" });
    });
  }, [app.authentication?.status, app.handleSignOut, router]);

  if (app.authentication?.status !== "authenticated") {
    return <Navigate to="/sign-in" />;
  }

  return null;
}

function SignOutRouteErrorBoundary({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  const router = useRouter();

  return (
    <RouteErrorStateCard
      description="로그아웃 화면을 불러오지 못했습니다. 다시 시도하거나 로그인 화면으로 이동하세요."
      errorMessage={error.message}
      onRetry={() => {
        reset();
        void router.invalidate();
      }}
      secondaryAction={
        <Button
          clientLog="로그인 화면"
          onClick={() => {
            reset();
            void router.navigate({ to: "/sign-in" });
          }}
          variant="outline"
        >
          로그인 화면
        </Button>
      }
      title="로그아웃 화면 오류"
    />
  );
}
