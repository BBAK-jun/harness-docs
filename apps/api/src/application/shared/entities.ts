export function hasEntityWithId(items: unknown[] | null, id: string) {
  if (!Array.isArray(items)) {
    return false;
  }

  return items.some(
    (item) =>
      typeof item === "object" &&
      item !== null &&
      "id" in item &&
      (item as { id?: unknown }).id === id,
  );
}
