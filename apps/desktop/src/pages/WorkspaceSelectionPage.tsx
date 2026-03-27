import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { WorkspaceSummary } from "../types";
import type { useAppBootstrap } from "../hooks/useAppBootstrap";
import { MetricTile } from "./pageUtils";

export function WorkspaceSelectionPage({
  app,
  onOpenSignOut,
  onOpenWorkspaceCreate,
  onOpenInvitationAcceptance,
}: {
  app: ReturnType<typeof useAppBootstrap> & {
    workspaces: WorkspaceSummary[];
    handleWorkspaceEnter: (workspaceId: string) => void;
  };
  onOpenSignOut: () => void;
  onOpenWorkspaceCreate: () => void;
  onOpenInvitationAcceptance: () => void;
}) {
  if (app.workspaces.length === 0) {
    return (
      <main className="app-frame min-h-screen p-6">
        <div className="mx-auto flex min-h-[calc(100vh-3rem)] max-w-4xl items-center">
          <Card className="w-full">
            <CardHeader>
              <CardTitle>사용 가능한 워크스페이스가 없음</CardTitle>
              <CardDescription>
                현재 로그인한 계정에 연결된 워크스페이스가 없습니다. 정책상 이 상태는
                로그아웃이 아니라 워크스페이스 생성 또는 초대 수락 흐름으로 안내되어야
                합니다.
              </CardDescription>
            </CardHeader>
            <CardFooter>
              <div className="flex flex-wrap gap-2">
                <Button onClick={onOpenWorkspaceCreate}>워크스페이스 만들기</Button>
                <Button onClick={onOpenInvitationAcceptance} variant="outline">
                  초대 수락
                </Button>
                <Button onClick={onOpenSignOut} variant="outline">
                  로그아웃
                </Button>
              </div>
            </CardFooter>
          </Card>
        </div>
      </main>
    );
  }

  return (
    <main className="app-frame min-h-screen p-6">
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] max-w-6xl flex-col gap-6">
        <header className="flex flex-col gap-3">
          <Badge variant="outline" className="w-fit">
            Workspace Selection
          </Badge>
          <h1 className="text-4xl font-semibold tracking-tight text-[var(--foreground)]">
            Pick a workspace
          </h1>
          <p className="max-w-2xl text-sm leading-6 text-[var(--muted-foreground)]">
            Each workspace maps to one dedicated GitHub documentation repository and its own
            app-managed approvals and publication history.
          </p>
        </header>

        <section className="grid gap-4 lg:grid-cols-2">
          {app.workspaces.map((workspace) => (
            <Card key={workspace.id}>
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex flex-col gap-2">
                    <CardTitle>{workspace.name}</CardTitle>
                    <CardDescription>{workspace.description}</CardDescription>
                  </div>
                  <Badge variant="secondary">{workspace.role}</Badge>
                </div>
              </CardHeader>
              <CardContent className="grid gap-4">
                <div className="grid gap-3 sm:grid-cols-3">
                  <MetricTile label="Open reviews" value={workspace.openReviews} />
                  <MetricTile label="Pending drafts" value={workspace.pendingDrafts} />
                  <MetricTile label="Stale docs" value={workspace.staleDocuments} />
                </div>
                <div className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] p-4 text-sm text-[var(--muted-foreground)]">
                  Target repository: {workspace.repo}
                </div>
              </CardContent>
              <CardFooter>
                <Button onClick={() => app.handleWorkspaceEnter(workspace.id)}>
                  Enter workspace
                </Button>
              </CardFooter>
            </Card>
          ))}
        </section>
      </div>
    </main>
  );
}
