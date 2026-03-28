import { ArrowRight, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
    <main className={withinShell ? "flex h-full min-h-full flex-col gap-6" : "app-frame min-h-screen p-6"}>
      <div className={rootClassName}>
        <section className="h-full rounded-[calc(var(--radius)+0.75rem)] border border-[var(--border)] bg-[rgba(255,255,255,0.62)] p-6 shadow-[0_30px_120px_-80px_rgba(15,23,42,0.5)] backdrop-blur-xl sm:p-8">
          <Badge className="w-fit" variant="info">
            워크스페이스 접근
          </Badge>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight text-[var(--foreground)]">
            {title}
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-8 text-[var(--muted-foreground)]">
            {description}
          </p>
        </section>

        <Card className="h-full overflow-hidden">
          <CardHeader className="border-b border-[var(--border)]">
            <CardTitle>다음 단계</CardTitle>
            <CardDescription className="text-base">
              현재 구현에서는 실제 입력 폼 대신 다음 단계와 시스템 전제를 안내합니다.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-5 pt-6">
            <div className="grid gap-3">
              {checklist.map((item) => (
                <div
                  className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] p-4 text-sm leading-6 text-[var(--foreground)]"
                  key={item}
                >
                  <div className="flex gap-3">
                    <CheckCircle2 className="mt-1 size-4 shrink-0 text-[var(--info-foreground)]" />
                    <span>{item}</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button className="sm:flex-1" onClick={onPrimaryAction}>
                {primaryLabel}
                <ArrowRight />
              </Button>
              <Button className="sm:flex-1" onClick={onSecondaryAction} variant="outline">
                {secondaryLabel}
              </Button>
            </div>
            <Button onClick={onSignOut} variant="ghost">
              다른 계정으로 로그인하려면 로그아웃
            </Button>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
