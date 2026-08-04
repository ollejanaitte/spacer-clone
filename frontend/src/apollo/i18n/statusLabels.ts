import { MISSING_LABEL_JA, STATUS_CATALOG, STATUS_MESSAGE_CATALOG } from "./catalog";
import type { LayeredMessage } from "./types";

function warnMissing(kind: string, key: string): void {
  if (typeof process !== "undefined" && process.env?.NODE_ENV !== "production") {
    // eslint-disable-next-line no-console
    console.warn(`[apollo/i18n] missing ${kind} key: ${key}`);
  }
}

/** L1 status label. Never returns raw English enum for known keys. */
export function getStatusLabel(status: string): string {
  const entry = STATUS_CATALOG[status];
  if (!entry) {
    warnMissing("status", status);
    return MISSING_LABEL_JA;
  }
  return entry.primaryJa;
}

export function getStatusShortLabel(status: string): string {
  const entry = STATUS_CATALOG[status];
  if (!entry) {
    warnMissing("status", status);
    return MISSING_LABEL_JA;
  }
  return entry.shortJa || entry.primaryJa;
}

export function getStatusMessage(status: string): LayeredMessage {
  const msg = STATUS_MESSAGE_CATALOG[status];
  const entry = STATUS_CATALOG[status];
  if (!msg && !entry) {
    warnMissing("statusMessage", status);
    return {
      l1: MISSING_LABEL_JA,
      technical: { enum: status },
    };
  }
  return {
    l1: msg?.l1 ?? entry!.primaryJa,
    l2: msg?.l2 ?? entry?.descriptionJa,
    nextAction: msg?.nextAction,
    technical: { enum: msg?.l3 ?? entry?.technicalEn ?? status },
  };
}
