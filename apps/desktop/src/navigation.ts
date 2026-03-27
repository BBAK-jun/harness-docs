import type { LucideIcon } from "lucide-react";
import {
  Bot,
  FileText,
  GitPullRequestArrow,
  MessageSquare,
  PenSquare,
  ShieldCheck,
} from "lucide-react";
import type { NavigationArea } from "./types";

export interface NavigationItem {
  area: NavigationArea;
  label: string;
  icon: LucideIcon;
}

export const navigationItems: NavigationItem[] = [
  { area: "documents", label: "Documents", icon: FileText },
  { area: "editor", label: "Editor", icon: PenSquare },
  { area: "comments", label: "Comments", icon: MessageSquare },
  { area: "approvals", label: "Approvals", icon: ShieldCheck },
  { area: "publish", label: "Publish", icon: GitPullRequestArrow },
  { area: "ai", label: "AI Tasks", icon: Bot },
];

const documentWorkspaceAreas: NavigationArea[] = ["editor", "comments", "approvals"];

export function isDocumentWorkspaceArea(area: NavigationArea) {
  return documentWorkspaceAreas.includes(area);
}
