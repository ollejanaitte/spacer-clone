const DUPLICATE_SUFFIX = "-copy";

function normalizeExistingName(name: string): string {
  return name.trim();
}

/**
 * Deterministic duplicate naming:
 * `source-copy`, `source-copy-2`, `source-copy-3`, ...
 */
export function buildDuplicateProjectName(
  sourceName: string,
  existingNames: readonly string[],
): string {
  const base = normalizeExistingName(sourceName);
  const taken = new Set(existingNames.map((entry) => normalizeExistingName(entry)));
  const firstCandidate = `${base}${DUPLICATE_SUFFIX}`;
  if (!taken.has(firstCandidate)) {
    return firstCandidate;
  }
  let index = 2;
  while (taken.has(`${base}${DUPLICATE_SUFFIX}-${index}`)) {
    index += 1;
  }
  return `${base}${DUPLICATE_SUFFIX}-${index}`;
}
