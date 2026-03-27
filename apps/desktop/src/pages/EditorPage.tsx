import { Lock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import type { AppPageProps } from "./pageUtils";
import { EmptyStateCard, formatDateTime } from "./pageUtils";

export function EditorPage({ app }: AppPageProps) {
  const document = app.activeDocument;

  if (!document) {
    return (
      <EmptyStateCard
        description="Select a document from the library first."
        title="No document selected"
      />
    );
  }

  const isLockedByActiveMember =
    app.activeDocumentLock?.lifecycle.status === "active" &&
    app.activeDocumentLock.lockedByMembershipId === app.activeMembershipId;

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>{document.title}</CardTitle>
            <CardDescription>
              Edit one document at a time. Preview stays beside the source, and everything else is
              removed.
            </CardDescription>
          </div>
          <div className="flex gap-2">
            {isLockedByActiveMember ? (
              <Button variant="outline" onClick={() => app.handleReleaseEditing(document)}>
                Release lock
              </Button>
            ) : (
              <Button onClick={() => app.handleStartEditing(document)}>Start Editing</Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="grid gap-4 xl:grid-cols-2">
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2 text-sm text-[var(--muted-foreground)]">
            <Lock className="size-4" />
            <span>
              {app.activeDocumentLock
                ? `Lock ${app.activeDocumentLock.lifecycle.status} · last activity ${formatDateTime(app.activeDocumentLock.lastActivityAt)}`
                : "No active lock on this document."}
            </span>
          </div>
          <Textarea
            className="min-h-[520px] resize-none font-mono text-[13px]"
            disabled={!isLockedByActiveMember}
            onChange={(event) => app.handleDocumentSourceChange(document, event.target.value)}
            value={app.activeDocumentSource}
          />
        </div>
        <div className="rounded-[calc(var(--radius)+0.25rem)] border border-[var(--border)] bg-[var(--surface)] p-5">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-medium text-[var(--foreground)]">Preview</p>
            <Badge variant="outline">Markdown</Badge>
          </div>
          <Separator className="my-4" />
          <pre className="overflow-auto whitespace-pre-wrap text-sm leading-7 text-[var(--foreground)]">
            {app.activeDocumentSource}
          </pre>
        </div>
      </CardContent>
    </Card>
  );
}
