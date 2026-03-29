import { useForm } from "@tanstack/react-form";
import { AlertCircle, ArrowRight, LoaderCircle } from "lucide-react";
import type { WorkspaceCreateRequestDto } from "@harness-docs/contracts";
import { useClientActivityLog } from "@/components/ClientActivityLogProvider";
import { PrimaryPageAction, SecondaryPageAction } from "@/components/pageActions";
import {
  ElevatedPanel,
  HintPanel,
  InsetPanel,
  PanelCard,
  PanelCardContent,
  PanelCardHeader,
} from "@/components/pagePanels";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { CardDescription, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { PanelSlotsLayout } from "@/components/PanelSlotsLayout";
import { type GridColumnCount, getSplitGridClassName } from "./layoutGrid";

type WorkspaceCreateFormValues = {
  name: string;
  slug: string;
  description: string;
  docsRepoOwner: string;
  docsRepoName: string;
  docsRepoDefaultBranch: string;
};

function toSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function hasExplicitRepositoryBinding(values: WorkspaceCreateFormValues) {
  return values.docsRepoOwner.trim().length > 0 || values.docsRepoName.trim().length > 0;
}

function getNormalizedSlug(values: Pick<WorkspaceCreateFormValues, "name" | "slug">) {
  return toSlug(values.slug || values.name);
}

function getNormalizedRepoName(
  values: Pick<WorkspaceCreateFormValues, "docsRepoName" | "name" | "slug">,
) {
  return toSlug(values.docsRepoName || `${getNormalizedSlug(values) || "workspace"}-docs`);
}

function getEffectiveRepoOwner(
  values: Pick<WorkspaceCreateFormValues, "docsRepoOwner" | "docsRepoName">,
  defaultRepoOwner: string,
) {
  if (
    !hasExplicitRepositoryBinding({
      name: "",
      slug: "",
      description: "",
      docsRepoOwner: values.docsRepoOwner,
      docsRepoName: values.docsRepoName,
      docsRepoDefaultBranch: "",
    })
  ) {
    return "";
  }

  return values.docsRepoOwner.trim() || defaultRepoOwner.trim();
}

function canSubmitWorkspaceCreateForm(values: WorkspaceCreateFormValues, defaultRepoOwner: string) {
  const normalizedSlug = getNormalizedSlug(values);
  const explicitRepositoryBinding = hasExplicitRepositoryBinding(values);
  const effectiveRepoOwner = getEffectiveRepoOwner(values, defaultRepoOwner);
  const normalizedRepoName = getNormalizedRepoName(values);

  return (
    values.name.trim().length > 0 &&
    normalizedSlug.length > 0 &&
    values.description.trim().length > 0 &&
    (!explicitRepositoryBinding ||
      (effectiveRepoOwner.length > 0 && normalizedRepoName.length > 0)) &&
    values.docsRepoDefaultBranch.trim().length > 0
  );
}

function getFieldError(errors: unknown[]) {
  const firstError = errors[0];

  return typeof firstError === "string" ? firstError : null;
}

export function WorkspaceCreatePage({
  defaultRepoOwner,
  errorMessage,
  isSubmitting,
  onCancel,
  onCreate,
  layoutColumns = 2,
  withinShell = false,
}: {
  defaultRepoOwner: string;
  errorMessage: string | null;
  isSubmitting: boolean;
  onCancel: () => void;
  onCreate: (input: WorkspaceCreateRequestDto) => Promise<void>;
  layoutColumns?: GridColumnCount;
  withinShell?: boolean;
}) {
  const { logEvent } = useClientActivityLog();
  const form = useForm({
    defaultValues: {
      name: "",
      slug: "",
      description: "",
      docsRepoOwner: "",
      docsRepoName: "",
      docsRepoDefaultBranch: "main",
    } satisfies WorkspaceCreateFormValues,
    onSubmit: async ({ value }) => {
      const normalizedSlug = getNormalizedSlug(value);
      const normalizedRepoName = getNormalizedRepoName(value);
      const explicitRepositoryBinding = hasExplicitRepositoryBinding(value);
      const effectiveRepoOwner = getEffectiveRepoOwner(value, defaultRepoOwner);

      if (!canSubmitWorkspaceCreateForm(value, defaultRepoOwner)) {
        return;
      }

      const payload: WorkspaceCreateRequestDto = {
        name: value.name.trim(),
        slug: normalizedSlug,
        description: value.description.trim(),
        docsRepoDefaultBranch: value.docsRepoDefaultBranch.trim(),
      };

      if (explicitRepositoryBinding && effectiveRepoOwner) {
        payload.docsRepoOwner = effectiveRepoOwner;
      }

      if (value.docsRepoName.trim()) {
        payload.docsRepoName = normalizedRepoName;
      }

      logEvent({
        action: "워크스페이스 생성 제출",
        description: payload.name,
        source: "workspace-create",
      });
      await onCreate(payload);
    },
  });

  return (
    <main className={withinShell ? "flex flex-col gap-6" : "app-frame min-h-screen p-6"}>
      <PanelSlotsLayout
        bodyClassName={withinShell ? undefined : "mx-auto min-h-[calc(100vh-3rem)] max-w-6xl"}
        bodyColumns={layoutColumns}
        leftPanel={
          <ElevatedPanel>
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
                <InsetPanel key={item}>{item}</InsetPanel>
              ))}
            </div>
          </ElevatedPanel>
        }
        rightPanel={
          <PanelCard>
            <PanelCardHeader>
              <CardTitle>생성 정보</CardTitle>
              <CardDescription className="text-base">
                필수 정보만 입력하면 바로 워크스페이스를 만들 수 있습니다.
              </CardDescription>
            </PanelCardHeader>
            <PanelCardContent className="grid gap-6 pt-6 sm:pt-7">
              {errorMessage ? (
                <Alert variant="destructive">
                  <AlertCircle className="size-4" />
                  <AlertTitle>워크스페이스 생성 실패</AlertTitle>
                  <AlertDescription>{errorMessage}</AlertDescription>
                </Alert>
              ) : null}

              <form
                className="grid gap-6"
                onSubmit={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  void form.handleSubmit();
                }}
              >
                <form.Field
                  name="name"
                  validators={{
                    onChange: ({ value }) =>
                      value.trim().length > 0 ? undefined : "워크스페이스 이름을 입력하세요.",
                  }}
                >
                  {(field) => (
                    <div className="grid gap-2.5">
                      <label
                        className="text-sm font-medium text-[var(--foreground)]"
                        htmlFor={field.name}
                      >
                        워크스페이스 이름
                      </label>
                      <Input
                        id={field.name}
                        onBlur={field.handleBlur}
                        onChange={(event) => field.handleChange(event.target.value)}
                        placeholder="Harness Docs"
                        value={field.state.value}
                      />
                      {field.state.meta.isTouched && getFieldError(field.state.meta.errors) ? (
                        <p className="text-xs text-[var(--destructive)]">
                          {getFieldError(field.state.meta.errors)}
                        </p>
                      ) : null}
                    </div>
                  )}
                </form.Field>

                <form.Field name="slug">
                  {(field) => (
                    <div className="grid gap-2.5">
                      <label
                        className="text-sm font-medium text-[var(--foreground)]"
                        htmlFor={field.name}
                      >
                        워크스페이스 slug
                      </label>
                      <Input
                        id={field.name}
                        onBlur={field.handleBlur}
                        onChange={(event) => field.handleChange(event.target.value)}
                        placeholder="harness-docs"
                        value={field.state.value}
                      />
                      <form.Subscribe selector={(state) => getNormalizedSlug(state.values)}>
                        {(normalizedSlug) => (
                          <HintPanel>
                            저장 값:{" "}
                            <span className="font-medium text-[var(--foreground)]">
                              {normalizedSlug || "-"}
                            </span>
                          </HintPanel>
                        )}
                      </form.Subscribe>
                    </div>
                  )}
                </form.Field>

                <form.Field
                  name="description"
                  validators={{
                    onChange: ({ value }) =>
                      value.trim().length > 0 ? undefined : "워크스페이스 설명을 입력하세요.",
                  }}
                >
                  {(field) => (
                    <div className="grid gap-2.5">
                      <label
                        className="text-sm font-medium text-[var(--foreground)]"
                        htmlFor={field.name}
                      >
                        설명
                      </label>
                      <Textarea
                        id={field.name}
                        onBlur={field.handleBlur}
                        onChange={(event) => field.handleChange(event.target.value)}
                        placeholder="제품 문서 작성, 승인, 발행을 관리하는 워크스페이스"
                        value={field.state.value}
                      />
                      {field.state.meta.isTouched && getFieldError(field.state.meta.errors) ? (
                        <p className="text-xs text-[var(--destructive)]">
                          {getFieldError(field.state.meta.errors)}
                        </p>
                      ) : null}
                    </div>
                  )}
                </form.Field>

                <InsetPanel className="grid gap-4 sm:grid-cols-2">
                  <form.Field name="docsRepoOwner">
                    {(field) => (
                      <div className="grid gap-2.5">
                        <label
                          className="text-sm font-medium text-[var(--foreground)]"
                          htmlFor={field.name}
                        >
                          Docs repo owner
                        </label>
                        <Input
                          id={field.name}
                          onBlur={field.handleBlur}
                          onChange={(event) => field.handleChange(event.target.value)}
                          placeholder={defaultRepoOwner || "my-org"}
                          value={field.state.value}
                        />
                      </div>
                    )}
                  </form.Field>

                  <form.Field
                    name="docsRepoDefaultBranch"
                    validators={{
                      onChange: ({ value }) =>
                        value.trim().length > 0 ? undefined : "기본 브랜치를 입력하세요.",
                    }}
                  >
                    {(field) => (
                      <div className="grid gap-2.5">
                        <label
                          className="text-sm font-medium text-[var(--foreground)]"
                          htmlFor={field.name}
                        >
                          Default branch
                        </label>
                        <Input
                          id={field.name}
                          onBlur={field.handleBlur}
                          onChange={(event) => field.handleChange(event.target.value)}
                          placeholder="main"
                          value={field.state.value}
                        />
                        {field.state.meta.isTouched && getFieldError(field.state.meta.errors) ? (
                          <p className="text-xs text-[var(--destructive)]">
                            {getFieldError(field.state.meta.errors)}
                          </p>
                        ) : null}
                      </div>
                    )}
                  </form.Field>

                  <form.Field name="docsRepoName">
                    {(field) => (
                      <div className="grid gap-2.5 sm:col-span-2">
                        <label
                          className="text-sm font-medium text-[var(--foreground)]"
                          htmlFor={field.name}
                        >
                          Docs repo name
                        </label>
                        <Input
                          id={field.name}
                          onBlur={field.handleBlur}
                          onChange={(event) => field.handleChange(event.target.value)}
                          placeholder="harness-docs-docs"
                          value={field.state.value}
                        />
                        <form.Subscribe
                          selector={(state) => ({
                            explicitRepositoryBinding: hasExplicitRepositoryBinding(state.values),
                            normalizedRepoName: getNormalizedRepoName(state.values),
                            effectiveRepoOwner: getEffectiveRepoOwner(
                              state.values,
                              defaultRepoOwner,
                            ),
                          })}
                        >
                          {({
                            explicitRepositoryBinding,
                            normalizedRepoName,
                            effectiveRepoOwner,
                          }) => (
                            <div className="grid gap-2 text-xs text-[var(--muted-foreground)]">
                              <HintPanel>
                                저장 값:{" "}
                                <span className="font-medium text-[var(--foreground)]">
                                  {normalizedRepoName || "-"}
                                </span>
                              </HintPanel>
                              {!explicitRepositoryBinding ? (
                                <HintPanel>
                                  비워두면 API 기본값이 적용됩니다:{" "}
                                  <span className="font-medium text-[var(--foreground)]">
                                    {effectiveRepoOwner || defaultRepoOwner || "viewer-login"}/
                                    {normalizedRepoName || "workspace-docs"}
                                  </span>
                                </HintPanel>
                              ) : null}
                            </div>
                          )}
                        </form.Subscribe>
                      </div>
                    )}
                  </form.Field>
                </InsetPanel>

                <InsetPanel padding="md">
                  <div className="grid gap-2 sm:grid-cols-2">
                    <form.Subscribe
                      selector={(state) =>
                        canSubmitWorkspaceCreateForm(state.values, defaultRepoOwner)
                      }
                    >
                      {(canSubmit) => (
                        <PrimaryPageAction
                          clientLog="워크스페이스 만들기"
                          disabled={!canSubmit || isSubmitting}
                          type="submit"
                        >
                          {isSubmitting ? (
                            <LoaderCircle className="animate-spin" />
                          ) : (
                            <ArrowRight />
                          )}
                          워크스페이스 만들기
                        </PrimaryPageAction>
                      )}
                    </form.Subscribe>
                    <SecondaryPageAction
                      clientLog="워크스페이스 생성 취소"
                      onClick={onCancel}
                      type="button"
                    >
                      돌아가기
                    </SecondaryPageAction>
                  </div>
                </InsetPanel>
              </form>
            </PanelCardContent>
          </PanelCard>
        }
      />
    </main>
  );
}
