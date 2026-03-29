import * as React from "react";
import { cn } from "@/lib/utils";
import { elevatedPanelClassName, insetPanelClassName } from "@/components/panelStyles";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";

type PanelPadding = "none" | "md" | "lg";
type NoticeTone = "default" | "success" | "warning" | "danger";

function paddingClassName(padding: PanelPadding) {
  switch (padding) {
    case "none":
      return "";
    case "md":
      return "p-5";
    case "lg":
      return "p-6 sm:p-8";
  }
}

export function ElevatedPanel({
  as: Component = "section",
  children,
  className,
  overflowHidden = false,
  padding = "md",
}: {
  as?: React.ElementType;
  children: React.ReactNode;
  className?: string;
  overflowHidden?: boolean;
  padding?: PanelPadding;
}) {
  return (
    <Component
      className={cn(
        elevatedPanelClassName,
        overflowHidden && "overflow-hidden",
        paddingClassName(padding),
        className,
      )}
    >
      {children}
    </Component>
  );
}

export function InsetPanel({
  as: Component = "div",
  children,
  className,
  padding = "md",
}: {
  as?: React.ElementType;
  children: React.ReactNode;
  className?: string;
  padding?: PanelPadding;
}) {
  return (
    <Component className={cn(insetPanelClassName, paddingClassName(padding), className)}>
      {children}
    </Component>
  );
}

export function HintPanel({
  as: Component = "div",
  children,
  className,
}: {
  as?: React.ElementType;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Component
      className={cn(
        "rounded-[var(--radius)] border border-dashed border-[var(--border)] bg-[rgba(255,255,255,0.55)] px-3 py-2 text-xs text-[var(--muted-foreground)]",
        className,
      )}
    >
      {children}
    </Component>
  );
}

export function PanelCard({ children, className }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <Card className={cn(elevatedPanelClassName, "overflow-hidden", className)}>{children}</Card>
  );
}

export function PanelCardHeader({ className, ...props }: React.ComponentProps<typeof CardHeader>) {
  return (
    <CardHeader className={cn("border-b border-[var(--border)] px-5 py-4", className)} {...props} />
  );
}

export function PanelCardContent({
  className,
  ...props
}: React.ComponentProps<typeof CardContent>) {
  return <CardContent className={cn("p-5", className)} {...props} />;
}

export function PanelCardFooter({ className, ...props }: React.ComponentProps<typeof CardFooter>) {
  return <CardFooter className={cn("p-5", className)} {...props} />;
}

export function SignalPanel({
  label,
  value,
  description,
  icon,
  badge,
}: {
  label: string;
  value: React.ReactNode;
  description?: React.ReactNode;
  icon?: React.ReactNode;
  badge?: React.ReactNode;
}) {
  return (
    <ElevatedPanel padding="md">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
          {label}
        </p>
        {icon}
      </div>
      <div className="mt-4">
        {typeof value === "number" || typeof value === "string" ? (
          <p className="text-3xl font-semibold tracking-tight text-[var(--foreground)]">{value}</p>
        ) : (
          value
        )}
      </div>
      {description ? (
        <p className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">{description}</p>
      ) : null}
      {badge ? <div className="mt-3">{badge}</div> : null}
    </ElevatedPanel>
  );
}

export function PanelEmptyState({
  title,
  description,
  actions,
  className,
}: {
  title: string;
  description: string;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("px-5 py-6", className)}>
      <p className="font-medium text-[var(--foreground)]">{title}</p>
      <p className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">{description}</p>
      {actions ? <div className="mt-4 flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}

function noticeToneClassName(tone: NoticeTone) {
  switch (tone) {
    case "success":
      return "border-[var(--success-foreground)]/20 bg-[var(--success-soft)]/40";
    case "warning":
      return "border-[var(--warning-foreground)]/20 bg-[var(--warning-soft)]/40";
    case "danger":
      return "border-[var(--destructive)]/20 bg-[color:color-mix(in_srgb,var(--destructive)_8%,transparent)]";
    default:
      return "border-[var(--border)] bg-[rgba(255,255,255,0.62)]";
  }
}

export function NoticePanel({
  title,
  description,
  tone = "default",
  badge,
  className,
}: {
  title: string;
  description: string;
  tone?: NoticeTone;
  badge?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-[calc(var(--radius)+0.25rem)] border px-5 py-4",
        noticeToneClassName(tone),
        className,
      )}
    >
      <div className="flex flex-wrap items-center gap-2">
        <p className="font-medium text-[var(--foreground)]">{title}</p>
        {badge ? (
          <Badge
            variant={
              tone === "success"
                ? "success"
                : tone === "warning"
                  ? "warning"
                  : tone === "danger"
                    ? "destructive"
                    : "outline"
            }
          >
            {badge}
          </Badge>
        ) : null}
      </div>
      <p className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">{description}</p>
    </div>
  );
}
