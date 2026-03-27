import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { AIProvider, NavigationArea, WorkspaceSummary } from "../types";

interface WorkspaceAreaOverviewProps {
  workspace: WorkspaceSummary;
  activeArea: NavigationArea;
  preferredAIProvider: AIProvider;
  onPreferredAIProviderChange: (provider: AIProvider) => void;
}

const aiProviderOptions: Array<{
  value: AIProvider;
  label: string;
  description: string;
}> = [
  {
    value: "Codex",
    label: "Codex",
    description: "Fast drafting and revision support for document updates and publish memos."
  },
  {
    value: "Claude",
    label: "Claude",
    description: "Long-form synthesis support for linked-document analysis and approval suggestions."
  }
];

function getAIContent(preferredAIProvider: AIProvider) {
  if (preferredAIProvider === "Codex") {
    return {
      primaryActionLabel: "Start Codex task",
      composerHeadline: "Action-button launches stay optimized for fast drafting passes.",
      composerBody:
        "Use Codex when you want a quick first draft, targeted revisions, or a publish memo pass against the current workspace context.",
      composerActions: ["Draft document update", "Revise linked sections", "Prepare publish memo"],
      foundationNotes: [
        "Codex stays the active launch target until the user explicitly switches providers.",
        "Fast drafting actions read the same workspace-only retrieval scope as every other AI task.",
        "The composer surfaces the current provider so memo and content drafting stay predictable."
      ]
    };
  }

  return {
    primaryActionLabel: "Start Claude task",
    composerHeadline: "Action-button launches stay optimized for linked-document synthesis.",
    composerBody:
      "Use Claude when you want broader reasoning across workspace documents before proposing approvers, links, or longer-form revisions.",
    composerActions: ["Analyze linked docs", "Suggest approvers", "Outline rationale"],
    foundationNotes: [
      "Claude stays the active launch target until the user explicitly switches providers.",
      "Long-form synthesis still remains constrained to internal workspace documents in v1.",
      "The composer surfaces the current provider so approver and linkage suggestions stay explicit."
    ]
  };
}

