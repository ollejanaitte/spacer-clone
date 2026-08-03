/**
 * Step 4-C appurtenance geometry derivation kernel.
 *
 * Source of truth: BridgeAppurtenanceModel (canonical input).
 * Consumers: 3D solids, quantity, loads — must not re-implement area/volume formulas.
 *
 * Coordinate convention (local CRS, Step 4-E unbound):
 * - +X = station increase
 * - +Y = right looking +station (DEC-S4-0007)
 * - +Z = up
 * - Appurtenance Z datum = deck top face (= deckThickness in existing solids convention)
 * - Transverse offset Y = cross-section centerline (DEC-S4C-0001 development-only)
 */

import type { BridgeAppurtenanceModel } from "./appurtenanceTypes";
import {
  GEOMETRY_FORMULA_IDS,
  deriveLengthMeters,
  deriveRectAreaMeters2,
  deriveTotalWeightKN,
  deriveVolumeMeters3,
  type GeometryFormulaId,
} from "./geometryFormulas";

export type AppurtenancePlacement = {
  /** Station midpoint (m). */
  readonly centerStation: number;
  readonly startStation: number;
  readonly endStation: number;
  /** Cross-section centerline Y (m), +Y right. */
  readonly transverseOffset: number;
  /** Deck top face Z (m). */
  readonly deckTopZ: number;
  /** Solid center Z = deckTopZ + height/2. */
  readonly centerZ: number;
};

export type AppurtenanceGeometry = {
  readonly sourceEntityId: string;
  readonly slot: BridgeAppurtenanceModel["slot"];
  readonly type: BridgeAppurtenanceModel["type"];
  readonly side: BridgeAppurtenanceModel["side"];
  readonly lengthM: number;
  readonly areaM2: number;
  readonly volumeM3: number;
  readonly widthM: number;
  readonly heightM: number;
  readonly unitWeightKNPerM3: number | null;
  readonly totalWeightKN: number | null;
  readonly totalWeightStatus: "USER_PROVIDED_UNVERIFIED" | "NOT_AVAILABLE";
  readonly placement: AppurtenancePlacement;
  readonly formulaIds: readonly GeometryFormulaId[];
  readonly designAuthorization: "NOT_AUTHORIZED";
  readonly status: "UNVERIFIED_DEVELOPMENT_ONLY";
  readonly provenance: {
    readonly source: "canonical_appurtenance_model";
    readonly generatedBy: "deriveAppurtenanceGeometry";
    readonly coordinateFrame: "local_crs_unbound";
    readonly offsetAnchor: "cross_section_centerline";
    readonly zDatum: "deck_top_face";
  };
  readonly warnings: readonly string[];
};

export type AppurtenanceGeometryResult =
  | { readonly ok: true; readonly geometry: AppurtenanceGeometry }
  | { readonly ok: false; readonly sourceEntityId: string; readonly diagnostics: readonly string[] };

export type AppurtenanceGeometryContext = {
  readonly deckThicknessM: number;
};

export function deriveAppurtenanceGeometry(
  model: BridgeAppurtenanceModel,
  context: AppurtenanceGeometryContext,
): AppurtenanceGeometryResult {
  const diagnostics: string[] = [];
  if (!(context.deckThicknessM > 0) || !Number.isFinite(context.deckThicknessM)) {
    diagnostics.push("deckThickness must be a finite value > 0.");
  }

  const length = deriveLengthMeters(
    model.startStation,
    model.endStation,
    GEOMETRY_FORMULA_IDS.APP_LENGTH,
  );
  if (!length.ok) diagnostics.push(length.reason);

  const area = deriveRectAreaMeters2(
    model.crossSection.width,
    model.crossSection.height,
    GEOMETRY_FORMULA_IDS.APP_RECT_AREA,
  );
  if (!area.ok) diagnostics.push(area.reason);

  if (diagnostics.length > 0 || !length.ok || !area.ok) {
    return { ok: false, sourceEntityId: model.appurtenanceId, diagnostics };
  }

  const volume = deriveVolumeMeters3(area.value, length.value, GEOMETRY_FORMULA_IDS.APP_VOLUME);
  if (!volume.ok) {
    return {
      ok: false,
      sourceEntityId: model.appurtenanceId,
      diagnostics: [volume.reason],
    };
  }

  const weight = deriveTotalWeightKN(
    volume.value,
    model.unitWeight,
    GEOMETRY_FORMULA_IDS.APP_TOTAL_WEIGHT,
  );

  const deckTopZ = context.deckThicknessM;
  const heightM = model.crossSection.height;
  const placement: AppurtenancePlacement = {
    centerStation: (model.startStation + model.endStation) / 2,
    startStation: model.startStation,
    endStation: model.endStation,
    transverseOffset: model.transverseOffset,
    deckTopZ,
    centerZ: deckTopZ + heightM / 2,
  };

  const warnings = [
    "LOCAL_CRS: transverse placement uses unbound local CRS (+Y=right). Step 4-E binding pending.",
    "OFFSET_ANCHOR: transverseOffset is the cross-section centerline (DEC-S4C-0001 development-only).",
  ];
  if (!weight.ok) {
    warnings.push("UNIT_WEIGHT_MISSING: volume is available; total weight is NOT_AVAILABLE.");
  }

  return {
    ok: true,
    geometry: {
      sourceEntityId: model.appurtenanceId,
      slot: model.slot,
      type: model.type,
      side: model.side,
      lengthM: length.value,
      areaM2: area.value,
      volumeM3: volume.value,
      widthM: model.crossSection.width,
      heightM,
      unitWeightKNPerM3: model.unitWeight,
      totalWeightKN: weight.ok ? weight.value : null,
      totalWeightStatus: weight.ok ? "USER_PROVIDED_UNVERIFIED" : "NOT_AVAILABLE",
      placement,
      formulaIds: [
        GEOMETRY_FORMULA_IDS.APP_LENGTH,
        GEOMETRY_FORMULA_IDS.APP_RECT_AREA,
        GEOMETRY_FORMULA_IDS.APP_VOLUME,
        ...(weight.ok ? [GEOMETRY_FORMULA_IDS.APP_TOTAL_WEIGHT] : []),
      ],
      designAuthorization: "NOT_AUTHORIZED",
      status: "UNVERIFIED_DEVELOPMENT_ONLY",
      provenance: {
        source: "canonical_appurtenance_model",
        generatedBy: "deriveAppurtenanceGeometry",
        coordinateFrame: "local_crs_unbound",
        offsetAnchor: "cross_section_centerline",
        zDatum: "deck_top_face",
      },
      warnings,
    },
  };
}

/**
 * Derive geometries for PROVIDED models only. EXPLICIT_NONE / NOT_PROVIDED are never passed in.
 * Deterministic order by slot then sourceEntityId.
 */
export function deriveAppurtenanceGeometries(
  models: readonly BridgeAppurtenanceModel[],
  context: AppurtenanceGeometryContext,
): {
  readonly geometries: readonly AppurtenanceGeometry[];
  readonly failures: readonly AppurtenanceGeometryResult[];
} {
  const sorted = [...models].sort((a, b) => {
    const slotCmp = a.slot.localeCompare(b.slot);
    return slotCmp !== 0 ? slotCmp : a.appurtenanceId.localeCompare(b.appurtenanceId);
  });
  const geometries: AppurtenanceGeometry[] = [];
  const failures: AppurtenanceGeometryResult[] = [];
  for (const model of sorted) {
    const result = deriveAppurtenanceGeometry(model, context);
    if (result.ok) geometries.push(result.geometry);
    else failures.push(result);
  }
  return { geometries, failures };
}
