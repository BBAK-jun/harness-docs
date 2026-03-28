import { useMemo, useState } from "react";
import { AlertCircle, ArrowRight, LoaderCircle } from "lucide-react";
import type { WorkspaceCreateRequestDto } from "@harness-docs/contracts";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { type GridColumnCount, getSplitGridClassName } from "./layoutGrid";

function toSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function WorkspaceCreatePage({
  defaultRepoOwner,
  errorMessage,
  isSubmitting,
  onCancel,
  onCreate,
  onSignOut,
  layoutColumns = 2,
  withinShell = false,
}: {
  defaultRepoOwner: string;
  errorMessage: string | null;
  isSubmitting: boolean;
  onCancel: () => void;
  onCreate: (input: WorkspaceCreateRequestDto) => Promise<void>;
  onSignOut: () => void;
  layoutColumns?: GridColumnCount;
  withinShell?: boolean;
}) {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [docsRepoOwner, setDocsRepoOwner] = useState("");
  const [docsRepoName, setDocsRepoName] = useState("");
  const [docsRepoDefaultBranch, setDocsRepoDefaultBranch] = useState("main");
  const hasExplicitRepositoryBinding =
    docsRepoOwner.trim().length > 0 || docsRepoName.trim().length > 0;

  const normalizedSlug = useMemo(() => toSlug(slug || name), [name, slug]);
  const normalizedRepoName = useMemo(
    () => toSlug(docsRepoName || `${normalizedSlug || "workspace"}-docs`),
    [docsRepoName, normalizedSlug],
  );

  const canSubmit =
    name.trim().length > 0 &&
    normalizedSlug.length > 0 &&
    description.trim().length > 0 &&
    (!hasExplicitRepositoryBinding ||
      (docsRepoOwner.trim().length > 0 && normalizedRepoName.length > 0)) &&
    docsRepoDefaultBranch.trim().length > 0;

  return (
    <main className={withinShell ? "flex flex-col gap-6" : "app-frame min-h-screen p-6"}>
      <div
        className={
          withinShell
            ? getSplitGridClassName(layoutColumns)
            : `mx-auto min-h-[calc(100vh-3rem)] max-w-6xl ${getSplitGridClassName(layoutColumns)}`
        }
      >
        <section className="rounded-[calc(var(--radius)+0.75rem)] border border-[var(--border)] bg-[rgba(255,255,255,0.62)] p-6 shadow-[0_30px_120px_-80px_rgba(15,23,42,0.5)] backdrop-blur-xl sm:p-8">
          <Badge className="w-fit" variant="info">
            워크스페이스 생성
          </Badge>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight text-[var(--foreground)]">
            새 워크스페이스 만들기
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-8 text-[var(--muted-foreground)]">
            워크스페이스는 하나의 GitHub 문서 저장소와 연결되고, 생성한 사용자가 즉시 Lead 권한을
            가집니다. 생성이 완료되면 새 워크스페이스 대시보드로 바로 이동합니다.
          </p>

          <div className="mt-8 grid gap-3">
            {[
              "워크스페이스 slug는 중복되면 API가 suffix를 붙여 조정합니다.",
              "문서 저장소 owner와 name을 모두 입력하면 API가 GitHub 저장소/브랜치 유효성을 검증합니다.",
              "문서 저장소 입력을 비워두면 현재 계정 GitHub login과 slug 기반 기본 repo 이름을 API가 채웁니다.",
              "생성 직후 bootstrap이 다시 로드되어 워크스페이스 목록과 현재 세션이 갱신됩니다.",
            ].map((item) => (
              <div
                className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] p-4 text-sm leading-6 text-[var(--foreground)]"
                key={item}
              >
                {item}
              </div>
            ))}
          </div>
        </section>

        <Card className="overflow-hidden">
          <CardHeader className="border-b border-[var(--border)]">
            <CardTitle>생성 정보</CardTitle>
            <CardDescription className="text-base">
              필수 정보만 입력하면 바로 워크스페이스를 만들 수 있습니다.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-5 pt-6">
            {errorMessage ? (
              <Alert variant="destructive">
                <AlertCircle className="size-4" />
                <AlertTitle>워크스페이스 생성 실패</AlertTitle>
                <AlertDescription>{errorMessage}</AlertDescription>
              </Alert>
            ) : null}

            <div className="grid gap-2">
              <label className="text-sm font-medium text-[var(--foreground)]" htmlFor="workspace-name">
                워크스페이스 이름
              </label>
              <Input
                id="workspace-name"
                onChange={(event) => setName(event.target.value)}
                placeholder="Harness Docs"
                value={name}
              />
            </div>

            <div className="grid gap-2">
              <label className="text-sm font-medium text-[var(--foreground)]" htmlFor="workspace-slug">
                워크스페이스 slug
              </label>
              <Input
                id="workspace-slug"
                onChange={(event) => setSlug(event.target.value)}
                placeholder="harness-docs"
                value={slug}
              />
              <p className="text-xs text-[var(--muted-foreground)]">
                저장 값: <span className="font-medium text-[var(--foreground)]">{normalizedSlug || "-"}</span>
              </p>
            </div>

            <div className="grid gap-2">
              <label className="text-sm font-medium text-[var(--foreground)]" htmlFor="workspace-description">
                설명
              </label>
              <Textarea
                id="workspace-description"
                onChange={(event) => setDescription(event.target.value)}
                placeholder="제품 문서 작성, 승인, 발행을 관리하는 워크스페이스"
                value={description}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <label className="text-sm font-medium text-[var(--foreground)]" htmlFor="workspace-repo-owner">
                  Docs repo owner
                </label>
                <Input
                  id="workspace-repo-owner"
                  onChange={(event) => setDocsRepoOwner(event.target.value)}
                  placeholder={defaultRepoOwner || "my-org"}
                  value={docsRepoOwner}
                />
              </div>
              <div className="grid gap-2">
                <label className="text-sm font-medium text-[var(--foreground)]" htmlFor="workspace-branch">
                  Default branch
                </label>
                <Input
                  id="workspace-branch"
                  onChange={(event) => setDocsRepoDefaultBranch(event.target.value)}
                  placeholder="main"
                  value={docsRepoDefaultBranch}
                />
              </div>
            </div>

            <div className="grid gap-2">
              <label className="text-sm font-medium text-[var(--foreground)]" htmlFor="workspace-repo-name">
                Docs repo name
              </label>
              <Input
                id="workspace-repo-name"
                onChange={(event) => setDocsRepoName(event.target.value)}
                placeholder="harness-docs-docs"
                value={docsRepoName}
              />
              <p className="text-xs text-[var(--muted-foreground)]">
                저장 값: <span className="font-medium text-[var(--foreground)]">{normalizedRepoName || "-"}</span>
              </p>
              {!hasExplicitRepositoryBinding ? (
                <p className="text-xs text-[var(--muted-foreground)]">
                  비워두면 API 기본값이 적용됩니다:
                  {" "}
                  <span className="font-medium text-[var(--foreground)]">
                    {defaultRepoOwner || "viewer-login"}/{normalizedRepoName || "workspace-docs"}
                  </span>
                </p>
              ) : null}
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <Button
                className="sm:flex-1"
                disabled={!canSubmit || isSubmitting}
                onClick={() => {
                  const payload: WorkspaceCreateRequestDto = {
                    name: name.trim(),
                    slug: normalizedSlug,
                    description: description.trim(),
                    docsRepoDefaultBranch: docsRepoDefaultBranch.trim(),
                  };

                  if (docsRepoOwner.trim()) {
                    payload.docsRepoOwner = docsRepoOwner.trim();
                  }

                  if (docsRepoName.trim()) {
                    payload.docsRepoName = normalizedRepoName;
                  }

                  void onCreate(payload);
                }}
              >
                {isSubmitting ? <LoaderCircle className="animate-spin" /> : <ArrowRight />}
                워크스페이스 만들기
              </Button>
              <Button className="sm:flex-1" onClick={onCancel} variant="outline">
                돌아가기
              </Button>
            </div>

            <Button onClick={onSignOut} variant="ghost">
              다른 계정으로 로그인하려면 로그아웃
            </Button>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
