import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { AppPageProps } from "./pageUtils";
import { EmptyStateCard, formatDateTime, statusBadgeVariant } from "./pageUtils";

export function ApprovalsPage({ app }: AppPageProps) {
  const workspaceGraph = app.activeWorkspaceGraph;
  const document = app.activeDocument;

  if (!workspaceGraph || !document) {
    return (
      <EmptyStateCard
        description="Select a document to inspect app-native approval state."
        title="No approval context"
      />
    );
  }

  const approvals = workspaceGraph.approvals.filter(
    (approval) => approval.documentId === document.id,
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Approval state</CardTitle>
        <CardDescription>
          This page is only about who still needs to approve and why.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {approvals.map((approval) => (
          <div
            className="flex flex-col gap-3 rounded-[calc(var(--radius)+0.25rem)] border border-[var(--border)] bg-[var(--surface)] p-4 sm:flex-row sm:items-center sm:justify-between"
            key={approval.id}
          >
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-medium text-[var(--foreground)]">{approval.reviewerLabel}</p>
                <Badge variant="outline">{approval.authority}</Badge>
                <Badge variant="secondary">{approval.source}</Badge>
              </div>
              <p className="mt-2 text-sm text-[var(--muted-foreground)]">
                Requested {formatDateTime(approval.lifecycle.requestedAt)} · decision{" "}
                {approval.decision ?? "pending"}
              </p>
            </div>
            <Badge variant={statusBadgeVariant(approval.lifecycle.state)}>
              {approval.lifecycle.state}
            </Badge>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
