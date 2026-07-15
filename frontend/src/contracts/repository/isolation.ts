/**
 * Deep-copies contract artifacts before persistence or hand-off to callers.
 * Uses structuredClone when available; JSON round-trip is the fallback for older runtimes.
 */
export function cloneArtifact<T>(value: T): T {
  if (typeof structuredClone === "function") {
    return structuredClone(value);
  }

  return JSON.parse(JSON.stringify(value)) as T;
}
