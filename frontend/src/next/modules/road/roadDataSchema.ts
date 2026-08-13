/**
 * Canonical Road Data schema (Phase 7.2 FROZEN / Phase 7.3 WP-A).
 *
 * Single Source of Truth = modules.road.data.roadData.
 * The canonical payload is the proven legacy LINER domain draft
 * (LinerDomainDraftVNext) plus a `_meta` block recording the migration source.
 *
 * RoadDesignDocument / intermediate / mesh / CIM are DERIVED and regenerated
 * from this canonical input (never persisted).
 */

import type { LinerDomainDraftVNext } from "../../../liner/schema/types";
import { createHash } from "node:crypto";

export const ROAD_DATA_SCHEMA_VERSION = "0.3.0" as const;

export type RoadDataSource = "liner" | "roadInput" | "new";

export interface RoadDataMeta {
  readonly source: RoadDataSource;
  readonly migratedAt?: string;
  readonly roadLabel?: string;
  readonly legacyId?: string;
}

export interface CanonicalRoadData {
  readonly schemaVersion: typeof ROAD_DATA_SCHEMA_VERSION;
  readonly domainDraft: LinerDomainDraftVNext;
  readonly contentChecksum: string;
  readonly _meta: RoadDataMeta;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Deterministic canonical JSON (codepoint-sorted keys; rejects non-finite). */
export function canonicalJson(value: unknown): string {
  if (value === null) return "null";
  const t = typeof value;
  if (t === "string" || t === "boolean") return JSON.stringify(value);
  if (t === "number") {
    if (!Number.isFinite(value)) throw new Error("canonicalJson rejects non-finite numbers.");
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) return `[${value.map((v) => canonicalJson(v)).join(",")}]`;
  if (!isPlainObject(value)) throw new Error("canonicalJson rejects non-JSON values.");
  const entries = Object.keys(value)
    .sort((a, b) => (a < b ? -1 : a > b ? 1 : 0))
    .map((k) => `${JSON.stringify(k)}:${canonicalJson(value[k])}`);
  return `{${entries.join(",")}}`;
}

/**
 * Compute the content checksum of the canonical input.
 * Scope = domainDraft only (deterministic). _meta is excluded so that
 * re-migration never changes the checksum of identical content.
 */
export function computeRoadDataChecksum(domainDraft: LinerDomainDraftVNext): string {
  return createHash("sha256").update(canonicalJson(domainDraft), "utf8").digest("hex");
}

/** Build a finalized CanonicalRoadData record (checksum computed). */
export function buildCanonicalRoadData(
  domainDraft: LinerDomainDraftVNext,
  meta: RoadDataMeta,
): CanonicalRoadData {
  return {
    schemaVersion: ROAD_DATA_SCHEMA_VERSION,
    domainDraft,
    contentChecksum: computeRoadDataChecksum(domainDraft),
    _meta: meta,
  };
}

/**
 * Re-finalize an existing canonical record: recompute the checksum against the
 * stored domainDraft. Returns null when the checksum does not match (tamper /
 * divergence) or the shape is malformed (fail-closed).
 */
export function finalizeCanonicalRoadData(raw: unknown): CanonicalRoadData | null {
  if (!isPlainObject(raw)) return null;
  if (raw.schemaVersion !== ROAD_DATA_SCHEMA_VERSION) return null;
  if (!isPlainObject(raw.domainDraft)) return null;
  if (typeof raw.contentChecksum !== "string") return null;
  const draft = raw.domainDraft as unknown as LinerDomainDraftVNext;
  const expected = computeRoadDataChecksum(draft);
  if (expected !== raw.contentChecksum) {
    return null;
  }
  const meta = isPlainObject(raw._meta) ? (raw._meta as unknown as RoadDataMeta) : { source: "new" as const };
  return {
    schemaVersion: ROAD_DATA_SCHEMA_VERSION,
    domainDraft: draft,
    contentChecksum: expected,
    _meta: meta,
  };
}

/** Validate the canonical record shape (fail-closed on malformed). */
export function validateCanonicalRoadData(raw: unknown): readonly { path: string; message: string }[] {
  const issues: { path: string; message: string }[] = [];
  if (!isPlainObject(raw)) {
    return [{ path: "roadData", message: "roadData must be an object." }];
  }
  if (raw.schemaVersion !== ROAD_DATA_SCHEMA_VERSION) {
    issues.push({ path: "roadData.schemaVersion", message: `unsupported schemaVersion ${String(raw.schemaVersion)}` });
  }
  if (!isPlainObject(raw.domainDraft)) {
    issues.push({ path: "roadData.domainDraft", message: "domainDraft must be an object." });
  }
  if (typeof raw.contentChecksum !== "string" || !/^[0-9a-f]{64}$/.test(raw.contentChecksum)) {
    issues.push({ path: "roadData.contentChecksum", message: "contentChecksum must be a sha256 hex digest." });
  } else if (isPlainObject(raw.domainDraft)) {
    const expected = computeRoadDataChecksum(raw.domainDraft as unknown as LinerDomainDraftVNext);
    if (expected !== raw.contentChecksum) {
      issues.push({ path: "roadData.contentChecksum", message: "contentChecksum does not match domainDraft (checksum mismatch)." });
    }
  }
  if (!isPlainObject(raw._meta)) {
    issues.push({ path: "roadData._meta", message: "_meta must be an object." });
  }
  return issues;
}
