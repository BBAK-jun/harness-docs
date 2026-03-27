import { createFileRoute } from "@tanstack/react-router";
import App from "../App";

export const Route = createFileRoute("/")({
  component: IndexRoute
});

function IndexRoute() {
  return (
    <App
      routeState={{
        activeArea: "documents",
        activeWorkspaceId: null,
        selectedDocumentId: null
      }}
    />
  );
}
