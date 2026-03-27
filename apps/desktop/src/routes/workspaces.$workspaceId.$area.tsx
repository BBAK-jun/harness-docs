import { createFileRoute } from "@tanstack/react-router";
import App from "../App";
import type { NavigationArea } from "../types";

const allowedAreas: NavigationArea[] = [
  "documents",
  "editor",
  "comments",
  "approvals",
  "publish",
  "ai"
];

export const Route = createFileRoute("/workspaces/$workspaceId/$area")({
  validateSearch: (search) => ({
    documentId: typeof search.documentId === "string" ? search.documentId : undefined
  }),
  component: WorkspaceAreaRoute
});

function WorkspaceAreaRoute() {
  const { workspaceId, area } = Route.useParams();
  const search = Route.useSearch();

  return (
    <App
      routeState={{
        activeArea: allowedAreas.includes(area as NavigationArea)
          ? (area as NavigationArea)
          : "documents",
        activeWorkspaceId: workspaceId,
        selectedDocumentId: search.documentId ?? null
      }}
    />
  );
}
