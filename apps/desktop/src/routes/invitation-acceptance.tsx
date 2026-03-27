import { createFileRoute, useRouter } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { RouteErrorStateCard } from "../pages/pageUtils";
import { WorkspaceOnboardingPage } from "../pages/WorkspaceOnboardingPage";

export const Route = createFileRoute("/invitation-acceptance")({
  component: InvitationAcceptanceRoute,
  errorComponent: InvitationAcceptanceErrorBoundary,
});

function InvitationAcceptanceRoute() {
  const router = useRouter();

  return (
    <WorkspaceOnboardingPage
      checklist={[
        "팀 리드가 보낸 초대를 수락하면 active membership으로 전환됩니다.",
        "membership은 GitHub collaborator 권한과 별개로 앱이 관리합니다.",
        "현재 구현에서는 실제 초대 코드 입력 대신 다음 단계 안내만 제공합니다.",
      ]}
      description="정책상 인증은 되었지만 워크스페이스가 없다면 초대 수락 흐름으로 이동할 수 있어야 합니다."
      onPrimaryAction={() => {
        void router.navigate({ to: "/workspace-create" });
      }}
      onSecondaryAction={() => {
        void router.navigate({ to: "/workspaces" });
      }}
      onSignOut={() => {
        void router.navigate({ to: "/sign-out" });
      }}
      primaryLabel="워크스페이스 만들기 흐름 보기"
      secondaryLabel="워크스페이스 목록으로 돌아가기"
      title="초대 수락"
    />
  );
}

function InvitationAcceptanceErrorBoundary({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  const router = useRouter();

  return (
    <RouteErrorStateCard
      description="초대 수락 안내 화면을 불러오지 못했습니다. 다시 시도하거나 워크스페이스 목록으로 이동하세요."
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
      title="초대 수락 화면 오류"
    />
  );
}
