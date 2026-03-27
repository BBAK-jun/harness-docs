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
import type { AppPageProps } from "./pageUtils";
import { MetricTile } from "./pageUtils";

export function WorkspaceSelectionPage({ app }: AppPageProps) {
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
