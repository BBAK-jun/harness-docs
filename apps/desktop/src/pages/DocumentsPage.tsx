import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { WorkspaceDocument } from "../types";
import type { AppPageProps } from "./pageUtils";
import { formatDateTime, SignalTile, statusBadgeVariant } from "./pageUtils";

export function DocumentsPage({ app }: AppPageProps) {
  const publishRecord = app.activeWorkspaceGraph?.publishRecords[0] ?? null;
  const documents = app.activeWorkspaceGraph?.documents ?? [];

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Choose a document</CardTitle>
          <CardDescription>
            Start by choosing one document. Everything else follows from that selection.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <SignalTile
            description="Artifacts already staged for publication."
            label="Publish batch"
            value={publishRecord?.artifacts.length ?? 0}
          />
          <SignalTile
            description="Action-first tasks available from current workspace state."
            label="AI entry points"
            value={app.aiEntryPoints.length}
          />
          <SignalTile
            description={app.activeDocument?.title ?? "Select a document to inspect details."}
            label="Selected doc"
            value={app.activeDocument ? 1 : 0}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Document list</CardTitle>
          <CardDescription>
            One row, one decision: pick the document you want to work on.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {documents.map((document) => (
            <DocumentRow app={app} document={document} key={document.id} />
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function DocumentRow({
  app,
  document,
}: {
  app: AppPageProps["app"];
  document: WorkspaceDocument;
}) {
  return (
    <button
      className={cn(
        "flex w-full flex-col gap-3 rounded-[calc(var(--radius)+0.25rem)] border p-4 text-left transition-colors",
        app.activeDocument?.id === document.id
          ? "border-[var(--app-border-strong)] bg-[var(--secondary)]"
          : "border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--secondary)]",
      )}
      onClick={() => app.handleDocumentSelect(document.id)}
      type="button"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-medium text-[var(--foreground)]">{document.title}</p>
            <Badge variant="outline">{document.type}</Badge>
            <Badge variant={statusBadgeVariant(document.lifecycle.review.freshness.status)}>
              {document.lifecycle.review.freshness.status}
            </Badge>
          </div>
          <p className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">
            {document.prePublication.summary}
          </p>
        </div>
        <Badge variant={statusBadgeVariant(document.prePublication.github.status)}>
          {document.prePublication.github.status}
        </Badge>
      </div>
      <div className="grid gap-3 text-sm text-[var(--muted-foreground)] sm:grid-cols-3">
        <span>Review: {document.lifecycle.review.status}</span>
        <span>Links: {document.linkedDocumentIds.length}</span>
        <span>Updated: {formatDateTime(document.lifecycle.updatedAt)}</span>
      </div>
    </button>
  );
}
