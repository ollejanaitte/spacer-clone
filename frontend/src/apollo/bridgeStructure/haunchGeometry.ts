/**
 * Step 4-C RC deck haunch geometry derivation kernel.
 *
 * Source of truth: RcDeckHaunchModel.
 * Datum (DEC-S4-0009): on top flange upper face, below deck soffit.
 *
 * Existing solids convention places girder top / deck soffit at Z=0.
 * Development placement (DEC-S4C-0002):
 * - haunch bottom Z = topFlangeUpperFaceZ (= 0)
 * - haunch top Z = bottom + height
 * - Y centered on the owning main girder offset
 * Mesh / AABB are never used as SoR.
 */

import type { RcDeckHaunchModel } from "./haunchTypes";
import {
  GEOMETRY_FORMULA_IDS,
  deriveLengthMeters,
  deriveMainGirderOffsets,
  deriveRectAreaMeters2,
  deriveTotalWeightKN,
  deriveTrapezoidAreaMeters2,
  deriveVolumeMeters3,
  type GeometryFormulaId,
} from "./geometryFormulas";

export type HaunchPlacement = {
  readonly centerStation: number;
  readonly startStation: number;
  readonly endStation: number;
  readonly girderOffsetY: number;
  readonly topFlangeUpperFaceZ: number;
  readonly deckSoffitZ: number;
  readonly centerZ: number;
  readonly topWidthM: number;
  readonly bottomWidthM: number;
  readonly heightM: number;
};

export type HaunchGeometry = {
  readonly sourceEntityId: string;
  readonly mainGirderKey: string;
  readonly mainGirderRefId: string;
  readonly shapeType: RcDeckHaunchModel["shapeType"];
  readonly lengthM: number;
  readonly areaM2: number;
  readonly volumeM3: number;
  readonly unitWeightKNPerM3: number | null;
  readonly totalWeightKN: number | null;
  readonly totalWeightStatus: "USER_PROVIDED_UNVERIFIED" | "NOT_AVAILABLE";
  readonly placement: HaunchPlacement;
  readonly formulaIds: readonly GeometryFormulaId[];
  readonly designAuthorization: "NOT_AUTHORIZED";
  readonly status: "UNVERIFIED_DEVELOPMENT_ONLY";
  readonly provenance: {
    readonly source: "canonical_haunch_model";
    readonly generatedBy: "deriveHaunchGeometry";
    readonly datum: "top_flange_upper_face_to_deck_soffit";
    readonly coordinateFrame: "local_crs_unbound";
  };
  readonly warnings: readonly string[];
};

export type HaunchGeometryResult =
  | { readonly ok: true; readonly geometry: HaunchGeometry }
  | { readonly ok: false; readonly sourceEntityId: string; readonly diagnostics: readonly string[] };

export type HaunchGeometryContext = {
  readonly girderCount: number;
  readonly girderSpacing: number;
  /** Optional override map: mainGirderKey → Y offset. Defaults to deriveMainGirderOffsets. */
  readonly girderOffsetsByKey?: Readonly<Record<string, number>>;
  /** RC unit weight (kN/m³). null → weight NOT_AVAILABLE. */
  readonly rcUnitWeightKNPerM3: number | null;
};

function resolveGirderOffsetY(
  model: RcDeckHaunchModel,
  context: HaunchGeometryContext,
): { readonly offset: number | null; readonly diagnostic: string | null } {
  if (context.girderOffsetsByKey && model.mainGirderKey in context.girderOffsetsByKey) {
    const offset = context.girderOffsetsByKey[model.mainGirderKey]!;
    if (!Number.isFinite(offset)) {
      return { offset: null, diagnostic: `girder offset for ${model.mainGirderKey} is not finite.` };
    }
    return { offset, diagnostic: null };
  }
  const match = /^girder-(\d+)$/.exec(model.mainGirderKey);
  if (!match) {
    return {
      offset: null,
      diagnostic: `mainGirderKey ${model.mainGirderKey} is not a canonical girder-N key.`,
    };
  }
  const index = Number(match[1]);
  const offsets = deriveMainGirderOffsets(context.girderCount, context.girderSpacing);
  if (!offsets || index < 0 || index >= offsets.length) {
    return {
      offset: null,
      diagnostic: `cannot resolve girder offset for ${model.mainGirderKey} with girderCount=${context.girderCount}.`,
    };
  }
  return { offset: offsets[index]!, diagnostic: null };
}

