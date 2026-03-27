import { ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { AppPageProps } from "./pageUtils";

export function AIPage({ app }: AppPageProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Choose one AI action</CardTitle>
        <CardDescription>
          Each action should be explicit. Pick one task and run it against internal docs only.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3">
        {app.aiEntryPoints.map((entry) => (
          <button
            className="flex w-full flex-col gap-3 rounded-[calc(var(--radius)+0.25rem)] border border-[var(--border)] bg-[var(--surface)] p-4 text-left transition-colors hover:bg-[var(--secondary)]"
            key={entry.id}
            onClick={() => void app.handleLaunchAITaskEntryPoint(entry)}
            type="button"
          >
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="info">{entry.provider}</Badge>
              <Badge variant="outline">{entry.kind}</Badge>
              <Badge variant="secondary">{entry.scope}</Badge>
            </div>
            <div>
              <p className="font-medium text-[var(--foreground)]">{entry.title}</p>
              <p className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">
                {entry.description}
              </p>
            </div>
            <div className="flex items-center gap-2 text-sm text-[var(--muted-foreground)]">
              <span>{entry.contextLabel}</span>
              <ArrowRight className="size-4" />
              <span>{entry.triggerLabel}</span>
            </div>
          </button>
        ))}
      </CardContent>
    </Card>
  );
}
