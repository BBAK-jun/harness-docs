import { Toaster as Sonner, type ToasterProps } from "sonner";

export function Toaster(props: ToasterProps) {
  return (
    <Sonner
      closeButton
      position="top-right"
      richColors
      toastOptions={{
        style: {
          background: "var(--surface-strong)",
          border: "1px solid var(--border)",
          color: "var(--foreground)",
        },
      }}
      {...props}
    />
  );
}
