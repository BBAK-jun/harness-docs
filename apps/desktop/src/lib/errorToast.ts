import { toast } from "sonner";

export function toErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === "string") {
    return error;
  }

  try {
    return JSON.stringify(error);
  } catch {
    return "알 수 없는 예외가 발생했습니다.";
  }
}

function createToastId(title: string, description: string) {
  return `error:${title}:${description}`;
}

export function showErrorToast({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  toast.error(title, {
    id: createToastId(title, description),
    description,
    duration: 6000,
  });
}
