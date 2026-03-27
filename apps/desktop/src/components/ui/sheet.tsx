import * as React from "react";
import { createPortal } from "react-dom";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

interface SheetContextValue {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const SheetContext = React.createContext<SheetContextValue | null>(null);

function useSheetContext() {
  const context = React.useContext(SheetContext);

  if (!context) {
    throw new Error("Sheet components must be used within <Sheet />.");
  }

  return context;
}

interface SheetProps {
  children: React.ReactNode;
  onOpenChange: (open: boolean) => void;
  open: boolean;
}

function Sheet({ children, onOpenChange, open }: SheetProps) {
  return (
    <SheetContext.Provider value={{ onOpenChange, open }}>{children}</SheetContext.Provider>
  );
}

const sheetContentVariants = cva(
  "fixed z-50 flex flex-col gap-4 border border-[var(--border)] bg-[var(--card)] text-[var(--card-foreground)] shadow-[0_24px_90px_-54px_rgba(15,23,42,0.28)] backdrop-blur-2xl transition-transform duration-200",
  {
    variants: {
      side: {
        left: "inset-y-4 left-4 h-[calc(100vh-2rem)] w-[min(26rem,calc(100vw-2rem))] rounded-[calc(var(--radius)+0.75rem)] translate-x-0",
        right:
          "inset-y-4 right-4 h-[calc(100vh-2rem)] w-[min(26rem,calc(100vw-2rem))] rounded-[calc(var(--radius)+0.75rem)] translate-x-0",
      },
    },
    defaultVariants: {
      side: "right",
    },
  },
);

interface SheetContentProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof sheetContentVariants> {}

const SheetContent = React.forwardRef<HTMLDivElement, SheetContentProps>(
  ({ children, className, side, ...props }, ref) => {
    const { onOpenChange, open } = useSheetContext();

    if (!open || typeof document === "undefined") {
      return null;
    }

    return createPortal(
      <>
        <button
          aria-label="Close sheet"
          className="fixed inset-0 z-40 border-0 bg-[var(--overlay)]"
          onClick={() => onOpenChange(false)}
          type="button"
        />
        <div
          aria-modal="true"
          className={cn(sheetContentVariants({ className, side }))}
          ref={ref}
          role="dialog"
          {...props}
        >
          {children}
        </div>
      </>,
      document.body,
    );
  },
);
SheetContent.displayName = "SheetContent";

const SheetHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("grid gap-1.5 px-5 pt-5", className)} {...props} />
  ),
);
SheetHeader.displayName = "SheetHeader";

const SheetTitle = React.forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h2
      ref={ref}
      className={cn("text-lg font-semibold tracking-tight text-[var(--popover-foreground)]", className)}
      {...props}
    />
  ),
);
SheetTitle.displayName = "SheetTitle";

const SheetDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-sm leading-6 text-[var(--muted-foreground)]", className)}
    {...props}
  />
));
SheetDescription.displayName = "SheetDescription";

const SheetBody = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("min-h-0 flex-1 px-5 pb-5", className)} {...props} />
  ),
);
SheetBody.displayName = "SheetBody";

export { Sheet, SheetBody, SheetContent, SheetDescription, SheetHeader, SheetTitle };
