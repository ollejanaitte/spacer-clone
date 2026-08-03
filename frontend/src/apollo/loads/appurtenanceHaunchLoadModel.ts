/**
 * Step 4-C4 development dead-load model for appurtenances and haunches.
 * Source of truth: C1 geometry kernel + unit weights. No second geometry SoT.
 *
 * DISTRIBUTION (DEC-S4-0010, development-only):
 * - curb / railing / optional barrier → nearest main girder by |Y - girderY|
 * - median → equal share across all main girders
 * - haunch → 100% to owning mainGirderRefId
 * - nearest tie: lower girder index wins (deterministic)
 *
 * Direction: -Z. Missing unit weight → NOT_AVAILABLE (not passed to analysis).
 */

import {
  GEOMETRY_FORMULA_IDS,
  buildBridgeAppurtenanceModels,
  buildRcDeckHaunchModels,
  deriveAppurtenanceGeometries,
  deriveHaunchGeometries,
  deriveMainGirderOffsets,
  getBridgeStructureInputDraft,
  isBridgeStructureGenerationCurrent,
  mainGirderKeyFromIndex,
  type AppurtenanceGeometry,
  type AppurtenanceSlot,
  type HaunchGeometry,
} from "../bridgeStructure";
import { buildInputChecksum, buildInputRevision } from "../quantity/quantityModel";
import type { ProjectModel } from "../../types";

export const LOAD_MODEL_SCHEMA_VERSION = "1.0.0-development" as const;

export type DeadLoadCaseId = "DEAD_APPURTENANCE" | "DEAD_RC_HAUNCH";

export type LoadDistributionRule =
  | "NEAREST_GIRDER"
  | "EQUAL_ALL_GIRDERS"
  | "OWN_GIRDER";

export type SegmentDeadLoadStatus =
  | "READY"
  | "NOT_AVAILABLE"
  | "STALE"
  | "INCOMPLETE";

export type GirderShare = {
  readonly girderKey: string;
  readonly girderIndex: number;
  readonly girderOffsetY: number;
  readonly share: number;
};

export type SegmentDeadLoad = {
  readonly loadId: string;
  readonly sourceEntityId: string;
  readonly sourceType: "BridgeAppurtenance" | "RcDeckHaunch";
  readonly loadCaseId: DeadLoadCaseId;
  readonly category: "APPURTENANCE" | "RC_HAUNCH";
  readonly slotOrGirderKey: string;
  readonly startStation: number;
  readonly endStation: number;
  readonly lengthM: number;
  readonly transverseOffset: number;
  readonly sectionAreaM2: number;
  readonly lineLoadKNPerM: number | null;
  readonly totalLoadKN: number | null;
  readonly direction: "-Z";
  readonly distributionRule: LoadDistributionRule;
  readonly targetGirderRefs: readonly GirderShare[];
  readonly formulaIds: readonly string[];
  readonly unitWeightSource: "USER_PROVIDED_UNVERIFIED" | "NOT_AVAILABLE";
  readonly status: SegmentDeadLoadStatus;
  readonly warnings: readonly string[];
  readonly provenance: {
    readonly source: "canonical_geometry_kernel";
    readonly generatedBy: "buildAppurtenanceHaunchLoadModel";
    readonly designAuthorization: "NOT_AUTHORIZED";
    readonly developmentLabel: "UNVERIFIED_DEVELOPMENT_ONLY";
  };
};

export type AppurtenanceHaunchLoadModel = {
  readonly schemaVersion: typeof LOAD_MODEL_SCHEMA_VERSION;
  readonly loadModelId: string;
  readonly projectId: string;
  readonly inputRevision: string;
  readonly inputChecksum: string;
  readonly generatedAt: string;
  readonly stale: boolean;
  readonly developmentLabel: "UNVERIFIED_DEVELOPMENT_ONLY";
  readonly authorizationStatus: "NOT_GRANTED";
  readonly designOrConstructionUse: "PROHIBITED";
  readonly status: "READY" | "INCOMPLETE" | "STALE" | "EMPTY";
  readonly loads: readonly SegmentDeadLoad[];
  readonly warnings: readonly string[];
};

