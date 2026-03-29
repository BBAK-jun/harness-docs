import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  CardDescription,
  CardTitle,
} from "@/components/ui/card";
import { ArrowRight, CheckCircle2, GitBranch, Users } from "lucide-react";
import { PrimaryPageAction, QuietPageAction, SecondaryPageAction } from "@/components/pageActions";
import { ElevatedPanel, InsetPanel, PanelCard, PanelCardContent, PanelCardFooter, PanelCardHeader } from "@/components/pagePanels";
import { PanelSlotsLayout } from "@/components/PanelSlotsLayout";
import type { WorkspaceSummary } from "../types/contracts";
import type { useAppBootstrap } from "../hooks/useAppBootstrap";
import { type GridColumnCount, getCardGridClassName, getSplitGridClassName } from "./layoutGrid";
import { MetricTile, translateWorkspaceRole } from "./pageUtils";

export function WorkspaceSelectionPage({
  app,
  onOpenWorkspace,
  onOpenSignOut,
  onOpenWorkspaceCreate,
  onOpenInvitationAcceptance,
  emptyStateColumns = 2,
  workspaceCardColumns = 2,
  withinShell = false,
}: {
  app: ReturnType<typeof useAppBootstrap> & {
    workspaces: WorkspaceSummary[];
  };
  onOpenWorkspace: (workspaceId: string) => void;
  onOpenSignOut: () => void;
  onOpenWorkspaceCreate: () => void;
  onOpenInvitationAcceptance: () => void;
  emptyStateColumns?: GridColumnCount;
  workspaceCardColumns?: GridColumnCount;
  withinShell?: boolean;
}) {
  const rootClassName = withinShell
    ? "flex flex-col gap-6"
    : "app-frame min-h-screen p-6";
  const contentClassName = withinShell
    ? getSplitGridClassName(emptyStateColumns)
    : `mx-auto min-h-[calc(100vh-3rem)] max-w-6xl items-center ${getSplitGridClassName(emptyStateColumns)}`;
  const listRootClassName = withinShell
    ? "flex flex-col gap-6"
    : "mx-auto flex min-h-[calc(100vh-3rem)] max-w-6xl flex-col gap-6";

  if (app.workspaces.length === 0) {
    return (
      <main className={rootClassName}>
        <PanelSlotsLayout
          bodyClassName={contentClassName}
          bodyColumns={emptyStateColumns}
          leftPanel={
            <ElevatedPanel>
            <Badge className="w-fit" variant="warning">
              워크스페이스 접근
            </Badge>
            <h1 className="mt-4 text-4xl font-semibold tracking-tight text-[var(--foreground)]">
              사용 가능한 워크스페이스가 없습니다
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-8 text-[var(--muted-foreground)]">
              현재 로그인한 계정에 연결된 워크스페이스가 없습니다. 이 상태는 세션 문제라기보다
              아직 참여 중인 워크스페이스가 없다는 뜻이므로, 새 워크스페이스를 만들거나 초대를
              수락하는 다음 단계로 이어져야 합니다.
            </p>
            </ElevatedPanel>
          }
          rightPanel={
            <PanelCard>
            <PanelCardHeader>
              <CardTitle>다음 단계</CardTitle>
              <CardDescription className="text-base">
                현재 계정으로 이어서 작업하려면 아래 흐름 중 하나를 선택하세요.
              </CardDescription>
            </PanelCardHeader>
            <PanelCardContent className="flex flex-col gap-5 pt-6">
              <div className="grid gap-3">
                {[
                  "새 워크스페이스를 만들면 현재 계정이 즉시 Lead 권한으로 들어갑니다.",
                  "팀 초대 링크나 코드가 있다면 초대 수락 흐름으로 이동할 수 있습니다.",
                  "계정을 바꾸고 싶다면 로그아웃 후 다른 GitHub 계정으로 다시 로그인할 수 있습니다.",
                ].map((item) => (
                  <InsetPanel key={item}>
                    <div className="flex gap-3">
                      <CheckCircle2 className="mt-1 size-4 shrink-0 text-[var(--warning-foreground)]" />
                      <span>{item}</span>
                    </div>
                  </InsetPanel>
                ))}
              </div>
            </PanelCardContent>
            <PanelCardFooter className="flex flex-col gap-2 sm:flex-row">
              <PrimaryPageAction
                className="sm:flex-1"
                clientLog={{
                  action: "워크스페이스 생성 CTA 클릭",
                  description: "워크스페이스가 없는 상태에서 생성 흐름으로 이동했습니다.",
                  source: "workspace-selection",
                }}
                onClick={onOpenWorkspaceCreate}
              >
                워크스페이스 만들기
                <ArrowRight />
              </PrimaryPageAction>
              <SecondaryPageAction
                className="sm:flex-1"
                clientLog={{
                  action: "초대 수락 CTA 클릭",
                  description: "초대 수락 흐름으로 이동했습니다.",
                  source: "workspace-selection",
                }}
                onClick={onOpenInvitationAcceptance}
              >
                초대 수락
              </SecondaryPageAction>
              <QuietPageAction
                className="sm:flex-1"
                clientLog={{
                  action: "로그아웃 CTA 클릭",
                  description: "워크스페이스 선택 화면에서 다른 계정 전환을 시도했습니다.",
                  source: "workspace-selection",
                }}
                onClick={onOpenSignOut}
              >
                로그아웃
              </QuietPageAction>
            </PanelCardFooter>
            </PanelCard>
          }
        />
      </main>
    );
  }

  return (
    <main className={rootClassName}>
      <div className={listRootClassName}>
        <ElevatedPanel as="header" padding="lg">
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
        </ElevatedPanel>

        <section className={getCardGridClassName(workspaceCardColumns)}>
          {app.workspaces.map((workspace) => (
            <PanelCard key={workspace.id}>
              <PanelCardHeader>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex flex-col gap-2">
                    <CardTitle>{workspace.name}</CardTitle>
                    <CardDescription>{workspace.description}</CardDescription>
                  </div>
                  <Badge variant="secondary">{translateWorkspaceRole(workspace.role)}</Badge>
                </div>
              </PanelCardHeader>
              <PanelCardContent className="grid gap-4">
                <div className="grid gap-3 sm:grid-cols-3">
                  <MetricTile label="열린 리뷰" value={workspace.openReviews} />
                  <MetricTile label="진행 중 초안" value={workspace.pendingDrafts} />
                  <MetricTile label="오래된 문서" value={workspace.staleDocuments} />
                </div>
                <InsetPanel>
                  <div className="flex items-center gap-2 text-[var(--foreground)]">
                    <GitBranch className="size-4 text-[var(--muted-foreground)]" />
                    <span>{workspace.repo}</span>
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <Users className="size-4 text-[var(--muted-foreground)]" />
                    <span>{translateWorkspaceRole(workspace.role)} 권한으로 접근</span>
                  </div>
                </InsetPanel>
              </PanelCardContent>
              <PanelCardFooter>
                <PrimaryPageAction
                  clientLog={{
                    action: "워크스페이스 열기 CTA 클릭",
                    description: `${workspace.name} 워크스페이스로 진입했습니다.`,
                    source: "workspace-selection",
                  }}
                  onClick={() => onOpenWorkspace(workspace.id)}
                >
                  워크스페이스 열기
                  <ArrowRight />
                </PrimaryPageAction>
              </PanelCardFooter>
            </PanelCard>
          ))}
        </section>
      </div>
    </main>
  );
}