export function deriveHaunchGeometry(
  model: RcDeckHaunchModel,
  context: HaunchGeometryContext,
): HaunchGeometryResult {
  const diagnostics: string[] = [];

  const length = deriveLengthMeters(
    model.startStation,
    model.endStation,
    GEOMETRY_FORMULA_IDS.HAUNCH_LENGTH,
  );
  if (!length.ok) diagnostics.push(length.reason);

  const area =
    model.shapeType === "RECT"
      ? deriveRectAreaMeters2(
          model.topWidth,
          model.height,
          GEOMETRY_FORMULA_IDS.HAUNCH_RECT_AREA,
        )
      : deriveTrapezoidAreaMeters2(model.topWidth, model.bottomWidth, model.height);
  if (!area.ok) diagnostics.push(area.reason);

  if (model.shapeType === "RECT" && Math.abs(model.topWidth - model.bottomWidth) > 1e-12) {
    diagnostics.push("RECT haunch requires topWidth === bottomWidth.");
  }

  const girderY = resolveGirderOffsetY(model, context);
  if (girderY.diagnostic) diagnostics.push(girderY.diagnostic);

  if (diagnostics.length > 0 || !length.ok || !area.ok || girderY.offset === null) {
    return { ok: false, sourceEntityId: model.haunchId, diagnostics };
  }

  const volume = deriveVolumeMeters3(area.value, length.value, GEOMETRY_FORMULA_IDS.HAUNCH_VOLUME);
  if (!volume.ok) {
    return { ok: false, sourceEntityId: model.haunchId, diagnostics: [volume.reason] };
  }

  const weight = deriveTotalWeightKN(
    volume.value,
    context.rcUnitWeightKNPerM3,
    GEOMETRY_FORMULA_IDS.HAUNCH_TOTAL_WEIGHT,
  );

  const topFlangeUpperFaceZ = 0;
  const deckSoffitZ = topFlangeUpperFaceZ + model.height;
  const placement: HaunchPlacement = {
    centerStation: (model.startStation + model.endStation) / 2,
    startStation: model.startStation,
    endStation: model.endStation,
    girderOffsetY: girderY.offset,
    topFlangeUpperFaceZ,
    deckSoffitZ,
    centerZ: topFlangeUpperFaceZ + model.height / 2,
    topWidthM: model.topWidth,
    bottomWidthM: model.bottomWidth,
    heightM: model.height,
  };

  const warnings = [
    "HAUNCH_DATUM: top flange upper face (Z=0) to deck soffit (Z=height); mesh not used (DEC-S4-0009 / DEC-S4C-0002).",
    "LOCAL_CRS: unbound local CRS until Step 4-E binding.",
  ];
  if (!weight.ok) {
    warnings.push("RC_UNIT_WEIGHT_MISSING: volume is available; total weight is NOT_AVAILABLE.");
  }

  return {
    ok: true,
    geometry: {
      sourceEntityId: model.haunchId,
      mainGirderKey: model.mainGirderKey,
      mainGirderRefId: model.mainGirderRefId,
      shapeType: model.shapeType,
      lengthM: length.value,
      areaM2: area.value,
      volumeM3: volume.value,
      unitWeightKNPerM3: context.rcUnitWeightKNPerM3,
      totalWeightKN: weight.ok ? weight.value : null,
      totalWeightStatus: weight.ok ? "USER_PROVIDED_UNVERIFIED" : "NOT_AVAILABLE",
      placement,
      formulaIds: [
        GEOMETRY_FORMULA_IDS.HAUNCH_LENGTH,
        model.shapeType === "RECT"
          ? GEOMETRY_FORMULA_IDS.HAUNCH_RECT_AREA
          : GEOMETRY_FORMULA_IDS.HAUNCH_TRAP_AREA,
        GEOMETRY_FORMULA_IDS.HAUNCH_VOLUME,
        ...(weight.ok ? [GEOMETRY_FORMULA_IDS.HAUNCH_TOTAL_WEIGHT] : []),
      ],
      designAuthorization: "NOT_AUTHORIZED",
      status: "UNVERIFIED_DEVELOPMENT_ONLY",
      provenance: {
        source: "canonical_haunch_model",
        generatedBy: "deriveHaunchGeometry",
        datum: "top_flange_upper_face_to_deck_soffit",
        coordinateFrame: "local_crs_unbound",
      },
      warnings,
    },
  };
}

export function deriveHaunchGeometries(
  models: readonly RcDeckHaunchModel[],
  context: HaunchGeometryContext,
): {
  readonly geometries: readonly HaunchGeometry[];
  readonly failures: readonly HaunchGeometryResult[];
} {
  const sorted = [...models].sort((a, b) => {
    const keyCmp = a.mainGirderKey.localeCompare(b.mainGirderKey);
    return keyCmp !== 0 ? keyCmp : a.haunchId.localeCompare(b.haunchId);
  });
  const geometries: HaunchGeometry[] = [];
  const failures: HaunchGeometryResult[] = [];
  for (const model of sorted) {
    const result = deriveHaunchGeometry(model, context);
    if (result.ok) geometries.push(result.geometry);
    else failures.push(result);
  }
  return { geometries, failures };
}
