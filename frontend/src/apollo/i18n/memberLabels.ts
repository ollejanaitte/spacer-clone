import { MEMBER_CATALOG, MISSING_LABEL_JA } from "./catalog";
import type { MemberTypeId } from "./types";

function warnMissing(key: string): void {
  if (typeof process !== "undefined" && process.env?.NODE_ENV !== "production") {
    // eslint-disable-next-line no-console
    console.warn(`[apollo/i18n] missing member key: ${key}`);
  }
}

export function getMemberLabel(memberType: MemberTypeId | string): string {
  const entry = MEMBER_CATALOG[memberType];
  if (!entry) {
    warnMissing(memberType);
    return MISSING_LABEL_JA;
  }
  return entry.primaryJa;
}

export function getMemberShortLabel(memberType: MemberTypeId | string): string {
  const entry = MEMBER_CATALOG[memberType];
  if (!entry) {
    warnMissing(memberType);
    return MISSING_LABEL_JA;
  }
  return entry.shortJa || entry.primaryJa;
}
