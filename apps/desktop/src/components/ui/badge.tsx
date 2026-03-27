import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.18em]",
  {
    variants: {
      variant: {
        default: "border-amber-200/20 bg-amber-200/15 text-amber-100",
        secondary: "border-white/10 bg-white/[0.08] text-slate-200",
        outline: "border-white/[0.12] bg-transparent text-slate-300",
        success: "border-emerald-400/20 bg-emerald-400/15 text-emerald-200",
        warning: "border-orange-400/20 bg-orange-400/15 text-orange-200",
        info: "border-sky-400/20 bg-sky-400/15 text-sky-200",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
