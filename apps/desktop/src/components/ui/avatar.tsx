import * as React from "react";
import { cn } from "@/lib/utils";

const Avatar = React.forwardRef<HTMLSpanElement, React.HTMLAttributes<HTMLSpanElement>>(
  ({ className, ...props }, ref) => (
    <span
      ref={ref}
      className={cn(
        "relative inline-flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-[var(--border)] bg-[linear-gradient(135deg,var(--primary)_0%,#f59e0b_48%,#38bdf8_100%)] text-sm font-semibold text-[var(--primary-foreground)] shadow-[0_18px_40px_-20px_rgba(180,83,9,0.42)]",
        className,
      )}
      {...props}
    />
  ),
);
Avatar.displayName = "Avatar";

const AvatarImage = React.forwardRef<HTMLImageElement, React.ImgHTMLAttributes<HTMLImageElement>>(
  ({ className, alt = "", ...props }, ref) => (
    <img
      alt={alt}
      className={cn("absolute inset-0 size-full object-cover", className)}
      ref={ref}
      {...props}
    />
  ),
);
AvatarImage.displayName = "AvatarImage";

const AvatarFallback = React.forwardRef<HTMLSpanElement, React.HTMLAttributes<HTMLSpanElement>>(
  ({ className, ...props }, ref) => (
    <span
      ref={ref}
      className={cn("relative z-[1] inline-flex items-center justify-center", className)}
      {...props}
    />
  ),
);
AvatarFallback.displayName = "AvatarFallback";

export { Avatar, AvatarFallback, AvatarImage };
