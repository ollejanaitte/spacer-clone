/**
 * Deep-copies migration values so steps and validators cannot mutate caller-owned data.
 */
export function cloneMigrationValue<T>(value: T): T {
  return structuredClone(value);
}
