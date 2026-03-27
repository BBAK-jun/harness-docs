import { Bot, FolderKanban, GitBranch, LogOut, ShieldCheck } from "lucide-react";
import { AppShell } from "./components/AppShell";
import { WorkspaceEmptyState } from "./components/WorkspaceEmptyState";
import { WorkspaceSelector } from "./components/WorkspaceSelector";
import { Badge } from "./components/ui/badge";
import { Button } from "./components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./components/ui/card";
import { useApiHealth } from "./hooks/useApiHealth";
import { useHarnessDocsApp } from "./hooks/useHarnessDocsApp";

export default function App() {
  const {
    isReady,
    desktopShell,
    authentication,
    user,
    workspaces,
    activeWorkspaceId,
    activeWorkspace,
    activeWorkspaceGraph,
    activeArea,
    preferredAIProvider,
    aiEntryPoints,
    aiTaskState,
    publishState,
    activeDocument,
    activeMembershipId,
    activeDocumentSource,
    activeDocumentLock,
    setActiveArea,
    handlePreferredAIProviderChange,
    handleSignIn,
    handleSignOut,
    handleWorkspaceEnter,
    handleWorkspaceLeave,
    handleDocumentSelect,
    handleLaunchAITaskEntryPoint,
    handleExecutePublish,
    handleDocumentSourceChange,
    handleStartEditing,
    handleReleaseEditing,
    handleCreateBlockComment
  } = useHarnessDocsApp();
  const apiHealth = useApiHealth();

  return (
    <main className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,rgba(251,191,36,0.18),transparent_24rem),radial-gradient(circle_at_bottom_right,rgba(56,189,248,0.12),transparent_28rem),linear-gradient(180deg,#020617_0%,#0f172a_45%,#111827_100%)] text-slate-100">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
      <div className="grid min-h-screen gap-6 p-4 lg:grid-cols-[23rem_minmax(0,1fr)] lg:p-6">
        <aside className="flex flex-col gap-5 rounded-[32px] border border-white/10 bg-slate-950/55 p-5 shadow-[0_35px_120px_-60px_rgba(2,6,23,0.95)] backdrop-blur-xl">
          <Card className="overflow-hidden border-amber-200/10 bg-slate-950/30">
            <CardHeader className="gap-4">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-3">
                  <Badge variant="default" className="w-fit">
                    Desktop Foundation
                  </Badge>
                  <div className="space-y-2">
                    <CardTitle className="text-3xl font-semibold tracking-tight">
                      Harness Docs
                    </CardTitle>
                    <CardDescription className="max-w-sm text-sm leading-6">
                      Structured product docs, app-native approvals, AI harness workflows, and
                      GitHub publication in one desktop workspace.
                    </CardDescription>
                  </div>
                </div>
                <div className="rounded-2xl border border-amber-200/20 bg-amber-200/10 p-3 text-amber-100">
                  <FolderKanban className="size-5" />
                </div>
              </div>

              {desktopShell ? (
                <div className="grid gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.05] p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="secondary">
                      {desktopShell.runtime === "tauri" ? "Tauri shell" : "Browser preview"}
                    </Badge>
                    <Badge variant="outline">{desktopShell.platform}</Badge>
                    <Badge
                      variant={
                        apiHealth.status === "healthy"
                          ? "success"
                          : apiHealth.status === "checking"
                            ? "info"
                            : "warning"
                      }
                    >
                      {apiHealth.status === "healthy"
                        ? "RPC online"
                        : apiHealth.status === "checking"
                          ? "RPC checking"
                          : "RPC offline"}
                    </Badge>
                  </div>
                  <div className="grid gap-2 text-sm text-slate-300">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="size-4 text-emerald-300" />
                      <span>{authentication?.provider.label ?? "Auth pending"}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Bot className="size-4 text-sky-300" />
                      <span>{desktopShell.supportedAIProviders.join(" / ")}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <GitBranch className="size-4 text-amber-200" />
                      <span>App-owned docs with GitHub publish automation</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Bot className="size-4 text-violet-300" />
                      <span>{apiHealth.message}</span>
                    </div>
                  </div>
                </div>
              ) : null}
            </CardHeader>
          </Card>

          {user ? (
            <WorkspaceSelector
              user={user}
              workspaces={workspaces}
              activeWorkspaceId={activeWorkspaceId}
              onEnterWorkspace={handleWorkspaceEnter}
            />
          ) : (
            <Card className="border-white/[0.08] bg-slate-950/30">
              <CardHeader>
                <Badge variant="info" className="w-fit">
                  Workspace access
                </Badge>
                <CardTitle className="text-xl">Sign in to load memberships</CardTitle>
                <CardDescription>
                  Workspace lists stay behind the provider session so GitHub identity restoration is
                  separate from app navigation.
                </CardDescription>
              </CardHeader>
            </Card>
          )}

          <Card className="mt-auto border-white/[0.08] bg-slate-950/35">
            <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
              <div className="text-sm text-slate-400">
                {authentication?.status === "authenticated"
                  ? "Workspace switching preserves the signed-in app session."
                  : "Authentication gates workspace loading and publish actions."}
              </div>
              {authentication?.status === "authenticated" ? (
                <Button onClick={handleSignOut} type="button" variant="ghost">
                  <LogOut className="size-4" />
                  Sign out
                </Button>
              ) : null}
            </CardContent>
          </Card>
        </aside>

        <section className="min-w-0 rounded-[32px] border border-white/10 bg-slate-950/35 p-4 shadow-[0_35px_120px_-60px_rgba(2,6,23,0.95)] backdrop-blur-xl lg:p-6">
          {!isReady ? (
            <WorkspaceEmptyState
              title="Loading desktop session"
              body="Bootstrapping shell capabilities, authentication state, workspace state, and local preferences through the app service layer."
            />
          ) : authentication?.status === "signed_out" ? (
            <WorkspaceEmptyState
              title="Sign in to Harness Docs"
              body="Authentication is routed through a replaceable provider contract, so GitHub OAuth can be connected later without changing the desktop shell flow."
              primaryActionLabel={authentication.provider.loginCtaLabel}
              onPrimaryAction={() => void handleSignIn(authentication.provider.id)}
              details={[
                {
                  title: "Provider contract first",
                  body: "The shell only depends on provider metadata and session state, not on GitHub-specific callback handling."
                },
                {
                  title: "Workspace session deferred",
                  body: "Workspace data loads only after the auth layer restores a signed-in session."
                }
              ]}
            />
          ) : activeWorkspace ? (
            <AppShell
              workspace={activeWorkspace}
              workspaceGraph={activeWorkspaceGraph}
              activeArea={activeArea}
              preferredAIProvider={preferredAIProvider}
              aiEntryPoints={aiEntryPoints}
              aiTaskState={aiTaskState}
              publishState={publishState}
              activeDocument={activeDocument}
              activeMembershipId={activeMembershipId}
              activeDocumentSource={activeDocumentSource}
              activeDocumentLock={activeDocumentLock}
              onAreaChange={setActiveArea}
              onPreferredAIProviderChange={handlePreferredAIProviderChange}
              onDocumentSelect={handleDocumentSelect}
              onLaunchAITaskEntryPoint={handleLaunchAITaskEntryPoint}
              onExecutePublish={handleExecutePublish}
              onDocumentSourceChange={handleDocumentSourceChange}
              onStartEditing={handleStartEditing}
              onReleaseEditing={handleReleaseEditing}
              onCreateBlockComment={handleCreateBlockComment}
              onLeaveWorkspace={handleWorkspaceLeave}
            />
          ) : (
            <WorkspaceEmptyState />
          )}
        </section>
      </div>
    </main>
  );
}
