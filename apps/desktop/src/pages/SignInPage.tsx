import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { AppPageProps } from "./pageUtils";

export function SignInPage({ app }: AppPageProps) {
  return (
    <main className="app-frame min-h-screen p-6">
      <div className="mx-auto grid min-h-[calc(100vh-3rem)] max-w-6xl items-center gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <Card className="overflow-hidden border-[var(--app-border-strong)] bg-[linear-gradient(145deg,rgba(255,255,255,0.9),rgba(245,247,255,0.8))]">
          <CardHeader className="gap-4">
            <Badge variant="info" className="w-fit">
              Desktop V1
            </Badge>
            <CardTitle className="max-w-3xl text-4xl leading-tight sm:text-5xl">
              Structured product docs with app-owned review and GitHub publication.
            </CardTitle>
            <CardDescription className="max-w-2xl text-base">
              Harness Docs keeps PRD, UX Flow, Technical Spec, and Policy documents inside one
              desktop workflow. Users edit Markdown, review linked invalidations, and publish
              through automated branch, commit, and pull request creation.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-3">
            {[
              "GitHub OAuth only in v1",
              "Stale is visible without becoming a hard block",
              "Codex and Claude stay scoped to internal docs",
            ].map((item) => (
              <div
                className="rounded-[var(--radius)] border border-[var(--border)] bg-white/80 p-4 text-sm leading-6 text-[var(--foreground)]"
                key={item}
              >
                {item}
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Continue with GitHub</CardTitle>
            <CardDescription>
              The app creates its own authenticated session after OAuth and restores your valid
              workspace memberships on the next launch.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="rounded-[var(--radius)] border border-dashed border-[var(--border)] bg-[var(--surface)] p-4 text-sm leading-6 text-[var(--muted-foreground)]">
              GitHub is the publication target. Approval authority, stale handling, and workspace
              membership remain app-managed.
            </div>
            <Button className="w-full" onClick={() => void app.handleSignIn("github_oauth")}>
              Continue with GitHub
            </Button>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
