/**
 * Step 4-C3 appurtenance / haunch quantity items.
 * Geometry and weight formulas come only from the C1 kernel — no mesh reverse takeoff.
 * RC_DECK body quantities remain separate; haunch must not double-count into QTY-DK-*.
 */

import {
  APPURTENANCE_SLOT_LABELS,
  GEOMETRY_FORMULA_IDS,
  buildBridgeAppurtenanceModels,
  buildRcDeckHaunchModels,
  deriveAppurtenanceGeometries,
  deriveHaunchGeometries,
  type ApolloBridgeStructureInputDraft,
  type AppurtenanceGeometry,
  type HaunchGeometry,
} from "../bridgeStructure";
import type { ProjectModel } from "../../types";
import type { QuantityItem } from "./quantityModel";

function qtyItem(partial: Omit<QuantityItem, "provenance"> & { provenance?: string }): QuantityItem {
  return {
    ...partial,
    provenance:
      partial.provenance ??
      "development QuantityModel; NUMERIC_DESIGN_AUTHORIZATION=NOT_GRANTED; NOT FOR ESTIMATE/DESIGN/CONSTRUCTION",
  };
}

function geometryItemsForAppurtenance(geometry: AppurtenanceGeometry): QuantityItem[] {
  const label = APPURTENANCE_SLOT_LABELS[geometry.slot];
  const idBase = `QTY-APP-${geometry.slot}`;
  const sourceEntityIds = [geometry.sourceEntityId];
  const commonWarnings = [
    "NOT_AUTHORIZED",
    "UNVERIFIED_DEVELOPMENT_ONLY",
    ...geometry.warnings,
  ];
  const items: QuantityItem[] = [
    qtyItem({
      quantityId: `${idBase}-L`,
      category: "APPURTENANCE",
      subcategory: "length",
      label: `${label} 延長`,
      sourceEntityIds,
      calculationBasis: "EXACT_GEOMETRY_DEVELOPMENT",
      formulaId: GEOMETRY_FORMULA_IDS.APP_LENGTH,
      inputRefs: ["startStation", "endStation"],
      value: geometry.lengthM,
      unit: "m",
      precision: 12,
      status: "READY",
      assumptionIds: [],
      warnings: commonWarnings,
    }),
    qtyItem({
      quantityId: `${idBase}-A`,
      category: "APPURTENANCE",
      subcategory: "area",
      label: `${label} 断面積`,
      sourceEntityIds,
      calculationBasis: "EXACT_GEOMETRY_DEVELOPMENT",
      formulaId: GEOMETRY_FORMULA_IDS.APP_RECT_AREA,
      inputRefs: ["width", "height"],
      value: geometry.areaM2,
      unit: "m2",
      precision: 12,
      status: "READY",
      assumptionIds: [],
      warnings: commonWarnings,
    }),
    qtyItem({
      quantityId: `${idBase}-V`,
      category: "APPURTENANCE",
      subcategory: "volume",
      label: `${label} 体積`,
      sourceEntityIds,
      calculationBasis: "EXACT_GEOMETRY_DEVELOPMENT",
      formulaId: GEOMETRY_FORMULA_IDS.APP_VOLUME,
      inputRefs: [`${idBase}-A`, `${idBase}-L`],
      value: geometry.volumeM3,
      unit: "m3",
      precision: 12,
      status: "READY",
      assumptionIds: [],
      warnings: commonWarnings,
    }),
  ];

  if (geometry.unitWeightKNPerM3 !== null) {
    items.push(
      qtyItem({
        quantityId: `${idBase}-GAMMA`,
        category: "APPURTENANCE",
        subcategory: "unit_weight",
        label: `${label} 単位体積重量`,
        sourceEntityIds,
        calculationBasis: "USER_PROVIDED_UNVERIFIED",
        formulaId: "F-S4C-APP-UNIT-WEIGHT-INPUT",
        inputRefs: ["unitWeight"],
        value: geometry.unitWeightKNPerM3,
        unit: "kN/m3",
        precision: 12,
        status: "USER_PROVIDED_UNVERIFIED",
        assumptionIds: ["USER_UNIT_WEIGHT_APPURTENANCE"],
        warnings: [...commonWarnings, "USER_PROVIDED_UNVERIFIED"],
      }),
    );
  }

  items.push(
    qtyItem({
      quantityId: `${idBase}-W`,
      category: "APPURTENANCE",
      subcategory: "weight",
      label: `${label} 総重量`,
      sourceEntityIds,
      calculationBasis:
        geometry.totalWeightKN !== null ? "USER_PROVIDED_UNVERIFIED" : "NOT_AVAILABLE",
      formulaId: GEOMETRY_FORMULA_IDS.APP_TOTAL_WEIGHT,
      inputRefs: [`${idBase}-V`, "unitWeight"],
      value: geometry.totalWeightKN,
      unit: "kN",
      precision: 12,
      status: geometry.totalWeightKN !== null ? "USER_PROVIDED_UNVERIFIED" : "NOT_AVAILABLE",
      assumptionIds: geometry.totalWeightKN !== null ? ["USER_UNIT_WEIGHT_APPURTENANCE"] : [],
      warnings: [
        ...commonWarnings,
        geometry.totalWeightKN !== null
          ? "USER_PROVIDED_UNVERIFIED"
          : "UNIT_WEIGHT_MISSING: volume available; weight NOT_AVAILABLE",
      ],
    }),
  );

  return items;
}

