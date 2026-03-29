import { useState } from "react";
import { useClientActivityLog } from "@/components/ClientActivityLogProvider";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

type SignOutConfirmOverlayProps = {
  close: (value: boolean) => void;
  isOpen: boolean;
  onConfirm: () => Promise<void>;
  unmount: () => void;
};

export function SignOutConfirmOverlay({
  isOpen,
  close,
  unmount,
  onConfirm,
}: SignOutConfirmOverlayProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { logEvent } = useClientActivityLog();

  const handleCancel = () => {
    if (isSubmitting) {
      return;
    }

    close(false);
    unmount();
  };

  const handleConfirm = async () => {
    if (isSubmitting) {
      return;
    }

    setIsSubmitting(true);

    try {
      await onConfirm();
      close(true);
      unmount();
    } catch (_error) {
      setIsSubmitting(false);
    }
  };

  return (
    <AlertDialog
      onOpenChange={(nextOpen) => (!nextOpen ? handleCancel() : undefined)}
      open={isOpen}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>로그아웃하시겠습니까?</AlertDialogTitle>
          <AlertDialogDescription>
            현재 세션을 종료하고 로그인 페이지로 이동합니다.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <Button
            clientLog={{ action: "로그아웃 취소 CTA 클릭", source: "sign-out-confirm-overlay" }}
            disabled={isSubmitting}
            onClick={handleCancel}
            type="button"
            variant="outline"
          >
            취소
          </Button>
          <Button
            clientLog={{ action: "로그아웃 확인 CTA 클릭", source: "sign-out-confirm-overlay" }}
            disabled={isSubmitting}
            onClick={() => {
              logEvent({ action: "로그아웃 처리 시작", source: "sign-out-confirm-overlay" });
              void handleConfirm();
            }}
            type="button"
          >
            {isSubmitting ? "로그아웃 중..." : "로그아웃"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
