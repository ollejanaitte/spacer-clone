import { MISSING_LABEL_JA } from "./catalog";

/**
 * L3-only technical labels. May return English tokens intentionally.
 * Never use as L1 primary copy.
 */
export function getTechnicalLabel(key: string): string {
  if (!key) return MISSING_LABEL_JA;
  return key;
}

export function formatTechnicalPair(name: string, value: string): string {
  return `${name}=${value}`;
}
