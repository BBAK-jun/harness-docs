import { cn } from "@/lib/utils";
import type { DocStatus, DocType } from "@/data/seed";
import { statusLabels, docTypeLabels } from "@/data/seed";

const statusStyles: Record<DocStatus, string> = {
  draft: "bg-status-draft/10 text-status-draft border-status-draft/20",
  review: "bg-status-review/10 text-status-review border-status-review/20",
  approved: "bg-status-approved/10 text-status-approved border-status-approved/20",
  published: "bg-status-published/10 text-status-published border-status-published/20",
  stale: "bg-status-stale/10 text-status-stale border-status-stale/20",
};

const typeStyles: Record<DocType, string> = {
  prd: "bg-doctype-prd/10 text-doctype-prd border-doctype-prd/20",
  ux: "bg-doctype-ux/10 text-doctype-ux border-doctype-ux/20",
  spec: "bg-doctype-spec/10 text-doctype-spec border-doctype-spec/20",
  policy: "bg-doctype-policy/10 text-doctype-policy border-doctype-policy/20",
};

export function StatusBadge({ status, className }: { status: DocStatus; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 text-xs font-medium border rounded-sm",
        statusStyles[status],
        className,
      )}
    >
      {statusLabels[status]}
    </span>
  );
}

export function TypeBadge({ type, className }: { type: DocType; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 text-xs font-medium border rounded-sm",
        typeStyles[type],
        className,
      )}
    >
      {docTypeLabels[type]}
    </span>
  );
}

export function StaleBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium border rounded-sm bg-status-stale/10 text-status-stale border-status-stale/20",
        className,
      )}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-status-stale animate-pulse" />
      Stale
    </span>
  );
}
