/**
 * Recursively freezes the object graph passed in (via Object.freeze on each node).
 * Contract parsers invoke this only on freshly mapped outputs before returning them.
 * Do not pass parser inputs through deepFreeze; callers own input immutability.
 */
export function deepFreeze<T>(value: T, seen: WeakSet<object> = new WeakSet()): Readonly<T> {
  if (value === null || typeof value !== "object") {
    return value;
  }

  if (seen.has(value)) {
    return value;
  }
  seen.add(value);

  if (Array.isArray(value)) {
    for (const entry of value) {
      deepFreeze(entry, seen);
    }
    return Object.freeze(value) as Readonly<T>;
  }

  const record = value as Record<string, unknown>;
  for (const key of Object.keys(record)) {
    deepFreeze(record[key], seen);
  }

  return Object.freeze(value) as Readonly<T>;
}
