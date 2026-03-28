import { cn } from "@/lib/utils";
import { team } from "@/data/seed";

const roleColors: Record<string, string> = {
  pm: "bg-doctype-prd text-primary-foreground",
  designer: "bg-doctype-ux text-primary-foreground",
  developer: "bg-doctype-spec text-primary-foreground",
  lead: "bg-status-approved text-primary-foreground",
};

export function UserAvatar({ userId, size = "sm" }: { userId: string; size?: "sm" | "md" }) {
  const user = team.find(u => u.id === userId);
  if (!user) return null;

  const sizeClass = size === "sm" ? "w-6 h-6 text-[10px]" : "w-8 h-8 text-xs";

  return (
    <div
      className={cn("rounded-full flex items-center justify-center font-medium shrink-0", sizeClass, roleColors[user.role])}
      title={`${user.name} (${user.role})`}
    >
      {user.avatar}
    </div>
  );
}
