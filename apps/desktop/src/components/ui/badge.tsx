import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.18em]",
  {
    variants: {
      variant: {
        default: "border-transparent bg-[var(--accent)] text-[var(--accent-foreground)]",
        secondary:
          "border-[var(--border)] bg-[var(--secondary)] text-[var(--secondary-foreground)]",
        outline: "border-[var(--border)] bg-transparent text-[var(--muted-foreground)]",
        success: "border-transparent bg-[var(--success-soft)] text-[var(--success-foreground)]",
        warning: "border-transparent bg-[var(--warning-soft)] text-[var(--warning-foreground)]",
        info: "border-transparent bg-[var(--info-soft)] text-[var(--info-foreground)]",
        destructive:
          "border-transparent bg-[color:color-mix(in_srgb,var(--destructive)_16%,transparent)] text-[var(--destructive)]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
