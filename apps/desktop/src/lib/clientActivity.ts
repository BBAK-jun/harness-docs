import type { ClientActivityLogInput } from "@/components/ClientActivityLogProvider";

export type ClientActivityButtonLog =
  | string
  | (ClientActivityLogInput & {
      enabled?: boolean;
    });

export function normalizeClientActivityInput(
  input: ClientActivityButtonLog,
): ClientActivityLogInput | null {
  if (typeof input === "string") {
    return { action: input };
  }

  if (input.enabled === false) {
    return null;
  }

  return {
    action: input.action,
    description: input.description,
    source: input.source,
  };
}
