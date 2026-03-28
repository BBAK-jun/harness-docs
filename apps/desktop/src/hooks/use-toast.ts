import * as React from "react";
import type { ToastActionElement, ToastProps } from "@/components/ui/toast";

export type ToasterToast = ToastProps & {
  id: string;
  title?: React.ReactNode;
  description?: React.ReactNode;
  action?: ToastActionElement;
};

type ToastContextValue = {
  toasts: ToasterToast[];
  toast: (toast: Omit<ToasterToast, "id">) => { id: string; dismiss: () => void; update: () => void };
  dismiss: (toastId?: string) => void;
};

const fallbackStore: ToastContextValue = {
  toasts: [],
  toast: () => ({
    id: "noop-toast",
    dismiss: () => {},
    update: () => {},
  }),
  dismiss: () => {},
};

const ToastContext = React.createContext<ToastContextValue>(fallbackStore);

export function useToast() {
  return React.useContext(ToastContext);
}

export const toast = (_input: Omit<ToasterToast, "id">) => ({
  id: "noop-toast",
  dismiss: () => {},
  update: () => {},
});
