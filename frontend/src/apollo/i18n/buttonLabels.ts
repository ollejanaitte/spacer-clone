import { BUTTON_CATALOG, MISSING_LABEL_JA } from "./catalog";
import type { ButtonActionId } from "./types";

function warnMissing(key: string): void {
  if (typeof process !== "undefined" && process.env?.NODE_ENV !== "production") {
    // eslint-disable-next-line no-console
    console.warn(`[apollo/i18n] missing button key: ${key}`);
  }
}

export function getButtonLabel(action: ButtonActionId | string): string {
  const entry = BUTTON_CATALOG[action];
  if (!entry) {
    warnMissing(action);
    return MISSING_LABEL_JA;
  }
  return entry.labelJa;
}

export function getButtonShortLabel(action: ButtonActionId | string): string {
  const entry = BUTTON_CATALOG[action];
  if (!entry) {
    warnMissing(action);
    return MISSING_LABEL_JA;
  }
  return entry.shortJa || entry.labelJa;
}
