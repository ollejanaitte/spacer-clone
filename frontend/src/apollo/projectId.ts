const APOLLO_PROJECT_ID_PREFIX = "apollo-prj-";

let projectIdCounter = 0;

function nextCounter(): number {
  projectIdCounter += 1;
  return projectIdCounter;
}

/** Returns true when `value` is an ASCII-safe Apollo project id. */
export function isAsciiSafeApolloProjectId(value: string): boolean {
  return /^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(value);
}

/**
 * Centralized Apollo project id generator.
 * IDs are ASCII-safe and never derived from user-visible names.
 */
export function generateApolloProjectId(now = Date.now()): string {
  const suffix = Math.random().toString(36).slice(2, 10);
  return `${APOLLO_PROJECT_ID_PREFIX}${now}-${nextCounter()}-${suffix}`;
}