function geometryItemsForHaunch(geometry: HaunchGeometry): QuantityItem[] {
  const idBase = `QTY-HAUNCH-${geometry.mainGirderKey}`;
  const sourceEntityIds = [geometry.sourceEntityId];
  const areaFormula =
    geometry.shapeType === "RECT"
      ? GEOMETRY_FORMULA_IDS.HAUNCH_RECT_AREA
      : GEOMETRY_FORMULA_IDS.HAUNCH_TRAP_AREA;
  const commonWarnings = [
    "NOT_AUTHORIZED",
    "UNVERIFIED_DEVELOPMENT_ONLY",
    "SEPARATE_FROM_RC_DECK_BODY",
    ...geometry.warnings,
  ];
  const items: QuantityItem[] = [
    qtyItem({
      quantityId: `${idBase}-L`,
      category: "RC_HAUNCH",
      subcategory: "length",
      label: `ハンチ ${geometry.mainGirderKey} 延長`,
      sourceEntityIds,
      calculationBasis: "EXACT_GEOMETRY_DEVELOPMENT",
      formulaId: GEOMETRY_FORMULA_IDS.HAUNCH_LENGTH,
      inputRefs: ["startStation", "endStation"],
      value: geometry.lengthM,
      unit: "m",
      precision: 12,
      status: "READY",
      assumptionIds: [],
      warnings: commonWarnings,
    }),
    qtyItem({
      quantityId: `${idBase}-A`,
      category: "RC_HAUNCH",
      subcategory: "area",
      label: `ハンチ ${geometry.mainGirderKey} 断面積`,
      sourceEntityIds,
      calculationBasis: "EXACT_GEOMETRY_DEVELOPMENT",
      formulaId: areaFormula,
      inputRefs: ["topWidth", "bottomWidth", "height"],
      value: geometry.areaM2,
      unit: "m2",
      precision: 12,
      status: "READY",
      assumptionIds: [],
      warnings: commonWarnings,
    }),
    qtyItem({
      quantityId: `${idBase}-V`,
      category: "RC_HAUNCH",
      subcategory: "volume",
      label: `ハンチ ${geometry.mainGirderKey} 体積`,
      sourceEntityIds,
      calculationBasis: "EXACT_GEOMETRY_DEVELOPMENT",
      formulaId: GEOMETRY_FORMULA_IDS.HAUNCH_VOLUME,
      inputRefs: [`${idBase}-A`, `${idBase}-L`],
      value: geometry.volumeM3,
      unit: "m3",
      precision: 12,
      status: "READY",
      assumptionIds: [],
      warnings: commonWarnings,
    }),
  ];

  if (geometry.unitWeightKNPerM3 !== null) {
    items.push(
      qtyItem({
        quantityId: `${idBase}-GAMMA`,
        category: "RC_HAUNCH",
        subcategory: "unit_weight",
        label: `ハンチ ${geometry.mainGirderKey} 単位体積重量`,
        sourceEntityIds,
        calculationBasis: "USER_PROVIDED_UNVERIFIED",
        formulaId: "F-S4C-HAUNCH-UNIT-WEIGHT-INPUT",
        inputRefs: ["rcUnitWeight"],
        value: geometry.unitWeightKNPerM3,
        unit: "kN/m3",
        precision: 12,
        status: "USER_PROVIDED_UNVERIFIED",
        assumptionIds: ["USER_UNIT_WEIGHT_RC"],
        warnings: [...commonWarnings, "USER_PROVIDED_UNVERIFIED"],
      }),
    );
  }

  items.push(
    qtyItem({
      quantityId: `${idBase}-W`,
      category: "RC_HAUNCH",
      subcategory: "weight",
      label: `ハンチ ${geometry.mainGirderKey} 総重量`,
      sourceEntityIds,
      calculationBasis:
        geometry.totalWeightKN !== null ? "USER_PROVIDED_UNVERIFIED" : "NOT_AVAILABLE",
      formulaId: GEOMETRY_FORMULA_IDS.HAUNCH_TOTAL_WEIGHT,
      inputRefs: [`${idBase}-V`, "rcUnitWeight"],
      value: geometry.totalWeightKN,
      unit: "kN",
      precision: 12,
      status: geometry.totalWeightKN !== null ? "USER_PROVIDED_UNVERIFIED" : "NOT_AVAILABLE",
      assumptionIds: geometry.totalWeightKN !== null ? ["USER_UNIT_WEIGHT_RC"] : [],
      warnings: [
        ...commonWarnings,
        geometry.totalWeightKN !== null
          ? "USER_PROVIDED_UNVERIFIED"
          : "RC_UNIT_WEIGHT_MISSING: volume available; weight NOT_AVAILABLE",
      ],
    }),
  );

  return items;
}

