import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { AppPageProps } from "./pageUtils";
import { EmptyStateCard, statusBadgeVariant } from "./pageUtils";

export function PublishPage({ app }: AppPageProps) {
  const publishRecord = app.activeWorkspaceGraph?.publishRecords[0] ?? null;

  if (!publishRecord) {
    return (
      <EmptyStateCard
        description="A publish record has not been created for this workspace yet."
        title="No publish batch"
      />
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Publish this batch</CardTitle>
            <CardDescription>
              Show only the checks required before publication, then let the user publish.
            </CardDescription>
          </div>
          <Button onClick={() => void app.handleExecutePublish()}>Execute publish</Button>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="grid gap-3 md:grid-cols-5">
          {publishRecord.stages.map((stage) => (
            <div
              className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] p-4"
              key={stage.id}
            >
              <div className="flex items-center justify-between gap-3">
                <p className="font-medium text-[var(--foreground)]">{stage.title}</p>
                <Badge variant={statusBadgeVariant(stage.status)}>{stage.status}</Badge>
              </div>
              <p className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">
                {stage.description}
              </p>
            </div>
          ))}
        </div>
        <div className="rounded-[calc(var(--radius)+0.25rem)] border border-[var(--border)] bg-[var(--surface)] p-4">
          <p className="font-medium text-[var(--foreground)]">Stale rationale</p>
          <p className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">
            {publishRecord.staleRationale || "No stale rationale recorded yet."}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
