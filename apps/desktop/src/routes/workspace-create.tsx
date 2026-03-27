import { createFileRoute, useRouter } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { RouteErrorStateCard } from "../pages/pageUtils";
import { WorkspaceOnboardingPage } from "../pages/WorkspaceOnboardingPage";

export const Route = createFileRoute("/workspace-create")({
  component: WorkspaceCreateRoute,
  errorComponent: WorkspaceCreateErrorBoundary,
});

function WorkspaceCreateRoute() {
  const router = useRouter();

  return (
    <WorkspaceOnboardingPage
      checklist={[
        "새 워크스페이스는 하나의 GitHub 문서 저장소와 연결됩니다.",
        "워크스페이스가 만들어지면 팀 멤버와 승인 후보를 연결할 수 있습니다.",
        "현재 구현에서는 실제 생성 폼 대신 다음 단계 안내만 제공합니다.",
      ]}
      description="정책상 워크스페이스가 없으면 로그아웃이 아니라 워크스페이스 생성 흐름으로 이동해야 합니다."
      onPrimaryAction={() => {
        void router.navigate({ to: "/invitation-acceptance" });
      }}
      onSecondaryAction={() => {
        void router.navigate({ to: "/workspaces" });
      }}
      onSignOut={() => {
        void router.navigate({ to: "/sign-out" });
      }}
      primaryLabel="초대 수락 흐름 보기"
      secondaryLabel="워크스페이스 목록으로 돌아가기"
      title="워크스페이스 만들기"
    />
  );
}

function WorkspaceCreateErrorBoundary({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  const router = useRouter();

  return (
    <RouteErrorStateCard
      description="워크스페이스 생성 안내 화면을 불러오지 못했습니다. 다시 시도하거나 워크스페이스 목록으로 이동하세요."
      errorMessage={error.message}
      onRetry={() => {
        reset();
        void router.invalidate();
      }}
      secondaryAction={
        <Button
          onClick={() => {
            reset();
            void router.navigate({ to: "/workspaces" });
          }}
          variant="outline"
        >
          워크스페이스 목록
        </Button>
      }
      title="워크스페이스 생성 화면 오류"
    />
  );
}
