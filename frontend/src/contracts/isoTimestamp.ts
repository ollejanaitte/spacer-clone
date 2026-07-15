const ISO_8601_UTC_PATTERN =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,3})?Z$/;

export function isIso8601UtcTimestamp(value: string): boolean {
  if (!ISO_8601_UTC_PATTERN.test(value)) {
    return false;
  }

  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) {
    return false;
  }

  return new Date(parsed).toISOString() === value;
}
