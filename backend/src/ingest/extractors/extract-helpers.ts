// Pure, I/O-free utilities shared by the ingest extractors. Greppable keys +
// deterministic name-variant collapsing. Easy to unit-test.

/** kebab-case id from a name: "Lauren Kinsella" -> "lauren-kinsella". */
export function slug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Stable, dedup-friendly `<type>:<slug>` key (not cryptographic). */
export function entityHash(prefix: string, name: string): string {
  return `${prefix}:${slug(name)}`;
}

/**
 * Order-insensitive name key for variant matching: lowercased, punctuation
 * dropped, tokens sorted — so "Sarah Chen", "Chen, Sarah" and "sarah  chen"
 * all collapse to the same key.
 */
export function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .sort()
    .join(" ");
}

/**
 * Merge items that refer to the same real-world entity under name variants.
 * Groups by normalizeName(getName(item)); collisions fold through `merge`.
 */
export function dedupeByNameVariant<T>(
  items: T[],
  getName: (x: T) => string,
  merge: (a: T, b: T) => T,
): T[] {
  const byKey = new Map<string, T>();
  for (const item of items) {
    const key = normalizeName(getName(item)) || getName(item).toLowerCase();
    const existing = byKey.get(key);
    byKey.set(key, existing ? merge(existing, item) : item);
  }
  return [...byKey.values()];
}
