import { AUTHORIZATION_CATALOG, MISSING_LABEL_JA } from "./catalog";
import type { AuthorizationMessageId, AuthorizationView } from "./types";

function warnMissing(key: string): void {
  if (typeof process !== "undefined" && process.env?.NODE_ENV !== "production") {
    // eslint-disable-next-line no-console
    console.warn(`[apollo/i18n] missing authorization key: ${key}`);
  }
}

export function getAuthorizationMessage(key: AuthorizationMessageId | string): AuthorizationView {
  const entry = AUTHORIZATION_CATALOG[key];
  if (!entry) {
    warnMissing(key);
    return {
      l1: MISSING_LABEL_JA,
      technical: { enum: key },
    };
  }
  return {
    l1: entry.l1,
    l2: entry.l2,
    technical: { enum: entry.l3 },
  };
}

/** Combined L1 banner line used on major panels. */
export function getAuthorizationBannerLines(
  keys: readonly (AuthorizationMessageId | string)[],
): { l1Lines: string[]; l2Lines: string[]; technicalLines: string[] } {
  const l1Lines: string[] = [];
  const l2Lines: string[] = [];
  const technicalLines: string[] = [];
  for (const key of keys) {
    const msg = getAuthorizationMessage(key);
    l1Lines.push(msg.l1);
    if (msg.l2) l2Lines.push(msg.l2);
    if (msg.technical?.enum) technicalLines.push(msg.technical.enum);
  }
  return { l1Lines, l2Lines, technicalLines };
}
