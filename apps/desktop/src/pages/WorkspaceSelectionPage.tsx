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
import { ArrowRight, GitBranch, Users } from "lucide-react";
import type { WorkspaceSummary } from "../types";
import type { useAppBootstrap } from "../hooks/useAppBootstrap";
import { MetricTile, translateWorkspaceRole } from "./pageUtils";

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
          <Card className="w-full overflow-hidden">
            <CardHeader className="border-b border-[var(--border)]">
              <Badge className="w-fit" variant="warning">
                워크스페이스 접근
              </Badge>
              <CardTitle className="text-3xl">사용 가능한 워크스페이스가 없음</CardTitle>
              <CardDescription className="max-w-2xl text-base">
                현재 로그인한 계정에 연결된 워크스페이스가 없습니다. 정책상 이 상태는 로그아웃이 아니라 워크스페이스 생성 또는 초대 수락 흐름으로 안내되어야 합니다.
              </CardDescription>
            </CardHeader>
            <CardFooter className="pt-6">
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
        <header className="rounded-[calc(var(--radius)+0.35rem)] border border-[var(--border)] bg-[rgba(255,255,255,0.58)] px-6 py-6 backdrop-blur-xl">
          <Badge variant="outline" className="w-fit">
            워크스페이스 선택
          </Badge>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight text-[var(--foreground)]">
            워크스페이스 선택
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted-foreground)]">
            각 워크스페이스는 전용 GitHub 문서 저장소 하나와, 앱이 관리하는 승인 및 발행
            이력을 가집니다.
          </p>
        </header>

        <section className="grid gap-4 lg:grid-cols-2">
          {app.workspaces.map((workspace) => (
            <Card key={workspace.id}>
              <CardHeader className="border-b border-[var(--border)]">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex flex-col gap-2">
                    <CardTitle>{workspace.name}</CardTitle>
                    <CardDescription>{workspace.description}</CardDescription>
                  </div>
                  <Badge variant="secondary">{translateWorkspaceRole(workspace.role)}</Badge>
                </div>
              </CardHeader>
              <CardContent className="grid gap-4">
                <div className="grid gap-3 sm:grid-cols-3">
                  <MetricTile label="열린 리뷰" value={workspace.openReviews} />
                  <MetricTile label="진행 중 초안" value={workspace.pendingDrafts} />
                  <MetricTile label="오래된 문서" value={workspace.staleDocuments} />
                </div>
                <div className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] p-4 text-sm text-[var(--muted-foreground)]">
                  <div className="flex items-center gap-2 text-[var(--foreground)]">
                    <GitBranch className="size-4 text-[var(--muted-foreground)]" />
                    <span>{workspace.repo}</span>
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <Users className="size-4 text-[var(--muted-foreground)]" />
                    <span>{translateWorkspaceRole(workspace.role)} 권한으로 접근</span>
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <Button onClick={() => app.handleWorkspaceEnter(workspace.id)}>
                  워크스페이스 열기
                  <ArrowRight />
                </Button>
              </CardFooter>
            </Card>
          ))}
        </section>
      </div>
    </main>
  );
}
