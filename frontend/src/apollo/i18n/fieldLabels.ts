import { FIELD_CATALOG, MISSING_LABEL_JA, PRESENCE_CATALOG, VIEWER_CATALOG } from "./catalog";

function warnMissing(kind: string, key: string): void {
  if (typeof process !== "undefined" && process.env?.NODE_ENV !== "production") {
    // eslint-disable-next-line no-console
    console.warn(`[apollo/i18n] missing ${kind} key: ${key}`);
  }
}

export function getFieldLabel(fieldId: string): string {
  const entry = FIELD_CATALOG[fieldId];
  if (!entry) {
    warnMissing("field", fieldId);
    return MISSING_LABEL_JA;
  }
  return entry.labelJa;
}

export function getPresenceLabel(presence: string): string {
  const entry = PRESENCE_CATALOG[presence];
  if (!entry) {
    warnMissing("presence", presence);
    return MISSING_LABEL_JA;
  }
  return entry.primaryJa;
}

export function getViewerControlLabel(control: string): string {
  const entry = VIEWER_CATALOG[control];
  if (!entry) {
    warnMissing("viewer", control);
    return MISSING_LABEL_JA;
  }
  return entry.primaryJa;
}
