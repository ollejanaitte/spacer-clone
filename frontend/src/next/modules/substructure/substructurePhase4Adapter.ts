/**
 * Phase 4 Support Handoff Adapter (Phase 6-01 B FROZEN / Phase 6-02 WP-B).
 *
 * Maps the Phase 4 Support Handoff (derived from Bridge Layout, sole layout
 * authority) into the SubstructureDocument's support placement. Fail-closed per
 * the FROZEN field-level mapping. Road geometry is NOT reimplemented; placement
 * stays LINER-reference based.
 */

import type { SupportReferences, SupportHandoffItem, SubstructureDocument, SubstructureSupport } from "./substructureTypes";
import type { Support } from "../../../substructure/model";

export interface Phase4AdapterResult {
  readonly supportReferences: SupportReferences;
  readonly supports: SubstructureSupport[];
  readonly placementSupports: Support[];
}

const BINDING_MISSING_SUPPORT = "SUB4_MISSING_SUPPORT";
const BINDING_MISSING_STATION = "SUB4_MISSING_STATION";
const BINDING_UNKNOWN_TYPE = "SUB4_UNKNOWN_TYPE";

export class SubstructurePhase4AdapterError extends Error {
  constructor(
    message: string,
    readonly code: string,
  ) {
    super(message);
    this.name = "SubstructurePhase4AdapterError";
  }
}

function mapSupportType(kind: string): "pier" | "abutment" {
  if (kind === "abutment") return "abutment";
  if (kind === "pier") return "pier";
  // virtual_pier -> pier (explicit mapping per FROZEN)
  if (kind === "virtual_pier") return "pier";
  throw new SubstructurePhase4AdapterError(`unknown supportType ${kind}`, BINDING_UNKNOWN_TYPE);
}

function finiteOrThrow(value: number, path: string): number {
  if (!Number.isFinite(value)) {
    throw new SubstructurePhase4AdapterError(`${path} must be finite`, BINDING_MISSING_STATION);
  }
  return value;
}

/**
 * Build support placement facts from the Phase 4 Support Handoff.
 * Fail-closed: missing/unknown support type, non-finite station -> throw.
 */
export function buildSupportPlacementFromHandoff(
  handoff: SupportReferences,
  options: { alignmentId?: string | null; defaultSkewRad?: number } = {},
): Phase4AdapterResult {
  const alignmentId = options.alignmentId ?? null;
  const supports: SubstructureSupport[] = [];
  const placementSupports: Support[] = [];
  const seen = new Set<string>();

  for (const item of handoff.supports) {
    if (seen.has(item.supportId)) {
      throw new SubstructurePhase4AdapterError(`duplicate supportId ${item.supportId}`, BINDING_MISSING_SUPPORT);
    }
    seen.add(item.supportId);
    const station = finiteOrThrow(item.station, `supportReferences.supports[${item.supportId}].station`);
    const supportType = mapSupportType(item.supportType);
    const skewRad = item.skewAngleRad !== null && Number.isFinite(item.skewAngleRad)
      ? item.skewAngleRad
      : (options.defaultSkewRad ?? 0); // null -> 0 (CCW, exceptional allowed default)

    const support: SubstructureSupport = {
      supportId: item.supportId,
      supportType,
      placement: {
        source: "liner",
        alignmentId: alignmentId ?? item.roadReferenceId ?? undefined,
        station,
        offset: 0,
      },
      skewRad,
      bearingSeats: [],
    };

    const placementSupport: Support = {
      supportId: item.supportId,
      supportType,
      placement: {
        source: "liner",
        alignmentId: alignmentId ?? item.roadReferenceId ?? undefined,
        station,
        offset: 0,
      },
      skewRad,
      bearingSeats: [],
    };

    supports.push(support);
    placementSupports.push(placementSupport);
  }

  return {
    supportReferences: handoff,
    supports,
    placementSupports,
  };
}

/** Attach the Phase 4 derived references + generated supports to the document. */
export function attachPhase4ToDocument(
  document: SubstructureDocument,
  result: Phase4AdapterResult,
): SubstructureDocument {
  return {
    ...document,
    supportReferences: result.supportReferences,
    supports: result.supports,
  };
}
