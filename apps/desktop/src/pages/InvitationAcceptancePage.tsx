import { useForm } from "@tanstack/react-form";
import { AlertCircle, ArrowRight, LoaderCircle, Link2 } from "lucide-react";
import type { WorkspaceInvitationAcceptRequestDto } from "@harness-docs/contracts";
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
import { PanelSlotsLayout } from "@/components/PanelSlotsLayout";
import { type GridColumnCount } from "./layoutGrid";

type InvitationAcceptanceFormValues = {
  invitationCode: string;
};

function getFieldError(errors: unknown[]) {
  const firstError = errors[0];

  return typeof firstError === "string" ? firstError : null;
}

export function InvitationAcceptancePage({
  defaultInvitationCode = "",
  errorMessage,
  isSubmitting,
  onAccept,
  onCancel,
  onOpenWorkspaceCreate,
  layoutColumns = 2,
  withinShell = false,
}: {
  defaultInvitationCode?: string;
  errorMessage: string | null;
  isSubmitting: boolean;
  onAccept: (input: WorkspaceInvitationAcceptRequestDto) => Promise<void>;
  onCancel: () => void;
  onOpenWorkspaceCreate: () => void;
  layoutColumns?: GridColumnCount;
  withinShell?: boolean;
}) {
  const { logEvent } = useClientActivityLog();
  const form = useForm({
    defaultValues: {
      invitationCode: defaultInvitationCode,
    } satisfies InvitationAcceptanceFormValues,
    onSubmit: async ({ value }) => {
      const invitationCode = value.invitationCode.trim();

      if (!invitationCode) {
        return;
      }

      logEvent({
        action: "워크스페이스 초대 수락 제출",
        description: invitationCode,
        source: "workspace-invitation-acceptance",
      });

      await onAccept({ invitationCode });
    },
  });

  return (
    <main className={withinShell ? "flex flex-col gap-6" : "app-frame min-h-screen p-6"}>
      <PanelSlotsLayout
        bodyColumns={layoutColumns}
        leftPanel={
          <ElevatedPanel>
            <Badge className="w-fit" variant="info">
              초대 수락
            </Badge>
            <h1 className="mt-4 text-4xl font-semibold tracking-tight text-[var(--foreground)]">
              워크스페이스 초대 수락
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-8 text-[var(--muted-foreground)]">
              팀 리드가 전달한 초대 코드를 입력하면 현재 로그인 계정에 active membership을
              연결합니다. 수락이 완료되면 bootstrap이 갱신되고 바로 워크스페이스로 이동합니다.
            </p>

            <div className="mt-8 grid gap-3">
              {[
                "초대 수락은 GitHub collaborator 권한이 아니라 앱 내부 membership을 생성하거나 복구합니다.",
                "초대 코드는 만료되거나 이미 사용되면 더 이상 수락할 수 없습니다.",
                "이미 같은 사용자 membership이 있으면 active 상태로 되돌리고 마지막 접근 시각을 갱신합니다.",
                "수락 직후 워크스페이스 목록과 graph를 다시 로드합니다.",
              ].map((item) => (
                <InsetPanel key={item}>{item}</InsetPanel>
              ))}
            </div>
          </ElevatedPanel>
        }
        rightPanel={
          <PanelCard>
            <PanelCardHeader>
              <CardTitle>수락 정보</CardTitle>
              <CardDescription className="text-base">
                팀이 전달한 초대 코드나 초대 링크의 코드를 기준으로 membership을 연결합니다.
              </CardDescription>
            </PanelCardHeader>
            <PanelCardContent className="grid gap-6 pt-6 sm:pt-7">
              {errorMessage ? (
                <Alert variant="destructive">
                  <AlertCircle className="size-4" />
                  <AlertTitle>초대 수락 실패</AlertTitle>
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
                  name="invitationCode"
                  validators={{
                    onChange: ({ value }) =>
                      value.trim().length > 0 ? undefined : "초대 코드를 입력하세요.",
                  }}
                >
                  {(field) => (
                    <div className="grid gap-2.5">
                      <label
                        className="text-sm font-medium text-[var(--foreground)]"
                        htmlFor={field.name}
                      >
                        초대 코드
                      </label>
                      <Input
                        id={field.name}
                        onBlur={field.handleBlur}
                        onChange={(event) => field.handleChange(event.target.value)}
                        placeholder="invite-harness-docs"
                        value={field.state.value}
                      />
                      {defaultInvitationCode ? (
                        <HintPanel>
                          <span className="inline-flex items-center gap-2">
                            <Link2 className="size-4" />
                            링크나 URL에서 초대 코드를 미리 채웠습니다.
                          </span>
                        </HintPanel>
                      ) : null}
                      {field.state.meta.isTouched && getFieldError(field.state.meta.errors) ? (
                        <p className="text-xs text-[var(--destructive)]">
                          {getFieldError(field.state.meta.errors)}
                        </p>
                      ) : null}
                    </div>
                  )}
                </form.Field>

                <div className="flex flex-col gap-3 sm:flex-row">
                  <form.Subscribe
                    selector={(state) => ({
                      canSubmit: state.canSubmit,
                      isSubmitting: state.isSubmitting,
                    })}
                  >
                    {({ canSubmit, isSubmitting: isFormSubmitting }) => (
                      <PrimaryPageAction
                        className="sm:flex-1"
                        disabled={!canSubmit || isSubmitting || isFormSubmitting}
                        type="submit"
                      >
                        {isSubmitting || isFormSubmitting ? (
                          <>
                            <LoaderCircle className="animate-spin" />
                            초대 수락 중
                          </>
                        ) : (
                          <>
                            초대 수락
                            <ArrowRight />
                          </>
                        )}
                      </PrimaryPageAction>
                    )}
                  </form.Subscribe>
                  <SecondaryPageAction
                    className="sm:flex-1"
                    disabled={isSubmitting}
                    onClick={onOpenWorkspaceCreate}
                    type="button"
                  >
                    워크스페이스 만들기
                  </SecondaryPageAction>
                  <SecondaryPageAction
                    className="sm:flex-1"
                    disabled={isSubmitting}
                    onClick={onCancel}
                    type="button"
                  >
                    목록으로 돌아가기
                  </SecondaryPageAction>
                </div>
              </form>
            </PanelCardContent>
          </PanelCard>
        }
      />
    </main>
  );
}
