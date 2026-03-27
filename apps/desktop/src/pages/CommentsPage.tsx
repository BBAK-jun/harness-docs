import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { AppPageProps } from "./pageUtils";
import { EmptyStateCard, statusBadgeVariant } from "./pageUtils";

export function CommentsPage({ app }: AppPageProps) {
  const workspaceGraph = app.activeWorkspaceGraph;
  const document = app.activeDocument;

  if (!workspaceGraph || !document) {
    return (
      <EmptyStateCard
        description="Choose a document to inspect threads and mentions."
        title="No review context"
      />
    );
  }

  const threads = workspaceGraph.commentThreads.filter(
    (thread) => thread.documentId === document.id,
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Review one thread at a time</CardTitle>
            <CardDescription>
              Keep feedback simple: open thread, context excerpt, and the next reply action.
            </CardDescription>
          </div>
          <Button
            onClick={() =>
              app.handleCreateBlockComment(
                document,
                "@reviewers Please confirm whether stale rationale is enough for this publish batch.",
              )
            }
          >
            Add sample thread
          </Button>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {threads.map((thread) => (
          <div
            className="rounded-[calc(var(--radius)+0.25rem)] border border-[var(--border)] bg-[var(--surface)] p-4"
            key={thread.id}
          >
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={statusBadgeVariant(thread.lifecycle.status)}>
                {thread.lifecycle.status}
              </Badge>
              <span className="text-sm text-[var(--muted-foreground)]">
                {thread.anchor.headingPath.join(" / ")}
              </span>
            </div>
            <p className="mt-3 text-sm leading-6 text-[var(--foreground)]">
              {thread.anchor.excerpt}
            </p>
            <p className="mt-3 text-sm text-[var(--muted-foreground)]">
              Participants {thread.participantMembershipIds.length} · linked docs{" "}
              {thread.linkedDocumentIds.length}
            </p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
