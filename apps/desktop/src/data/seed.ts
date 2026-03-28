export type DocStatus = "draft" | "review" | "approved" | "published" | "stale";
export type DocType = "prd" | "ux" | "spec" | "policy";

export interface TeamMember {
  id: string;
  name: string;
  role: "pm" | "designer" | "developer" | "lead";
  avatar: string;
}

export const team: TeamMember[] = [
  { id: "u1", name: "Sarah Chen", role: "pm", avatar: "SC" },
  { id: "u2", name: "Marcus Rivera", role: "designer", avatar: "MR" },
  { id: "u3", name: "Aisha Patel", role: "developer", avatar: "AP" },
  { id: "u4", name: "James Okafor", role: "lead", avatar: "JO" },
];

export const docTypeLabels: Record<DocType, string> = {
  prd: "PRD",
  ux: "UX Flow",
  spec: "Technical Spec",
  policy: "Policy / Decision",
};

export const statusLabels: Record<DocStatus, string> = {
  draft: "Draft",
  review: "In Review",
  approved: "Approved",
  published: "Published",
  stale: "Stale",
};
