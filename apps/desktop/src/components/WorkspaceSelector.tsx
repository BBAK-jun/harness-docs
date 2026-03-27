import { ArrowRight, FolderOpen } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { SessionUser, WorkspaceSummary } from "../types";

interface WorkspaceSelectorProps {
  user: SessionUser;
  workspaces: WorkspaceSummary[];
  activeWorkspaceId: string | null;
  onEnterWorkspace: (workspaceId: string) => void;
}

export function WorkspaceSelector({
  user,
  workspaces,
  activeWorkspaceId,
  onEnterWorkspace
}: WorkspaceSelectorProps) {
  return (
    <Card className="flex min-h-0 flex-1 flex-col overflow-hidden border-white/[0.08] bg-slate-950/35">
      <CardHeader className="gap-4">
        <div className="flex items-center gap-3">
          <div className="grid size-12 place-items-center rounded-2xl bg-gradient-to-br from-amber-200 via-orange-300 to-sky-300 text-sm font-semibold text-slate-950 shadow-[0_18px_40px_-20px_rgba(251,191,36,0.9)]">
            {user.avatarInitials}
          </div>
          <div className="min-w-0">
            <CardTitle className="truncate text-xl">{user.name}</CardTitle>
            <p className="truncate text-sm text-slate-400">{user.handle}</p>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.05] px-4 py-3">
          <div>
            <p className="text-sm font-medium text-slate-200">Workspace memberships</p>
            <p className="text-sm text-slate-400">Switch between connected doc repositories.</p>
          </div>
          <Badge variant="secondary">{workspaces.length} spaces</Badge>
        </div>
      </CardHeader>

      <CardContent className="grid gap-3 overflow-y-auto">
        {workspaces.map((workspace) => {
          const isActive = workspace.id === activeWorkspaceId;

          return (
            <button
              key={workspace.id}
              className={cn(
                "group grid gap-3 rounded-3xl border px-4 py-4 text-left transition-all",
                isActive
                  ? "border-amber-200/30 bg-amber-200/12 shadow-[0_20px_60px_-38px_rgba(251,191,36,0.9)]"
                  : "border-white/[0.08] bg-white/[0.04] hover:border-white/[0.16] hover:bg-white/[0.07]"
              )}
              onClick={() => onEnterWorkspace(workspace.id)}
              type="button"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <FolderOpen className="size-4 text-amber-200" />
                    <strong className="text-sm text-slate-100">{workspace.name}</strong>
                  </div>
                  <p className="text-sm text-slate-400">{workspace.repo}</p>
                </div>
                <Badge variant={isActive ? "default" : "secondary"}>{workspace.role}</Badge>
              </div>

              <div className="grid grid-cols-3 gap-2 text-xs text-slate-400">
                <div className="rounded-2xl border border-white/[0.08] bg-slate-950/60 px-3 py-2">
                  <p className="text-base font-semibold text-slate-100">{workspace.pendingDrafts}</p>
                  <p>Drafts</p>
                </div>
                <div className="rounded-2xl border border-white/[0.08] bg-slate-950/60 px-3 py-2">
                  <p className="text-base font-semibold text-slate-100">{workspace.openReviews}</p>
                  <p>Reviews</p>
                </div>
                <div className="rounded-2xl border border-white/[0.08] bg-slate-950/60 px-3 py-2">
                  <p className="text-base font-semibold text-slate-100">{workspace.staleDocuments}</p>
                  <p>Stale</p>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs uppercase tracking-[0.18em] text-slate-500">
                <span>{isActive ? "Open now" : "Enter workspace"}</span>
                <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
              </div>
            </button>
          );
        })}
      </CardContent>
    </Card>
  );
}