function distributionRuleForSlot(slot: AppurtenanceSlot): LoadDistributionRule {
  if (slot === "MEDIAN") return "EQUAL_ALL_GIRDERS";
  return "NEAREST_GIRDER";
}

/**
 * Nearest girder by absolute transverse offset difference.
 * Tie break: lower girder index wins (deterministic development rule).
 */
export function resolveNearestGirderShares(
  transverseOffset: number,
  girderOffsets: readonly number[],
): GirderShare[] {
  if (girderOffsets.length === 0) return [];
  let bestIndex = 0;
  let bestDist = Math.abs(transverseOffset - girderOffsets[0]!);
  for (let i = 1; i < girderOffsets.length; i += 1) {
    const dist = Math.abs(transverseOffset - girderOffsets[i]!);
    if (dist < bestDist - 1e-12) {
      bestDist = dist;
      bestIndex = i;
    }
  }
  return [
    {
      girderKey: mainGirderKeyFromIndex(bestIndex),
      girderIndex: bestIndex,
      girderOffsetY: girderOffsets[bestIndex]!,
      share: 1,
    },
  ];
}

export function resolveEqualGirderShares(girderOffsets: readonly number[]): GirderShare[] {
  if (girderOffsets.length === 0) return [];
  const share = 1 / girderOffsets.length;
  return girderOffsets.map((offset, index) => ({
    girderKey: mainGirderKeyFromIndex(index),
    girderIndex: index,
    girderOffsetY: offset,
    share,
  }));
}

export function resolveOwnGirderShare(
  mainGirderKey: string,
  girderOffsets: readonly number[],
): GirderShare[] {
  const match = /^girder-(\d+)$/.exec(mainGirderKey);
  if (!match) return [];
  const index = Number(match[1]);
  if (index < 0 || index >= girderOffsets.length) return [];
  return [
    {
      girderKey: mainGirderKey,
      girderIndex: index,
      girderOffsetY: girderOffsets[index]!,
      share: 1,
    },
  ];
}

export function assertShareSumOne(shares: readonly GirderShare[], tolerance = 1e-12): boolean {
  if (shares.length === 0) return false;
  const sum = shares.reduce((acc, entry) => acc + entry.share, 0);
  return Math.abs(sum - 1) <= tolerance;
}

function distributedTotalsParity(load: SegmentDeadLoad): boolean {
  if (load.totalLoadKN === null) return load.status === "NOT_AVAILABLE";
  const sum = load.targetGirderRefs.reduce(
    (acc, entry) => acc + entry.share * (load.totalLoadKN as number),
    0,
  );
  return Math.abs(sum - load.totalLoadKN) <= Math.max(1e-9, 1e-12 * Math.abs(load.totalLoadKN));
}

function buildAppurtenanceLoad(
  geometry: AppurtenanceGeometry,
  girderOffsets: readonly number[],
  stale: boolean,
): SegmentDeadLoad {
  const rule = distributionRuleForSlot(geometry.slot);
  const targets =
    rule === "EQUAL_ALL_GIRDERS"
      ? resolveEqualGirderShares(girderOffsets)
      : resolveNearestGirderShares(geometry.placement.transverseOffset, girderOffsets);
  const hasWeight = geometry.unitWeightKNPerM3 !== null && geometry.totalWeightKN !== null;
  const lineLoad = hasWeight ? geometry.areaM2 * geometry.unitWeightKNPerM3! : null;
  const status: SegmentDeadLoadStatus = stale
    ? "STALE"
    : hasWeight
      ? "READY"
      : "NOT_AVAILABLE";
  const warnings = [
    "DEVELOPMENT_ONLY_DISTRIBUTION",
    "NOT_AUTHORIZED",
    "LOCAL_CRS_UNBOUND",
    ...geometry.warnings,
    ...(hasWeight ? [] : ["UNIT_WEIGHT_MISSING: load NOT_AVAILABLE; do not pass to analysis"]),
  ];
  return {
    loadId: `load:appurtenance:${geometry.sourceEntityId}`,
    sourceEntityId: geometry.sourceEntityId,
    sourceType: "BridgeAppurtenance",
    loadCaseId: "DEAD_APPURTENANCE",
    category: "APPURTENANCE",
    slotOrGirderKey: geometry.slot,
    startStation: geometry.placement.startStation,
    endStation: geometry.placement.endStation,
    lengthM: geometry.lengthM,
    transverseOffset: geometry.placement.transverseOffset,
    sectionAreaM2: geometry.areaM2,
    lineLoadKNPerM: lineLoad,
    totalLoadKN: hasWeight ? geometry.totalWeightKN : null,
    direction: "-Z",
    distributionRule: rule,
    targetGirderRefs: targets,
    formulaIds: [
      GEOMETRY_FORMULA_IDS.APP_RECT_AREA,
      GEOMETRY_FORMULA_IDS.APP_LENGTH,
      ...(hasWeight ? [GEOMETRY_FORMULA_IDS.APP_TOTAL_WEIGHT, "F-S4C-APP-LINE-LOAD"] : []),
    ],
    unitWeightSource: hasWeight ? "USER_PROVIDED_UNVERIFIED" : "NOT_AVAILABLE",
    status,
    warnings,
    provenance: {
      source: "canonical_geometry_kernel",
      generatedBy: "buildAppurtenanceHaunchLoadModel",
      designAuthorization: "NOT_AUTHORIZED",
      developmentLabel: "UNVERIFIED_DEVELOPMENT_ONLY",
    },
  };
}

