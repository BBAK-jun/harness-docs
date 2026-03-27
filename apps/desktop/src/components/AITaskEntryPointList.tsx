import { ArrowUpRight, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { AITaskEntryPoint } from "../types";

interface AITaskEntryPointListProps {
  entries: AITaskEntryPoint[];
  emptyMessage: string;
  onLaunchEntryPoint: (entry: AITaskEntryPoint) => void;
}

function formatKindLabel(value: AITaskEntryPoint["kind"]) {
  return value.replace(/_/g, " ");
}

export function AITaskEntryPointList({
  entries,
  emptyMessage,
  onLaunchEntryPoint,
}: AITaskEntryPointListProps) {
  if (entries.length === 0) {
    return (
      <Card className="border-dashed border-white/10 bg-white/[0.03]">
        <CardContent className="flex items-center gap-3 p-5 text-sm text-slate-400">
          <Sparkles className="size-4 text-sky-300" />
          <p>{emptyMessage}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="ai-entry-list">
      {entries.map((entry) => (
        <Card key={entry.id} className="ai-entry-card border-white/[0.08] bg-white/[0.04]">
          <CardContent className="grid gap-4 p-5">
            <div className="document-row-topline">
              <Badge variant="info">{entry.scope}</Badge>
              <Badge variant="secondary">{entry.provider}</Badge>
            </div>

            <div className="note-stack">
              <strong className="text-base font-semibold text-slate-100">{entry.title}</strong>
              <p className="muted">{entry.description}</p>
            </div>

            <div className="document-row-meta">
              <span>{entry.contextLabel}</span>
              <span>{formatKindLabel(entry.kind)}</span>
              <span>{entry.referenceDocumentIds.length} internal refs</span>
              <span>
                {entry.existingSuggestionIds.length > 0
                  ? `${entry.existingSuggestionIds.length} prior draft${entry.existingSuggestionIds.length === 1 ? "" : "s"}`
                  : "New AI task"}
              </span>
            </div>

            <Button
              className="w-fit"
              onClick={() => onLaunchEntryPoint(entry)}
              type="button"
              variant="secondary"
            >
              {entry.triggerLabel}
              <ArrowUpRight className="size-4" />
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
