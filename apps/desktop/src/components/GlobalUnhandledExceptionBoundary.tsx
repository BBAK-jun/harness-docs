import { Component, type ErrorInfo, type ReactNode } from "react";
import { showErrorToast, toErrorMessage } from "../lib/errorToast";

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
    showErrorToast({
      title: "예기치 않은 오류가 발생했습니다.",
      description: toErrorMessage(error),
    });
    this.scheduleReset();
  }

  private handleWindowError = (event: ErrorEvent) => {
    showErrorToast({
      title: "예기치 않은 오류가 발생했습니다.",
      description: event.error ? toErrorMessage(event.error) : event.message,
    });
  };

  private handleUnhandledRejection = (event: PromiseRejectionEvent) => {
    showErrorToast({
      title: "예기치 않은 오류가 발생했습니다.",
      description: toErrorMessage(event.reason),
    });
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