function buildHaunchLoad(
  geometry: HaunchGeometry,
  girderOffsets: readonly number[],
  stale: boolean,
): SegmentDeadLoad {
  const targets = resolveOwnGirderShare(geometry.mainGirderKey, girderOffsets);
  const hasWeight = geometry.unitWeightKNPerM3 !== null && geometry.totalWeightKN !== null;
  const lineLoad = hasWeight ? geometry.areaM2 * geometry.unitWeightKNPerM3! : null;
  const status: SegmentDeadLoadStatus = stale
    ? "STALE"
    : hasWeight
      ? "READY"
      : "NOT_AVAILABLE";
  return {
    loadId: `load:haunch:${geometry.sourceEntityId}`,
    sourceEntityId: geometry.sourceEntityId,
    sourceType: "RcDeckHaunch",
    loadCaseId: "DEAD_RC_HAUNCH",
    category: "RC_HAUNCH",
    slotOrGirderKey: geometry.mainGirderKey,
    startStation: geometry.placement.startStation,
    endStation: geometry.placement.endStation,
    lengthM: geometry.lengthM,
    transverseOffset: geometry.placement.girderOffsetY,
    sectionAreaM2: geometry.areaM2,
    lineLoadKNPerM: lineLoad,
    totalLoadKN: hasWeight ? geometry.totalWeightKN : null,
    direction: "-Z",
    distributionRule: "OWN_GIRDER",
    targetGirderRefs: targets,
    formulaIds: [
      geometry.shapeType === "RECT"
        ? GEOMETRY_FORMULA_IDS.HAUNCH_RECT_AREA
        : GEOMETRY_FORMULA_IDS.HAUNCH_TRAP_AREA,
      GEOMETRY_FORMULA_IDS.HAUNCH_LENGTH,
      ...(hasWeight ? [GEOMETRY_FORMULA_IDS.HAUNCH_TOTAL_WEIGHT, "F-S4C-HAUNCH-LINE-LOAD"] : []),
    ],
    unitWeightSource: hasWeight ? "USER_PROVIDED_UNVERIFIED" : "NOT_AVAILABLE",
    status,
    warnings: [
      "DEVELOPMENT_ONLY_DISTRIBUTION",
      "NOT_AUTHORIZED",
      "OWN_GIRDER_100_PERCENT",
      ...geometry.warnings,
      ...(hasWeight ? [] : ["RC_UNIT_WEIGHT_MISSING: load NOT_AVAILABLE; do not pass to analysis"]),
    ],
    provenance: {
      source: "canonical_geometry_kernel",
      generatedBy: "buildAppurtenanceHaunchLoadModel",
      designAuthorization: "NOT_AUTHORIZED",
      developmentLabel: "UNVERIFIED_DEVELOPMENT_ONLY",
    },
  };
}

