/**
 * Phase 3-5: BridgeProject → ③下部工 binding.
 *
 * Turns the BridgeProject CBDM `bridgeGeometry.supports` + manifest
 * `sharedFacts` into the substructure domain's `Support[]` with REAL placement
 * facts (station / skew / bearing seats / alignment) and SUBSTRUCTURE-owned
 * initial pier/abutment shape templates.
 *
 * Responsibility split (Phase 1-2):
 *  - this BridgeProject Adapter: shared contract → Support model (bind/validate)
 *  - Calculation Adapter (A-01): Support model → calculation engine boundary (unchanged)
 * Single ingestion path: source → BridgeProject Adapter → Support model.
 *
 * Reactions are NEVER upgraded: `buildBoundReactions` only surfaces them as
 * input data and fails closed if any reaction claims an authorized status.
 */

import type { CommonBridgeDataModelValue } from "../contracts/runtime/schemas/commonBridgeDataModel";
import type { BridgeProject } from "../contracts/bridgeProject";
import {
  type BearingSeat,
  type Support,
  type SupportType,
} from "../substructure/model";
import {
  generateSample,
  type SampleKind,
} from "../substructure/planning/samples/sampleGenerator";
import type { SupportReactions } from "../substructure/design/designTypes";
import { BridgeProjectAdapterError, BP_CODES, assertFinite } from "./validation";

export const BRIDGE_PROJECT_SUBSTRUCTURE_TOOL_ID = "spacer-bridge-project-substructure-binding";

export interface BoundSubstructureOptions {
  readonly alignmentId?: string;
  /** SUBSTRUCTURE-owned initial shape template (form/dimensions). */
  readonly initialShape?: SampleKind;
}

type CbdmFields = Record<string, { value?: unknown; unit?: string; state?: string }>;

interface CbdmSupportEntity {
  id: string;
  fields?: CbdmFields;
}

function numeric(fields: CbdmFields | undefined, key: string): number | undefined {
  const value = fields?.[key]?.value;
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function stringValue(fields: CbdmFields | undefined, key: string): string | undefined {
  const value = fields?.[key]?.value;
  return typeof value === "string" ? value : undefined;
}

/**
 * Build the substructure `Support[]` from the BridgeProject CBDM.
 * Placement facts (station/skew/bearing seats/alignment) are bound from the
 * shared model; the initial pier/abutment shape is SUBSTRUCTURE-owned.
 */
export function buildBoundSubstructure(
  commonModel: CommonBridgeDataModelValue,
  manifest?: BridgeProject,
  options: BoundSubstructureOptions = {},
): Support[] {
  const supports = (commonModel.bridgeGeometry.supports ?? []) as unknown as CbdmSupportEntity[];
  if (supports.length === 0) {
    throw new BridgeProjectAdapterError(
      BP_CODES.BRIDGE_EXTENT_MISSING,
      "BridgeProject bound substructure requires at least one support in the CBDM bridgeGeometry.",
    );
  }

  const alignmentId =
    options.alignmentId ?? commonModel.alignments.alignments[0]?.id ?? "default-alignment";  const bearingBySupport = new Map<string, { seatId: string; transverseOffsetM?: number }[]>();
  for (const support of manifest?.sharedFacts?.supports ?? []) {
    if (support.bearingSeats !== undefined && support.bearingSeats.length > 0) {
      bearingBySupport.set(support.supportId, support.bearingSeats as never);
    }
  }

  return supports.map((entity) => {
    const supportId = entity.id;
    const station = numeric(entity.fields, "station") ?? numeric(entity.fields, "stationM");
    const skewRad = numeric(entity.fields, "skew") ?? numeric(entity.fields, "skewRad");
    const kind = stringValue(entity.fields, "kind");

    if (station === undefined) {
      throw new BridgeProjectAdapterError(
        BP_CODES.BRIDGE_EXTENT_MISSING,
        `BridgeProject bound substructure: support ${supportId} has no declared station.`,
      );
    }
    assertFinite(station, `support ${supportId} station`);
    const skew = skewRad !== undefined ? skewRad : 0;

    const supportType: SupportType = kind === "abutment" ? "abutment" : "pier";
    const shapeKind =
      options.initialShape ??
      (supportType === "abutment" ? "abutment_inverted_t" : "pier_single");

    // SUBSTRUCTURE-owned initial shape template; placement is overridden below.
    const template = generateSample(shapeKind, supportId, station);
    const support: Support = {
      ...template,
      supportId,
      supportType,
      skewRad: skew,
      placement: { source: "liner", alignmentId, station, offset: 0 },
      bearingSeats: (bearingBySupport.get(supportId) ?? []).map((seat) => {
        const world: BearingSeat = {
          seatId: seat.seatId,
          position: { x: 0, y: seat.transverseOffsetM ?? 0, z: 0 },
          dimensions: { w: 0.4, d: 0.4, h: 0.1 },
          bearing: { id: `${seat.seatId}-BEARING`, height: 0.1, type: "elastomeric" },
        };
        return world;
      }),
    };
    return support;
  });
}

/**
 * Surface the BridgeProject reactions to the substructure domain as INPUT DATA
 * ONLY. Fails closed if any reaction claims an authorized status.
 */
export function buildBoundReactions(
  manifest: BridgeProject,
): SupportReactions[] {
  const reactions = manifest.sharedFacts?.reactions ?? [];
  for (const reaction of reactions) {
    if (reaction.status !== "NOT_AUTHORIZED") {
      throw new BridgeProjectAdapterError(
        BP_CODES.SOURCE_INVALID,
        `Reaction ${reaction.supportId}/${reaction.caseKind} has status ${reaction.status}; only NOT_AUTHORIZED reactions may be surfaced as input data.`,
      );
    }
  }
  const bySupport = new Map<string, SupportReactions>();
  for (const reaction of reactions) {
    const entry = bySupport.get(reaction.supportId) ?? {
      supportId: reaction.supportId,
      cases: [],
      source: "bridge-project",
      sourceRevision: `manifest-rev-${manifest.revisionId}`,
    };
    entry.cases.push({
      caseId: `${reaction.caseKind}-case`,
      caseKind: reaction.caseKind,
      ...(reaction.force !== undefined ? { force: reaction.force } : {}),
      ...(reaction.moment !== undefined ? { moment: reaction.moment } : {}),
    });
    bySupport.set(reaction.supportId, entry);
  }
  return Array.from(bySupport.values());
}
