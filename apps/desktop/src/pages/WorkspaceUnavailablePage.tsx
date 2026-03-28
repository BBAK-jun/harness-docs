import { useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Card, CardFooter, CardHeader, CardDescription, CardTitle } from "@/components/ui/card";
import type { WorkspaceShellModel } from "../hooks/useWorkspaceShell";

export function WorkspaceUnavailablePage({ app }: { app: WorkspaceShellModel }) {
  const navigate = useNavigate();

  return (
    <main className="app-frame flex min-h-screen items-center justify-center p-6">
        <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle>활성 워크스페이스 없음</CardTitle>
          <CardDescription>
            로그인은 유지되지만 활성 워크스페이스 멤버십이 없습니다. 워크스페이스 생성이나
            초대 수락 흐름으로 이동할 수 있습니다.
          </CardDescription>
        </CardHeader>
        <CardFooter>
          <Button
            onClick={() => {
              void navigate({ to: "/workspace-create" });
            }}
          >
            워크스페이스 만들기
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              void navigate({ to: "/invitation-acceptance" });
            }}
          >
            초대 수락
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              void navigate({ to: "/sign-out" });
            }}
          >
            로그아웃 페이지
          </Button>
        </CardFooter>
      </Card>
    </main>
  );
}