export function buildAppurtenanceHaunchLoadModel(
  project: ProjectModel,
  options?: { readonly generatedAt?: string; readonly forceStale?: boolean },
): AppurtenanceHaunchLoadModel {
  const draft = getBridgeStructureInputDraft(project);
  const stale = options?.forceStale === true || !isBridgeStructureGenerationCurrent(project);
  const inputChecksum = buildInputChecksum(draft);
  const inputRevision = buildInputRevision(draft);
  const generatedAt = options?.generatedAt ?? new Date().toISOString();
  const warnings = [
    "UNVERIFIED DEVELOPMENT LOAD MODEL",
    "NOT FOR DESIGN OR CONSTRUCTION",
    "NUMERIC_DESIGN_AUTHORIZATION: NOT_GRANTED",
    "DISTRIBUTION: DEC-S4-0010 development-only (nearest curb/rail; equal median; own-girder haunch)",
  ];
  if (stale) warnings.push("STALE: regenerate structure before using loads");

  const loads: SegmentDeadLoad[] = [];

  if (
    draft.bridgeLength !== null &&
    draft.width !== null &&
    draft.deckThickness !== null &&
    draft.girderCount !== null &&
    draft.girderSpacing !== null
  ) {
    const girderOffsets = deriveMainGirderOffsets(draft.girderCount, draft.girderSpacing) ?? [];
    const appModels = buildBridgeAppurtenanceModels(draft.appurtenanceConfiguration, {
      bridgeLength: draft.bridgeLength,
      width: draft.width,
      projectScopeId: project.project.id,
    });
    if (appModels.complete && appModels.models.length > 0) {
      const derived = deriveAppurtenanceGeometries(appModels.models, {
        deckThicknessM: draft.deckThickness,
      });
      for (const geometry of derived.geometries) {
        loads.push(buildAppurtenanceLoad(geometry, girderOffsets, stale));
      }
    }

    const haunchModels = buildRcDeckHaunchModels(draft.haunchConfiguration, {
      bridgeLength: draft.bridgeLength,
      girderCount: draft.girderCount,
      projectScopeId: project.project.id,
    });
    if (haunchModels.complete && haunchModels.models.length > 0) {
      const derived = deriveHaunchGeometries(haunchModels.models, {
        girderCount: draft.girderCount,
        girderSpacing: draft.girderSpacing,
        rcUnitWeightKNPerM3: draft.rcUnitWeight,
      });
      for (const geometry of derived.geometries) {
        loads.push(buildHaunchLoad(geometry, girderOffsets, stale));
      }
    }
  }

  loads.sort((a, b) => a.loadId.localeCompare(b.loadId));

  for (const load of loads) {
    if (load.targetGirderRefs.length > 0 && !assertShareSumOne(load.targetGirderRefs)) {
      warnings.push(`SHARE_SUM_INVALID: ${load.loadId}`);
    }
    if (!distributedTotalsParity(load)) {
      warnings.push(`TOTAL_PARITY_FAIL: ${load.loadId}`);
    }
  }

  const hasUnavailable = loads.some((load) => load.status === "NOT_AVAILABLE");
  const status = stale
    ? "STALE"
    : loads.length === 0
      ? "EMPTY"
      : hasUnavailable
        ? "INCOMPLETE"
        : "READY";

  return {
    schemaVersion: LOAD_MODEL_SCHEMA_VERSION,
    loadModelId: `load-${project.project.id}-${inputChecksum.slice(0, 12)}`,
    projectId: project.project.id,
    inputRevision,
    inputChecksum,
    generatedAt,
    stale,
    developmentLabel: "UNVERIFIED_DEVELOPMENT_ONLY",
    authorizationStatus: "NOT_GRANTED",
    designOrConstructionUse: "PROHIBITED",
    status,
    loads,
    warnings,
  };
}

/** Loads safe to pass to analysis adapters (READY only; never STALE/NOT_AVAILABLE). */
export function analysisEligibleLoads(
  model: AppurtenanceHaunchLoadModel,
): readonly SegmentDeadLoad[] {
  if (model.stale) return [];
  return model.loads.filter((load) => load.status === "READY" && load.totalLoadKN !== null);
}

export function loadModelToJson(model: AppurtenanceHaunchLoadModel): string {
  return `${JSON.stringify(model, null, 2)}\n`;
}
