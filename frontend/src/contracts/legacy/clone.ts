/**
 * Deep-copies legacy adapter values so converters cannot mutate caller-owned data.
 */
export function cloneLegacyValue<T>(value: T): T {
  return structuredClone(value);
}
