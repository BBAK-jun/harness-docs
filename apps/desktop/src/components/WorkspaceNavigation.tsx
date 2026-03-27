import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { navigationItems } from "../navigation";
import type { NavigationArea } from "../types";

interface WorkspaceNavigationProps {
  activeArea: NavigationArea;
  onAreaChange: (area: NavigationArea) => void;
}

export function WorkspaceNavigation({ activeArea, onAreaChange }: WorkspaceNavigationProps) {
  return (
    <nav className="mb-5 flex flex-wrap gap-2" aria-label="Primary">
      {navigationItems.map(({ area, icon: Icon, label }) => {
        const isActive = area === activeArea;

        return (
          <Button
            key={area}
            className={cn(
              "rounded-full px-4",
              isActive &&
                "border border-amber-200/20 bg-amber-200/12 text-amber-100 hover:bg-amber-200/16",
            )}
            onClick={() => onAreaChange(area)}
            type="button"
            variant={isActive ? "secondary" : "ghost"}
          >
            <Icon className="size-4" />
            {label}
          </Button>
        );
      })}
    </nav>
  );
}
