import {
  BridgeSystem,
  SupportLayoutRole,
  type BridgeLayoutSpan,
  type BridgeLayoutSupport,
} from "./layoutTypes";
import { resolveBridgeSystem } from "./layoutValidation";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function parseSpanEntry(raw: unknown, index: number): BridgeLayoutSpan | null {
  if (!isRecord(raw)) {
    return null;
  }
  if (typeof raw.id !== "string" || typeof raw.length !== "number" || !Number.isFinite(raw.length)) {
    return null;
  }
  return { id: raw.id, length: raw.length };
}

function parseSupportEntry(raw: unknown): BridgeLayoutSupport | null {
  if (!isRecord(raw)) {
    return null;
  }
  if (
    typeof raw.id !== "string" ||
    typeof raw.station !== "number" ||
    !Number.isFinite(raw.station)
  ) {
    return null;
  }
  if (raw.role !== SupportLayoutRole.ABUTMENT && raw.role !== SupportLayoutRole.PIER) {
    return null;
  }
  return {
    id: raw.id,
    station: raw.station,
    role: raw.role,
  };
}

export function parseBridgeLayoutSpans(raw: unknown): readonly BridgeLayoutSpan[] | null {
  if (raw === undefined || raw === null) {
    return [];
  }
  if (!Array.isArray(raw)) {
    return null;
  }
  const spans: BridgeLayoutSpan[] = [];
  for (const [index, entry] of raw.entries()) {
    const parsed = parseSpanEntry(entry, index);
    if (!parsed) {
      return null;
    }
    spans.push(parsed);
  }
  return spans;
}

export function parseBridgeLayoutSupports(raw: unknown): readonly BridgeLayoutSupport[] | null {
  if (raw === undefined || raw === null) {
    return [];
  }
  if (!Array.isArray(raw)) {
    return null;
  }
  const supports: BridgeLayoutSupport[] = [];
  for (const entry of raw) {
    const parsed = parseSupportEntry(entry);
    if (!parsed) {
      return null;
    }
    supports.push(parsed);
  }
  return supports;
}

export function parseBridgeSystemField(raw: unknown): BridgeSystem {
  return resolveBridgeSystem(raw);
}