/**
 * Append APPURTENANCE / RC_HAUNCH quantity items derived from canonical models.
 * EXPLICIT_NONE / NOT_PROVIDED invent nothing. Does not mutate RC_DECK body totals.
 */
export function buildAppurtenanceHaunchQuantityItems(
  project: ProjectModel,
  draft: ApolloBridgeStructureInputDraft,
): QuantityItem[] {
  if (
    draft.deckThickness === null ||
    draft.girderCount === null ||
    draft.girderSpacing === null ||
    draft.bridgeLength === null ||
    draft.width === null
  ) {
    return [];
  }

  const items: QuantityItem[] = [];
  const projectScopeId = project.project.id;

  const appModels = buildBridgeAppurtenanceModels(draft.appurtenanceConfiguration, {
    bridgeLength: draft.bridgeLength,
    width: draft.width,
    projectScopeId,
  });
  if (appModels.complete && appModels.models.length > 0) {
    const derived = deriveAppurtenanceGeometries(appModels.models, {
      deckThicknessM: draft.deckThickness,
    });
    let volumeTotal = 0;
    let weightTotal = 0;
    let weightComplete = true;
    for (const geometry of derived.geometries) {
      items.push(...geometryItemsForAppurtenance(geometry));
      volumeTotal += geometry.volumeM3;
      if (geometry.totalWeightKN === null) weightComplete = false;
      else weightTotal += geometry.totalWeightKN;
    }
    if (derived.geometries.length > 0) {
      items.push(
        qtyItem({
          quantityId: "QTY-APP-TOTAL-V",
          category: "APPURTENANCE",
          subcategory: "volume_total",
          label: "付属物体積合計",
          sourceEntityIds: derived.geometries.map((g) => g.sourceEntityId),
          calculationBasis: "EXACT_GEOMETRY_DEVELOPMENT",
          formulaId: "F-S4C-APP-VOLUME-SUM",
          inputRefs: derived.geometries.map((g) => `QTY-APP-${g.slot}-V`),
          value: volumeTotal,
          unit: "m3",
          precision: 12,
          status: "READY",
          assumptionIds: [],
          warnings: ["NOT_AUTHORIZED", "Does not include RC deck body volume"],
        }),
        qtyItem({
          quantityId: "QTY-APP-TOTAL-W",
          category: "APPURTENANCE",
          subcategory: "weight_total",
          label: "付属物重量合計",
          sourceEntityIds: derived.geometries.map((g) => g.sourceEntityId),
          calculationBasis: weightComplete ? "USER_PROVIDED_UNVERIFIED" : "NOT_AVAILABLE",
          formulaId: "F-S4C-APP-TOTAL-WEIGHT-SUM",
          inputRefs: derived.geometries.map((g) => `QTY-APP-${g.slot}-W`),
          value: weightComplete ? weightTotal : null,
          unit: "kN",
          precision: 12,
          status: weightComplete ? "USER_PROVIDED_UNVERIFIED" : "NOT_AVAILABLE",
          assumptionIds: weightComplete ? ["USER_UNIT_WEIGHT_APPURTENANCE"] : [],
          warnings: [
            "NOT_AUTHORIZED",
            weightComplete
              ? "USER_PROVIDED_UNVERIFIED"
              : "One or more appurtenance unit weights missing",
          ],
        }),
      );
    }
  }

  const haunchModels = buildRcDeckHaunchModels(draft.haunchConfiguration, {
    bridgeLength: draft.bridgeLength,
    girderCount: draft.girderCount,
    projectScopeId,
  });
  if (haunchModels.complete && haunchModels.models.length > 0) {
    const derived = deriveHaunchGeometries(haunchModels.models, {
      girderCount: draft.girderCount,
      girderSpacing: draft.girderSpacing,
      rcUnitWeightKNPerM3: draft.rcUnitWeight,
    });
    let volumeTotal = 0;
    let weightTotal = 0;
    let weightComplete = true;
    for (const geometry of derived.geometries) {
      items.push(...geometryItemsForHaunch(geometry));
      volumeTotal += geometry.volumeM3;
      if (geometry.totalWeightKN === null) weightComplete = false;
      else weightTotal += geometry.totalWeightKN;
    }
    if (derived.geometries.length > 0) {
      items.push(
        qtyItem({
          quantityId: "QTY-HAUNCH-TOTAL-V",
          category: "RC_HAUNCH",
          subcategory: "volume_total",
          label: "ハンチ体積合計",
          sourceEntityIds: derived.geometries.map((g) => g.sourceEntityId),
          calculationBasis: "EXACT_GEOMETRY_DEVELOPMENT",
          formulaId: "F-S4C-HAUNCH-VOLUME-SUM",
          inputRefs: derived.geometries.map((g) => `QTY-HAUNCH-${g.mainGirderKey}-V`),
          value: volumeTotal,
          unit: "m3",
          precision: 12,
          status: "READY",
          assumptionIds: [],
          warnings: [
            "NOT_AUTHORIZED",
            "SEPARATE_FROM_RC_DECK_BODY",
            "Not added into QTY-DK-VOL / QTY-DK-W",
          ],
        }),
        qtyItem({
          quantityId: "QTY-HAUNCH-TOTAL-W",
          category: "RC_HAUNCH",
          subcategory: "weight_total",
          label: "ハンチ重量合計",
          sourceEntityIds: derived.geometries.map((g) => g.sourceEntityId),
          calculationBasis: weightComplete ? "USER_PROVIDED_UNVERIFIED" : "NOT_AVAILABLE",
          formulaId: "F-S4C-HAUNCH-TOTAL-WEIGHT-SUM",
          inputRefs: derived.geometries.map((g) => `QTY-HAUNCH-${g.mainGirderKey}-W`),
          value: weightComplete ? weightTotal : null,
          unit: "kN",
          precision: 12,
          status: weightComplete ? "USER_PROVIDED_UNVERIFIED" : "NOT_AVAILABLE",
          assumptionIds: weightComplete ? ["USER_UNIT_WEIGHT_RC"] : [],
          warnings: [
            "NOT_AUTHORIZED",
            "SEPARATE_FROM_RC_DECK_BODY",
            weightComplete
              ? "USER_PROVIDED_UNVERIFIED"
              : "rcUnitWeight missing; haunch weight NOT_AVAILABLE",
          ],
        }),
      );
    }
  }

  return items.sort((a, b) => a.quantityId.localeCompare(b.quantityId));
}
