import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function WorkspaceOnboardingPage({
  title,
  description,
  checklist,
  onPrimaryAction,
  onSecondaryAction,
  onSignOut,
  primaryLabel,
  secondaryLabel,
}: {
  title: string;
  description: string;
  checklist: string[];
  onPrimaryAction: () => void;
  onSecondaryAction: () => void;
  onSignOut: () => void;
  primaryLabel: string;
  secondaryLabel: string;
}) {
  return (
    <main className="app-frame min-h-screen p-6">
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] max-w-4xl items-center">
        <Card className="w-full border-[var(--app-border-strong)] bg-[linear-gradient(180deg,rgba(255,255,255,0.92),rgba(248,250,252,0.9))]">
          <CardHeader className="gap-4">
            <Badge className="w-fit" variant="info">
              Workspace Access
            </Badge>
            <CardTitle className="text-3xl leading-tight sm:text-4xl">{title}</CardTitle>
            <CardDescription className="max-w-2xl text-base">{description}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-5">
            <div className="grid gap-3">
              {checklist.map((item) => (
                <div
                  className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] p-4 text-sm leading-6 text-[var(--foreground)]"
                  key={item}
                >
                  {item}
                </div>
              ))}
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button className="sm:flex-1" onClick={onPrimaryAction}>
                {primaryLabel}
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
