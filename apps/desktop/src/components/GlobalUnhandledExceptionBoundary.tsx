import { Component, type ErrorInfo, type ReactNode } from "react";
import { toast } from "sonner";

function toErrorMessage(error: unknown) {
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

function showGlobalErrorToast(message: string) {
  toast.error("예기치 않은 오류가 발생했습니다.", {
    description: message,
    duration: 6000,
  });
}

type Props = {
  children: ReactNode;
};

type State = {
  hasError: boolean;
};

export class GlobalUnhandledExceptionBoundary extends Component<Props, State> {
  state: State = {
    hasError: false,
  };

  private resetTimer: ReturnType<typeof window.setTimeout> | null = null;

  componentDidMount() {
    window.addEventListener("error", this.handleWindowError);
    window.addEventListener("unhandledrejection", this.handleUnhandledRejection);
  }

  componentWillUnmount() {
    window.removeEventListener("error", this.handleWindowError);
    window.removeEventListener("unhandledrejection", this.handleUnhandledRejection);

    if (this.resetTimer !== null) {
      window.clearTimeout(this.resetTimer);
    }
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, _errorInfo: ErrorInfo) {
    showGlobalErrorToast(toErrorMessage(error));
    this.scheduleReset();
  }

  private handleWindowError = (event: ErrorEvent) => {
    showGlobalErrorToast(event.error ? toErrorMessage(event.error) : event.message);
  };

  private handleUnhandledRejection = (event: PromiseRejectionEvent) => {
    showGlobalErrorToast(toErrorMessage(event.reason));
  };

  private scheduleReset() {
    if (this.resetTimer !== null) {
      return;
    }

    this.resetTimer = window.setTimeout(() => {
      this.resetTimer = null;
      this.setState({ hasError: false });
    }, 0);
  }

  render() {
    if (this.state.hasError) {
      return null;
    }

    return this.props.children;
  }
}