export function WorkspaceAreaOverview({
  workspace,
  activeArea,
  preferredAIProvider,
  onPreferredAIProviderChange
}: WorkspaceAreaOverviewProps) {
  const area = workspace.areas[activeArea];
  const isAIArea = activeArea === "ai";
  const aiContent = getAIContent(preferredAIProvider);
  const activeAIProviderOption =
    aiProviderOptions.find((option) => option.value === preferredAIProvider) ?? aiProviderOptions[0];
  const foundationNotes = isAIArea
    ? aiContent.foundationNotes
    : [
        "Workspace selection is app-managed and decoupled from raw GitHub repository access.",
        "The shell keeps top-level areas stable so later service integrations can attach without replacing navigation.",
        "Returning to the workspace list preserves the signed-in state while clearly separating no-workspace and active-workspace views."
      ];

  return (
    <div className="grid gap-4">
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(18rem,0.8fr)]">
        <Card className="border-white/10 bg-white/[0.04]">
          <CardHeader className="gap-3">
            <Badge variant="secondary" className="w-fit">
              Current Area
            </Badge>
            <CardTitle className="text-2xl">{area.title}</CardTitle>
            <CardDescription className="max-w-2xl text-base leading-7 text-slate-300">
              {area.description}
            </CardDescription>
            {isAIArea ? (
              <p className="text-sm text-slate-400">
                Active provider: <strong className="text-slate-200">{activeAIProviderOption.label}</strong>.{" "}
                {activeAIProviderOption.description}
              </p>
            ) : null}
          </CardHeader>
          <CardContent className="grid gap-4">
            <Button className="w-fit" type="button">
              {isAIArea ? aiContent.primaryActionLabel : area.primaryAction}
            </Button>
          </CardContent>
        </Card>

        <Card className="border-white/[0.08] bg-white/[0.04]">
          <CardHeader>
            <Badge variant="outline" className="w-fit">
              Workspace Snapshot
            </Badge>
            <CardTitle>Operational load</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-3 xl:grid-cols-1">
            <div className="rounded-3xl border border-white/[0.08] bg-slate-950/70 p-4">
              <p className="text-3xl font-semibold text-slate-50">{workspace.pendingDrafts}</p>
              <p className="mt-1 text-sm text-slate-400">Drafts needing author action</p>
            </div>
            <div className="rounded-3xl border border-white/[0.08] bg-slate-950/70 p-4">
              <p className="text-3xl font-semibold text-slate-50">{workspace.openReviews}</p>
              <p className="mt-1 text-sm text-slate-400">Open reviews and change requests</p>
            </div>
            <div className="rounded-3xl border border-white/[0.08] bg-slate-950/70 p-4">
              <p className="text-3xl font-semibold text-slate-50">{workspace.staleDocuments}</p>
              <p className="mt-1 text-sm text-slate-400">Docs likely to need stale rationale</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card className="border-white/[0.08] bg-white/[0.04]">
          <CardHeader>
            <Badge variant="secondary" className="w-fit">
              What Lives Here
            </Badge>
            <CardTitle>{isAIArea ? "Provider composer" : "Area details"}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            {isAIArea ? (
              <>
                <form className="grid gap-3" aria-label="AI provider preferences">
                  <fieldset className="grid gap-3">
                    <legend className="text-sm font-semibold text-slate-100">
                      Provider Preference
                    </legend>
                    <p className="text-sm leading-6 text-slate-400">
                      Choose the default provider for new AI tasks. Only one provider can be
                      active at a time.
                    </p>
                    <div className="grid gap-3">
                      {aiProviderOptions.map((option) => {
                        const isSelected = preferredAIProvider === option.value;

                        return (
                          <label
                            key={option.value}
                            className={cn(
                              "grid cursor-pointer grid-cols-[auto_minmax(0,1fr)] gap-3 rounded-3xl border px-4 py-4 transition-colors",
                              isSelected
                                ? "border-amber-200/24 bg-amber-200/10"
                                : "border-white/10 bg-slate-950/55 hover:bg-white/[0.05]"
                            )}
                          >
                            <input
                              checked={isSelected}
                              className="mt-1 accent-amber-200"
                              name="preferred-ai-provider"
                              onChange={() => onPreferredAIProviderChange(option.value)}
                              type="radio"
                              value={option.value}
                            />
                            <span className="grid gap-1">
                              <strong className="text-sm text-slate-100">{option.label}</strong>
                              <span className="text-sm leading-6 text-slate-400">
                                {option.description}
                              </span>
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  </fieldset>
                </form>

                <Card className="border-white/[0.08] bg-slate-950/50">
                  <CardHeader className="gap-3 p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-2">
                        <Badge variant="info" className="w-fit">
                          Drafting Composer
                        </Badge>
                        <CardTitle className="text-lg">{aiContent.composerHeadline}</CardTitle>
                      </div>
                      <Badge variant="secondary">{preferredAIProvider} active</Badge>
                    </div>
                    <CardDescription>{aiContent.composerBody}</CardDescription>
                  </CardHeader>
                  <CardContent className="grid gap-3 p-5 pt-0">
                    {aiContent.composerActions.map((action) => (
                      <div
                        key={action}
                        className="flex items-center justify-between gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.04] px-4 py-3 text-sm"
                      >
                        <span className="text-slate-200">{action}</span>
                        <Badge variant="outline">{preferredAIProvider}</Badge>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </>
            ) : (
              <ul className="grid gap-3">
                {area.highlights.map((highlight) => (
                  <li
                    key={highlight}
                    className="rounded-2xl border border-white/[0.08] bg-slate-950/60 px-4 py-3 text-sm leading-6 text-slate-300"
                  >
                    {highlight}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="border-white/[0.08] bg-white/[0.04]">
          <CardHeader>
            <Badge variant="outline" className="w-fit">
              Foundation Notes
            </Badge>
            <CardTitle>Shell behavior</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            {foundationNotes.map((note) => (
              <div
                key={note}
                className="rounded-2xl border border-white/[0.08] bg-slate-950/60 px-4 py-3 text-sm leading-6 text-slate-300"
              >
                {note}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
