import { useLocation, Link } from "react-router-dom";
import {
  LayoutDashboard,
  FileText,
  GitBranch,
  Sparkles,
  CheckCircle2,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { title: "Dashboard", path: "/", icon: LayoutDashboard },
  { title: "Documents", path: "/documents", icon: FileText },
  { title: "Reviews", path: "/reviews", icon: CheckCircle2 },
  { title: "Publish", path: "/publish", icon: GitBranch },
  { title: "AI Assistant", path: "/ai", icon: Sparkles },
];

const bottomItems = [
  { title: "Settings", path: "/settings", icon: Settings },
];

export function AppSidebar() {
  const location = useLocation();

  const isActive = (path: string) =>
    path === "/" ? location.pathname === "/" : location.pathname.startsWith(path);

  return (
    <aside className="w-56 bg-sidebar text-sidebar-foreground flex flex-col shrink-0 h-screen sticky top-0">
      {/* Logo */}
      <div className="h-14 flex items-center px-5 border-b border-sidebar-border">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 bg-sidebar-primary rounded flex items-center justify-center">
            <FileText className="w-4 h-4 text-sidebar-primary-foreground" />
          </div>
          <div>
            <span className="text-sm font-semibold text-sidebar-accent-foreground">Harness</span>
            <span className="text-sm font-semibold text-sidebar-primary"> Docs</span>
          </div>
        </div>
      </div>

      {/* Workspace */}
      <div className="px-3 py-3 border-b border-sidebar-border">
        <div className="px-2 py-1.5 rounded bg-sidebar-accent">
          <p className="text-xs font-medium text-sidebar-accent-foreground">Product Team Alpha</p>
          <p className="text-[10px] text-sidebar-muted">6 documents · 4 members</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-3 space-y-0.5">
        {navItems.map(item => (
          <Link
            key={item.path}
            to={item.path}
            className={cn(
              "flex items-center gap-2.5 px-2.5 py-2 rounded text-sm transition-colors",
              isActive(item.path)
                ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
            )}
          >
            <item.icon className="w-4 h-4 shrink-0" />
            <span>{item.title}</span>
          </Link>
        ))}
      </nav>

      {/* Bottom */}
      <div className="px-3 py-3 border-t border-sidebar-border space-y-0.5">
        {bottomItems.map(item => (
          <Link
            key={item.path}
            to={item.path}
            className={cn(
              "flex items-center gap-2.5 px-2.5 py-2 rounded text-sm transition-colors",
              isActive(item.path)
                ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
            )}
          >
            <item.icon className="w-4 h-4 shrink-0" />
            <span>{item.title}</span>
          </Link>
        ))}

        {/* User */}
        <div className="flex items-center gap-2.5 px-2.5 py-2 mt-2">
          <div className="w-7 h-7 rounded-full bg-sidebar-primary flex items-center justify-center text-xs font-medium text-sidebar-primary-foreground">
            SC
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium text-sidebar-accent-foreground truncate">Sarah Chen</p>
            <p className="text-[10px] text-sidebar-muted">PM</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
