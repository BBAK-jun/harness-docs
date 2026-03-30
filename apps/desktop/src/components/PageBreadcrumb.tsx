import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { cn } from "@/lib/utils";

type PageBreadcrumbVariant = "header" | "section";

function listClassName(variant: PageBreadcrumbVariant) {
  switch (variant) {
    case "header":
      return "text-[11px] font-medium uppercase tracking-[0.14em] text-[var(--muted-foreground)]";
    case "section":
      return "text-xs font-medium uppercase tracking-[0.16em] text-[var(--muted-foreground)]";
  }
}

function itemClassName(variant: PageBreadcrumbVariant) {
  switch (variant) {
    case "header":
      return "text-[11px] font-medium uppercase tracking-[0.14em] text-[var(--muted-foreground)]";
    case "section":
      return "text-xs font-medium uppercase tracking-[0.16em] text-[var(--muted-foreground)]";
  }
}

export function PageBreadcrumb({
  items,
  className,
  variant = "section",
}: {
  items: string[];
  className?: string;
  variant?: PageBreadcrumbVariant;
}) {
  if (items.length === 0) {
    return null;
  }

  return (
    <Breadcrumb className={className}>
      <BreadcrumbList className={listClassName(variant)}>
        {items.map((item, index) => (
          <BreadcrumbItem key={`${item}-${index}`}>
            <BreadcrumbPage className={cn(itemClassName(variant))}>{item}</BreadcrumbPage>
            {index < items.length - 1 ? <BreadcrumbSeparator /> : null}
          </BreadcrumbItem>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
