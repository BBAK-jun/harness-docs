import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { WorkspaceSummary } from "../types";

interface WorkspaceHeaderProps {
  workspace: WorkspaceSummary;
  onLeaveWorkspace: () => void;
}

export function WorkspaceHeader({ workspace, onLeaveWorkspace }: WorkspaceHeaderProps) {
  return (
    <header className="mb-5 grid gap-4 rounded-[28px] border border-white/10 bg-white/[0.035] p-5 shadow-[0_24px_90px_-50px_rgba(15,23,42,0.9)] backdrop-blur xl:grid-cols-[minmax(0,1fr)_auto] xl:items-end">
      <div className="space-y-3">
        <Badge variant="secondary" className="w-fit">
          Workspace
        </Badge>
        <div className="space-y-2">
          <h2 className="text-3xl font-semibold tracking-tight text-slate-50">{workspace.name}</h2>
          <p className="max-w-3xl text-sm leading-6 text-slate-300">{workspace.description}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline">{workspace.role}</Badge>
          <Badge variant="info">{workspace.repo}</Badge>
          <Badge variant="secondary">{workspace.pendingDrafts} drafts</Badge>
          <Badge variant="warning">{workspace.staleDocuments} stale</Badge>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={onLeaveWorkspace} type="button" variant="ghost">
          Switch workspace
        </Button>
      </div>
    </header>
  );
}
