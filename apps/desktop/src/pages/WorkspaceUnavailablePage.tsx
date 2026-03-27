import { Button } from "@/components/ui/button";
import { Card, CardFooter, CardHeader, CardDescription, CardTitle } from "@/components/ui/card";
import type { AppPageProps } from "./pageUtils";

export function WorkspaceUnavailablePage({ app }: AppPageProps) {
  return (
    <main className="app-frame flex min-h-screen items-center justify-center p-6">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle>No active workspace</CardTitle>
          <CardDescription>
            The session is authenticated, but no valid workspace membership is active.
          </CardDescription>
        </CardHeader>
        <CardFooter>
          <Button variant="outline" onClick={() => void app.handleSignOut()}>
            Sign out
          </Button>
        </CardFooter>
      </Card>
    </main>
  );
}
