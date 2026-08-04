import { DIAGNOSTIC_CATALOG, MISSING_LABEL_JA } from "./catalog";
import type { DiagnosticView } from "./types";

function warnMissing(key: string): void {
  if (typeof process !== "undefined" && process.env?.NODE_ENV !== "production") {
    // eslint-disable-next-line no-console
    console.warn(`[apollo/i18n] missing diagnostic key: ${key}`);
  }
}

export function getDiagnosticMessage(
  code: string,
  _params?: Record<string, unknown>,
): DiagnosticView {
  const entry = DIAGNOSTIC_CATALOG[code];
  if (!entry) {
    warnMissing(code);
    return {
      l1: MISSING_LABEL_JA,
      technical: { code },
    };
  }
  return {
    l1: entry.l1,
    l2: entry.l2,
    nextAction: entry.nextAction,
    technical: { code: entry.code },
  };
}
