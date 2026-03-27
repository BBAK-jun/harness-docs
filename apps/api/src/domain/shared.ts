export function nowIso() {
  return new Date().toISOString();
}

export function toDate(value: string) {
  return new Date(value);
}

export function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}

export function buildId(prefix: string) {
  return `${prefix}_${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}`;
}

export function dedupeStrings(values: Array<string | null | undefined>) {
  return Array.from(
    new Set(
      values.filter((value): value is string => typeof value === "string" && value.length > 0),
    ),
  );
}

export function dedupeByKey<T>(items: T[], getKey: (item: T) => string) {
  return Array.from(new Map(items.map((item) => [getKey(item), item])).values());
}

export function isDefined<T>(value: T | null | undefined): value is T {
  return value != null;
}
