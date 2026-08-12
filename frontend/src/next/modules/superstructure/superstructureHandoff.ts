/**
 * Superstructure -> Substructure handoff (Phase 5-01 D-02 FROZEN / Phase 5-02 WP-H).
 *
 * Generates the all-supports SuperstructureHandoff (v1.0.0) from the canonical
 * SuperstructureDocument + frozen GeometrySnapshot + gated reaction results, and
 * provides the v0.1.0 support-interface conversion (`toSupportInterfaceEntry`)
 * so the existing Phase 6 adapters (superstructureInterface / superstructureEnvelope)
 * can receive it unchanged.
 *
 * Values are never invented: MISSING (girderBottomElevation / deckElevation /
 * bearing type) stays null. Reactions keep NOT_AUTHORIZED as input data.
 */

import type { GeometrySnapshot } from "../../../apollo/geometry/types";
import type { SuperstructureDocument } from "./superstructureTypes";
import { buildDeadLoads } from "./superstructureLoadModel";

export const SUPERSTRUCTURE_HANDOFF_SCHEMA_VERSION = "1.0.0" as const;

export interface SuperstructureHandoffVec3 {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

export interface SuperstructureHandoffBearingSeat {
  readonly seatId: string;
  readonly girderId: string;
  readonly position: SuperstructureHandoffVec3; // Project-global XYZ
  readonly elevation: number;
  readonly localOffset: { longitudinalM: number; transverseM: number };
  readonly orientation: {
    readonly longitudinalAxis: SuperstructureHandoffVec3;
    readonly transverseAxis: SuperstructureHandoffVec3;
    readonly verticalAxis: SuperstructureHandoffVec3;
  };
  readonly bearingType: "rubber" | "fixed" | "movable" | null;
  readonly fixedOrMovable: "FIXED" | "MOVABLE" | "UNDECIDED";
  readonly longitudinalDirection: "+station" | "-station" | null;
  readonly transverseDirection: "L" | "R" | null;
}

export interface SuperstructureHandoffReaction {
  readonly caseId: string;
  readonly combinationId: string;
  readonly seatId: string;
  readonly supportId: string;
  readonly girderId: string;
  readonly Fx: number;
  readonly Fy: number;
  readonly Fz: number;
  readonly Mx: number;
  readonly My: number;
  readonly Mz: number;
  readonly unit: "kN";
  readonly momentUnit: "kNm";
  readonly signConvention: { force: "up-positive"; moment: "right-hand-rule" };
}

export interface SuperstructureHandoffSupport {
  readonly supportId: string;
  readonly supportType: "abutment" | "pier";
  readonly station: number;
  readonly position: SuperstructureHandoffVec3;
  readonly tangentAzimuthRad: number;
  readonly skewAngleRad: number | null;
  readonly localFrame: {
    readonly tangent: SuperstructureHandoffVec3;
    readonly transverse: SuperstructureHandoffVec3;
    readonly vertical: SuperstructureHandoffVec3;
  };
  readonly bearingSeats: readonly SuperstructureHandoffBearingSeat[];
  readonly reactionCases: readonly SuperstructureHandoffReaction[];
}

export interface SuperstructureHandoff {
  readonly handoffKind: "superstructure-handoff";
  readonly schemaVersion: typeof SUPERSTRUCTURE_HANDOFF_SCHEMA_VERSION;
  readonly handoffId: string;
  readonly bridgeId: string;
  /** SuperstructureDocument documentId (UUID). */
  readonly documentReference: string;
  readonly generatedAt: string;
  readonly coordinateContext: {
    readonly coordinatePolicyId: string | null;
    readonly axisConvention: "x-along/y-transverse/z-up";
    readonly unitSystem: "metric";
    readonly signConvention: { reactionZ: "up-positive"; skew: "counterclockwise-positive" };
    readonly positionConvention: "project-global-XYZ";
  };
  readonly superstructureType: string;
  readonly structuralSystem: { spanSystem: "simple" | "continuous"; bridgeSystem: "SIMPLE_SINGLE" | "CONTINUOUS" };
  readonly supports: readonly SuperstructureHandoffSupport[];
  readonly girderBottomElevation: Record<string, number | null>;
  readonly deckElevation: Record<string, number | null>;
  readonly superstructureEnvelope: {
    readonly minX: number;
    readonly maxX: number;
    readonly minY: number;
    readonly maxY: number;
    readonly minZ: number;
    readonly maxZ: number;
  };
  readonly selfWeight: {
    readonly structuralGirderKN: number | null;
    readonly structuralSecondaryKN: number | null;
    readonly deckKN: number | null;
    readonly totalKN: number | null;
  };
  readonly validation: { ok: boolean; issues: readonly { path: string; message: string }[] };
}

export type SuperstructureHandoffResult =
  | { ok: true; handoff: SuperstructureHandoff }
  | { ok: false; issues: readonly { path: string; message: string }[] };

/** Build the Phase 6 handoff from the canonical document + snapshot + reactions. */
export function buildSuperstructureHandoff(
  document: SuperstructureDocument,
  snapshot: GeometrySnapshot,
  now: string = new Date().toISOString(),
): SuperstructureHandoffResult {
  const issues: { path: string; message: string }[] = [];
  if (!document.bridgeLayoutReference) {
    issues.push({ path: "bridgeLayoutReference", message: "Bridge Layout is required" });
  }
  if (!document.supportReferences || document.supportReferences.supports.length === 0) {
    issues.push({ path: "supportReferences", message: "supportReferences are required" });
  }
  if (issues.length > 0) {
    return { ok: false, issues };
  }

  const bridgeId = document.bridgeLayoutReference!.bridgeId;
  const reactionBySeat = new Map(document.reactionResults.reactionCases.map((c) => [c.seatId, c]));

  // support line lookup for station/skew/position
  const supportLines = new Map(snapshot.supportLines.map((s) => [s.supportId, s]));
  const supportPoints = snapshot.supportPoints;
  const bearingById = new Map(snapshot.bearingPoints.map((b) => [`${b.supportId}:${b.girderId}`, b]));
  const seatForm = new Map(document.bearingConfiguration.bearingSeats.map((s) => [s.seatId, s]));

  const supports = document.supportReferences!.supports.map((s) => {
    const line = supportLines.get(s.supportId);
    const seats = snapshot.girderLines.map((g) => g.girderId).map((girderId) => {
      const bp = bearingById.get(`${s.supportId}:${girderId}`);
      const seatId = `BRG-${s.supportId}-${girderId}`;
      const form = seatForm.get(seatId);
      const supportPoint = supportPoints.find((p) => p.supportId === s.supportId && p.girderId === girderId);
      const frame = bp?.localFrame;
      const reaction = reactionBySeat.get(seatId);
      const position = bp?.position ?? { x: 0, y: 0, z: line?.elevationM.value ?? 0 };
      const localOffset = supportPoint
        ? { longitudinalM: position.x - supportPoint.position.x, transverseM: position.y - supportPoint.position.y }
        : { longitudinalM: 0, transverseM: 0 };
      const bearingSeat: SuperstructureHandoffBearingSeat = {
        seatId,
        girderId,
        position,
        elevation: position.z,
        localOffset,
        orientation: frame
          ? { longitudinalAxis: frame.tangent, transverseAxis: frame.normal, verticalAxis: frame.binormal }
          : { longitudinalAxis: { x: 1, y: 0, z: 0 }, transverseAxis: { x: 0, y: 1, z: 0 }, verticalAxis: { x: 0, y: 0, z: 1 } },
        bearingType: form?.bearingType ?? null,
        fixedOrMovable: form?.fixedOrMovable ?? "UNDECIDED",
        longitudinalDirection: form?.longitudinalDirection ?? null,
        transverseDirection: form?.transverseDirection ?? null,
      };
      return bearingSeat;
    });
    const reactionCases = seats.map((seat) => {
      const r = reactionBySeat.get(seat.seatId);
      return r ?? {
        caseId: "",
        combinationId: "",
        seatId: seat.seatId,
        supportId: s.supportId,
        girderId: seat.girderId,
        Fx: 0, Fy: 0, Fz: 0, Mx: 0, My: 0, Mz: 0,
        unit: "kN" as const,
        momentUnit: "kNm" as const,
        signConvention: { force: "up-positive" as const, moment: "right-hand-rule" as const },
      };
    });
    return {
      supportId: s.supportId,
      supportType: s.supportType,
      station: s.station,
      position: {
        x: s.position.domainX,
        y: s.position.domainY,
        z: s.position.elevation,
      },
      tangentAzimuthRad: s.tangentAzimuthRad,
      skewAngleRad: s.skewAngleRad,
      localFrame: {
        tangent: { x: 1, y: 0, z: 0 },
        transverse: { x: 0, y: 1, z: 0 },
        vertical: { x: 0, y: 0, z: 1 },
      },
      bearingSeats: seats,
      reactionCases,
    };
  });

  // envelope from bearing positions
  const allPositions = supports.flatMap((sp) => sp.bearingSeats.map((b) => b.position));
  const xs = allPositions.map((p) => p.x);
  const ys = allPositions.map((p) => p.y);
  const zs = allPositions.map((p) => p.z);
  const envelope = xs.length > 0
    ? { minX: Math.min(...xs), maxX: Math.max(...xs), minY: Math.min(...ys), maxY: Math.max(...ys), minZ: Math.min(...zs), maxZ: Math.max(...zs) }
    : { minX: 0, maxX: 0, minY: 0, maxY: 0, minZ: 0, maxZ: 0 };

  // self weight
  const deadLoads = buildDeadLoads(document);
  const selfWeight = {
    structuralGirderKN: deadLoads.structuralGirder.valueKN,
    structuralSecondaryKN: deadLoads.structuralSecondary.valueKN,
    deckKN: deadLoads.deck.valueKN,
    totalKN: [deadLoads.structuralGirder.valueKN, deadLoads.structuralSecondary.valueKN, deadLoads.deck.valueKN]
      .filter((v): v is number => v !== null)
      .reduce((sum, v) => sum + v, 0) || null,
  };

  return {
    ok: true,
    handoff: {
      handoffKind: "superstructure-handoff",
      schemaVersion: SUPERSTRUCTURE_HANDOFF_SCHEMA_VERSION,
      handoffId: `SH-${bridgeId}`,
      bridgeId,
      documentReference: document.documentId,
      generatedAt: now,
      coordinateContext: {
        coordinatePolicyId: document.roadReference?.coordinatePolicyId ?? null,
        axisConvention: "x-along/y-transverse/z-up",
        unitSystem: "metric",
        signConvention: { reactionZ: "up-positive", skew: "counterclockwise-positive" },
        positionConvention: "project-global-XYZ",
      },
      superstructureType: document.superstructureType,
      structuralSystem: document.structuralSystem,
      supports,
      girderBottomElevation: Object.fromEntries(supports.map((sp) => [sp.supportId, null])),
      deckElevation: Object.fromEntries(supports.map((sp) => [sp.supportId, null])),
      superstructureEnvelope: envelope,
      selfWeight,
      validation: { ok: true, issues: [] },
    },
  };
}

/** v0.1.0 support-interface conversion for one support (Phase 6 adapter compatibility). */
export function toSupportInterfaceEntry(
  handoff: SuperstructureHandoff,
  supportId: string,
): Record<string, unknown> | null {
  const support = handoff.supports.find((s) => s.supportId === supportId);
  if (!support) return null;
  return {
    schemaVersion: "0.1.0",
    projectId: null,
    bridgeId: handoff.bridgeId,
    supportId: support.supportId,
    supportType: support.supportType,
    sourceApplication: "spacer-superstructure-module",
    sourceVersion: handoff.schemaVersion,
    coordinateSystem: "x-longitudinal-y-transverse-z-up",
    unitSystem: "si",
    origin: support.position,
    position: support.position,
    longitudinalAxis: support.localFrame.tangent,
    transverseAxis: support.localFrame.transverse,
    verticalAxis: support.localFrame.vertical,
    skewAngle: support.skewAngleRad,
    bearingSeats: support.bearingSeats.map((b) => ({
      bearingId: b.seatId,
      bearingPosition: { x: b.localOffset.transverseM, y: 0, z: b.position.z - support.position.z },
      bearingHeight: null,
    })),
    reactionCases: support.reactionCases
      .filter((r) => r.caseId !== "")
      .map((r) => ({
        caseId: r.caseId,
        caseKind: r.combinationId,
        force: { x: r.Fx, y: r.Fy, z: r.Fz },
        moment: { x: r.Mx, y: r.My, z: r.Mz },
      })),
    girderBottomElevation: handoff.girderBottomElevation[supportId] ?? undefined,
    deckElevation: handoff.deckElevation[supportId] ?? undefined,
    metadata: { sourceDocumentReference: handoff.documentReference },
    createdAt: handoff.generatedAt,
    updatedAt: handoff.generatedAt,
  };
}
