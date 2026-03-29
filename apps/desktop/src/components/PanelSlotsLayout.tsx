import { cn } from "@/lib/utils";
import { type GridColumnCount, getSplitGridClassName } from "../pages/layoutGrid";

export function PanelSlotsLayout({
  bodyClassName,
  bodyColumns = 2,
  bottomPanel,
  children,
  leftPanel,
  rightPanel,
  topPanel,
}: {
  bodyClassName?: string;
  bodyColumns?: GridColumnCount;
  bottomPanel?: React.ReactNode;
  children?: React.ReactNode;
  leftPanel?: React.ReactNode;
  rightPanel?: React.ReactNode;
  topPanel?: React.ReactNode;
}) {
  const hasBodyPanels = Boolean(leftPanel || rightPanel);

  return (
    <div className="flex flex-col gap-6">
      {topPanel}

      {hasBodyPanels ? (
        <div className={cn(getSplitGridClassName(bodyColumns), bodyClassName)}>
          {leftPanel}
          {children}
          {rightPanel}
        </div>
      ) : (
        children
      )}

      {bottomPanel}
    </div>
  );
}
