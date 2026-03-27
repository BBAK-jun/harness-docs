import { ArrowRight, LayoutTemplate, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface WorkspaceEmptyStateDetail {
  title: string;
  body: string;
}

interface WorkspaceEmptyStateProps {
  title?: string;
  body?: string;
  primaryActionLabel?: string;
  onPrimaryAction?: () => void;
  details?: WorkspaceEmptyStateDetail[];
}

const detailIcons = [Users, LayoutTemplate];

export function WorkspaceEmptyState({
  title = "Select a workspace",
  body = "The desktop session is active, but no workspace is currently open. Choose a workspace to enter the app shell or use this state later for create-workspace and invitation flows.",
  primaryActionLabel,
  onPrimaryAction,
  details = [
    {
      title: "Authenticated with memberships",
      body: "Users can switch between active workspaces without repeating GitHub OAuth.",
    },
    {
      title: "Authenticated without memberships",
      body: "The same entry frame can route into workspace creation or invitation acceptance without dropping the desktop session.",
    },
  ],
}: WorkspaceEmptyStateProps) {
  return (
    <div className="grid gap-5">
      <Card className="overflow-hidden border-amber-200/12 bg-slate-950/40">
        <CardHeader className="gap-4">
          <Badge variant="default" className="w-fit">
            Workspace Entry
          </Badge>
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
            <div className="space-y-3">
              <CardTitle className="text-3xl font-semibold tracking-tight text-slate-50">
                {title}
              </CardTitle>
              <CardDescription className="max-w-2xl text-base leading-7 text-slate-300">
                {body}
              </CardDescription>
            </div>

            {primaryActionLabel && onPrimaryAction ? (
              <Button
                className="justify-self-start lg:justify-self-end"
                onClick={onPrimaryAction}
                type="button"
              >
                {primaryActionLabel}
                <ArrowRight className="size-4" />
              </Button>
            ) : null}
          </div>
        </CardHeader>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        {details.map((detail, index) => {
          const Icon = detailIcons[index] ?? LayoutTemplate;

          return (
            <Card key={detail.title} className="border-white/[0.08] bg-white/[0.04]">
              <CardContent className="flex gap-4 p-6">
                <div className="grid size-11 shrink-0 place-items-center rounded-2xl border border-white/10 bg-slate-950/70 text-sky-200">
                  <Icon className="size-5" />
                </div>
                <div className="grid gap-2">
                  <h3 className="text-base font-semibold text-slate-100">{detail.title}</h3>
                  <p className="text-sm leading-6 text-slate-400">{detail.body}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
