import { ArrowRight, CheckCircle2 } from "lucide-react";
import { PrimaryPageAction, QuietPageAction, SecondaryPageAction } from "@/components/pageActions";
import { ElevatedPanel, InsetPanel, PanelCard, PanelCardContent, PanelCardHeader } from "@/components/pagePanels";
import { Badge } from "@/components/ui/badge";
import { CardDescription, CardTitle } from "@/components/ui/card";
import { PanelSlotsLayout } from "@/components/PanelSlotsLayout";
import { type GridColumnCount, getSplitGridClassName } from "./layoutGrid";

export function WorkspaceOnboardingPage({
  title,
  description,
  checklist,
  onPrimaryAction,
  onSecondaryAction,
  onSignOut,
  primaryLabel,
  secondaryLabel,
  layoutColumns = 2,
  withinShell = false,
}: {
  title: string;
  description: string;
  checklist: string[];
  onPrimaryAction: () => void;
  onSecondaryAction: () => void;
  onSignOut: () => void;
  primaryLabel: string;
  secondaryLabel: string;
  layoutColumns?: GridColumnCount;
  withinShell?: boolean;
}) {
  const rootClassName = withinShell
    ? getSplitGridClassName(layoutColumns)
    : `mx-auto min-h-[calc(100vh-3rem)] max-w-6xl items-center ${getSplitGridClassName(layoutColumns)}`;

  return (
    <main className={withinShell ? "flex flex-col gap-6" : "app-frame min-h-screen p-6"}>
      <PanelSlotsLayout
        bodyClassName={rootClassName}
        bodyColumns={layoutColumns}
        leftPanel={
          <ElevatedPanel>
            <Badge className="w-fit" variant="info">
              워크스페이스 접근
            </Badge>
            <div className="flex flex-col gap-4">
              <h1 className="text-4xl font-semibold tracking-tight text-[var(--foreground)]">{title}</h1>
              <p className="max-w-2xl text-base leading-8 text-[var(--muted-foreground)]">{description}</p>
            </div>
          </ElevatedPanel>
        }
        rightPanel={
          <PanelCard>
            <PanelCardHeader className="px-6 py-5">
              <CardTitle>다음 단계</CardTitle>
              <CardDescription className="text-base leading-7">
                현재 구현에서는 실제 입력 폼 대신 다음 단계와 시스템 전제를 안내합니다.
              </CardDescription>
            </PanelCardHeader>
            <PanelCardContent className="flex flex-col gap-5 px-6 py-6">
              <div className="grid gap-3">
                {checklist.map((item) => (
                  <InsetPanel key={item} padding="none">
                    <div className="px-4 py-3.5 text-sm leading-6 text-[var(--foreground)]">
                    <div className="flex gap-3">
                      <CheckCircle2 className="mt-1 size-4 shrink-0 text-[var(--info-foreground)]" />
                      <span>{item}</span>
                    </div>
                    </div>
                  </InsetPanel>
                ))}
              </div>
              <div className="border-t border-[var(--border)] pt-5">
                <div className="flex flex-col gap-2 sm:flex-row">
                  <PrimaryPageAction className="sm:flex-1" clientLog={primaryLabel} onClick={onPrimaryAction}>
                    {primaryLabel}
                    <ArrowRight />
                  </PrimaryPageAction>
                  <SecondaryPageAction
                    className="sm:flex-1"
                    clientLog={secondaryLabel}
                    onClick={onSecondaryAction}
                  >
                    {secondaryLabel}
                  </SecondaryPageAction>
                </div>
                <QuietPageAction
                  className="mt-3 w-full"
                  clientLog={{
                    action: "온보딩 로그아웃 CTA 클릭",
                    description: "워크스페이스 온보딩에서 다른 계정으로 전환하려고 했습니다.",
                    source: "workspace-onboarding",
                  }}
                  onClick={onSignOut}
                >
                  다른 계정으로 로그인하려면 로그아웃
                </QuietPageAction>
              </div>
            </PanelCardContent>
          </PanelCard>
        }
      />
    </main>
  );
}
