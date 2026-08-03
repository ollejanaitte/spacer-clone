/**
 * Structured development QuantityModel for Apollo Step 2-A.
 * UNVERIFIED DEVELOPMENT ONLY — NOT FOR DESIGN OR CONSTRUCTION.
 * NUMERIC_DESIGN_AUTHORIZATION: NOT_GRANTED
 *
 * Separates EXACT_GEOMETRY_DEVELOPMENT from APPROXIMATE_VISUALIZATION_ASSUMPTION
 * and USER_PROVIDED_UNVERIFIED weights. Does not claim formal quantity takeoff.
 */

import { BridgeSystem, resolveEffectiveLayout, sumSpanLengths, validateBridgeLayoutContract } from "../contracts";
import type { ApolloBridgeStructureInputDraft } from "../bridgeStructure/types";
import { computeContentChecksum } from "../../contracts/legacy/checksum";
import type { ProjectModel } from "../../types";
import { getBridgeStructureInputDraft, isBridgeStructureGenerationCurrent } from "../bridgeStructure/generateBsdd";
import { buildAppurtenanceHaunchQuantityItems } from "./appurtenanceHaunchQuantities";

export const QUANTITY_MODEL_SCHEMA_VERSION = "1.1.0-development";

export type QuantityCalculationBasis =
  | "EXACT_GEOMETRY_DEVELOPMENT"
  | "USER_PROVIDED_UNVERIFIED"
  | "APPROXIMATE_VISUALIZATION_ASSUMPTION"
  | "INCOMPLETE_INPUT"
  | "NOT_AVAILABLE"
  | "DEVELOPMENT_GEOMETRIC_SURFACE_ESTIMATE"
  | "NOT_AUTHORIZED";

export type QuantityCategory =
  | "MAIN_GIRDER"
  | "RC_DECK"
  | "RC_HAUNCH"
  | "APPURTENANCE"
  | "PAVEMENT"
  | "CROSS_BEAM"
  | "STIFFENER"
  | "SWAY_BRACING"
  | "LOWER_LATERAL_BRACING"
  | "UPPER_LATERAL_BRACING"
  | "PAINT_AREA"
  | "SUMMARY";

export type QuantityItemStatus =
  | "READY"
  | "STALE"
  | "INCOMPLETE"
  | "NOT_AVAILABLE"
  | "BLOCKED"
  | "USER_PROVIDED_UNVERIFIED"
  | "NOT_AUTHORIZED";

export type QuantityItem = {
  readonly quantityId: string;
  readonly category: QuantityCategory;
  readonly subcategory: string;
  readonly label: string;
  readonly sourceEntityIds: readonly string[];
  readonly calculationBasis: QuantityCalculationBasis;
  readonly formulaId: string;
  readonly inputRefs: readonly string[];
  readonly value: number | null;
  readonly unit: string;
  readonly precision: number;
  readonly status: QuantityItemStatus;
  readonly assumptionIds: readonly string[];
  readonly warnings: readonly string[];
  readonly provenance: string;
};

export type QuantityModel = {
  readonly schemaVersion: typeof QUANTITY_MODEL_SCHEMA_VERSION;
  readonly quantityModelId: string;
  readonly projectId: string;
  readonly inputRevision: string;
  readonly inputChecksum: string;
  readonly generatedAt: string;
  readonly developmentLabel: "UNVERIFIED_DEVELOPMENT_ONLY";
  readonly authorizationStatus: "NOT_GRANTED";
  readonly designOrConstructionUse: "PROHIBITED";
  readonly stale: boolean;
  readonly warnings: readonly string[];
  readonly items: readonly QuantityItem[];
};

type Resolved = {
  readonly spanLength: number;
  readonly bridgeLength: number;
  readonly width: number;
  readonly girderCount: number;
  readonly girderSpacing: number;
  readonly girderDepth: number;
  readonly topFlangeWidth: number;
  readonly topFlangeThickness: number;
  readonly bottomFlangeWidth: number;
  readonly bottomFlangeThickness: number;
  readonly webThickness: number;
  readonly deckThickness: number;
  readonly crossBeamSpacing: number;
  readonly stiffenerSpacing: number | null;
  readonly swayBracingInterval: number | null;
  readonly steelUnitWeight: number | null;
  readonly rcUnitWeight: number | null;
  readonly lateralBracingEnabled: boolean;
  readonly upperLateralBracingEnabled: boolean;
  readonly spanCount: number;
};

function resolveDraft(draft: ApolloBridgeStructureInputDraft): Resolved | null {
  const layout = resolveEffectiveLayout({
    bridgeSystem: draft.bridgeSystem,
    spanLength: draft.spanLength,
    spans: draft.spans,
    supports: draft.supports,
  });
  const required = [
    draft.bridgeLength,
    draft.width,
    draft.girderCount,
    draft.girderSpacing,
    draft.girderDepth,
    draft.topFlangeWidth,
    draft.topFlangeThickness,
    draft.bottomFlangeWidth,
    draft.bottomFlangeThickness,
    draft.webThickness,
    draft.deckThickness,
    draft.crossBeamSpacing,
  ];
  if (required.some((v) => v === null)) return null;
  let spanLength = draft.spanLength;
  if (spanLength === null) {
    if (draft.bridgeSystem === BridgeSystem.CONTINUOUS && layout && layout.spans.length > 0) {
      spanLength = sumSpanLengths(layout.spans) / layout.spans.length;
    } else {
      return null;
    }
  }
  const spanCount = layout?.spans.length ?? null;
  if (spanCount === null || spanCount < 1) return null;
  return {
    spanLength,
    bridgeLength: draft.bridgeLength!,
    width: draft.width!,
    girderCount: draft.girderCount!,
    girderSpacing: draft.girderSpacing!,
    girderDepth: draft.girderDepth!,
    topFlangeWidth: draft.topFlangeWidth!,
    topFlangeThickness: draft.topFlangeThickness!,
    bottomFlangeWidth: draft.bottomFlangeWidth!,
    bottomFlangeThickness: draft.bottomFlangeThickness!,
    webThickness: draft.webThickness!,
    deckThickness: draft.deckThickness!,
    crossBeamSpacing: draft.crossBeamSpacing!,
    stiffenerSpacing: draft.stiffenerSpacing,
    swayBracingInterval: draft.swayBracingInterval,
    steelUnitWeight: draft.steelUnitWeight,
    rcUnitWeight: draft.rcUnitWeight,
    lateralBracingEnabled: draft.lateralBracingEnabled,
    upperLateralBracingEnabled: draft.upperLateralBracingEnabled,
    spanCount,
  };
}

function item(partial: Omit<QuantityItem, "provenance"> & { provenance?: string }): QuantityItem {
  return {
    ...partial,
    provenance:
      partial.provenance ??
      "development QuantityModel; NUMERIC_DESIGN_AUTHORIZATION=NOT_GRANTED; NOT FOR ESTIMATE/DESIGN/CONSTRUCTION",
  };
}

export function buildInputChecksum(draft: ApolloBridgeStructureInputDraft): string {
  const payload = {
    schemaVersion: draft.schemaVersion,
    bridgeSystem: draft.bridgeSystem,
    spanLength: draft.spanLength,
    bridgeLength: draft.bridgeLength,
    width: draft.width,
    girderCount: draft.girderCount,
    girderSpacing: draft.girderSpacing,
    girderDepth: draft.girderDepth,
    topFlangeWidth: draft.topFlangeWidth,
    topFlangeThickness: draft.topFlangeThickness,
    bottomFlangeWidth: draft.bottomFlangeWidth,
    bottomFlangeThickness: draft.bottomFlangeThickness,
    webThickness: draft.webThickness,
    deckThickness: draft.deckThickness,
    crossBeamSpacing: draft.crossBeamSpacing,
    stiffenerSpacing: draft.stiffenerSpacing,
    swayBracingInterval: draft.swayBracingInterval,
    steelUnitWeight: draft.steelUnitWeight,
    rcUnitWeight: draft.rcUnitWeight,
    lateralBracingEnabled: draft.lateralBracingEnabled,
    upperLateralBracingEnabled: draft.upperLateralBracingEnabled,
    spans: draft.spans,
    supports: draft.supports,
    appurtenanceConfiguration: draft.appurtenanceConfiguration,
    haunchConfiguration: {
      girders: [...draft.haunchConfiguration.girders].sort((a, b) =>
        a.mainGirderKey.localeCompare(b.mainGirderKey),
      ),
    },
  };
  return computeContentChecksum(payload).hexDigest;
}

export function buildInputRevision(draft: ApolloBridgeStructureInputDraft): string {
  return draft.generatedAt ?? "STALE_OR_UNGENERATED";
}

function computeItems(resolved: Resolved): QuantityItem[] {
  const webHeight = resolved.girderDepth - resolved.topFlangeThickness - resolved.bottomFlangeThickness;
  const exactOk = webHeight > 0;
  const aTf = resolved.topFlangeWidth * resolved.topFlangeThickness;
  const aBf = resolved.bottomFlangeWidth * resolved.bottomFlangeThickness;
  const aW = resolved.webThickness * webHeight;
  const aTot = aTf + aBf + aW;
  const L = resolved.bridgeLength;
  const n = resolved.girderCount;
  const vTf1 = aTf * L;
  const vBf1 = aBf * L;
  const vW1 = aW * L;
  const v1 = aTot * L;
  const deckArea = resolved.width * L;
  const deckVol = deckArea * resolved.deckThickness;
  const crossBeamCount = Math.floor(L / resolved.crossBeamSpacing) + 1;
  const overhang = (resolved.width - (n - 1) * resolved.girderSpacing) / 2;

  const paintPerGirder =
    (resolved.bottomFlangeWidth +
      2 * webHeight +
      2 * resolved.topFlangeThickness +
      2 * resolved.bottomFlangeThickness +
      (resolved.topFlangeWidth - resolved.webThickness) +
      (resolved.bottomFlangeWidth - resolved.webThickness)) *
    L;
  const paintAll = paintPerGirder * n;

  const items: QuantityItem[] = [];

  const pushExact = (
    quantityId: string,
    category: QuantityCategory,
    subcategory: string,
    label: string,
    formulaId: string,
    inputRefs: readonly string[],
    value: number | null,
    unit: string,
    warnings: readonly string[] = [],
  ) => {
    items.push(
      item({
        quantityId,
        category,
        subcategory,
        label,
        sourceEntityIds: ["bridgeStructureInput"],
        calculationBasis: exactOk ? "EXACT_GEOMETRY_DEVELOPMENT" : "INCOMPLETE_INPUT",
        formulaId,
        inputRefs,
        value: exactOk ? value : null,
        unit,
        precision: 12,
        status: exactOk ? "READY" : "INCOMPLETE",
        assumptionIds: [],
        warnings: exactOk ? warnings : ["webHeight invalid; exact geometry blocked"],
      }),
    );
  };

  pushExact("QTY-MG-ATF", "MAIN_GIRDER", "area", "上フランジ断面積", "F-QTY-ATF", ["topFlangeWidth", "topFlangeThickness"], aTf, "m2");
  pushExact("QTY-MG-AW", "MAIN_GIRDER", "area", "ウェブ断面積", "F-QTY-AW", ["webThickness", "webHeight"], aW, "m2");
  pushExact("QTY-MG-ABF", "MAIN_GIRDER", "area", "下フランジ断面積", "F-QTY-ABF", ["bottomFlangeWidth", "bottomFlangeThickness"], aBf, "m2");
  pushExact("QTY-MG-VTF1", "MAIN_GIRDER", "volume", "主桁1本の上フランジ体積", "F-QTY-VTF1", ["QTY-MG-ATF", "bridgeLength"], vTf1, "m3");
  pushExact("QTY-MG-VW1", "MAIN_GIRDER", "volume", "主桁1本のウェブ体積", "F-QTY-VW1", ["QTY-MG-AW", "bridgeLength"], vW1, "m3");
  pushExact("QTY-MG-VBF1", "MAIN_GIRDER", "volume", "主桁1本の下フランジ体積", "F-QTY-VBF1", ["QTY-MG-ABF", "bridgeLength"], vBf1, "m3");
  pushExact("QTY-MG-V1", "MAIN_GIRDER", "volume", "主桁1本の全鋼体積", "F-QTY-V1", ["totalSectionArea", "bridgeLength"], v1, "m3");
  pushExact("QTY-MG-VTF", "MAIN_GIRDER", "volume", "全主桁の上フランジ体積", "F-QTY-VTF", ["QTY-MG-VTF1", "girderCount"], vTf1 * n, "m3");
  pushExact("QTY-MG-VW", "MAIN_GIRDER", "volume", "全主桁のウェブ体積", "F-QTY-VW", ["QTY-MG-VW1", "girderCount"], vW1 * n, "m3");
  pushExact("QTY-MG-VBF", "MAIN_GIRDER", "volume", "全主桁の下フランジ体積", "F-QTY-VBF", ["QTY-MG-VBF1", "girderCount"], vBf1 * n, "m3");
  pushExact(
    "QTY-MG-VALL",
    "MAIN_GIRDER",
    "volume",
    "全主桁の全鋼体積",
    "F-QTY-VALL",
    ["QTY-MG-V1", "girderCount"],
    v1 * n,
    "m3",
    ["主桁本体のみ。補剛材・対傾構・横構・横桁は含まない。"],
  );

  pushExact("QTY-DK-AREA", "RC_DECK", "area", "床版面積", "F-QTY-DK-A", ["width", "bridgeLength"], deckArea, "m2");
  pushExact("QTY-DK-VOL", "RC_DECK", "volume", "RC床版体積", "F-QTY-DK-V", ["QTY-DK-AREA", "deckThickness"], deckVol, "m3");

  items.push(
    item({
      quantityId: "QTY-SUM-SPAN",
      category: "SUMMARY",
      subcategory: "count",
      label: "支間数",
      sourceEntityIds: ["layout"],
      calculationBasis: "EXACT_GEOMETRY_DEVELOPMENT",
      formulaId: "F-QTY-SPAN-N",
      inputRefs: ["spans", "bridgeSystem"],
      value: resolved.spanCount,
      unit: "count",
      precision: 0,
      status: "READY",
      assumptionIds: [],
      warnings: [],
    }),
    item({
      quantityId: "QTY-SUM-GIRDER-N",
      category: "SUMMARY",
      subcategory: "count",
      label: "主桁本数",
      sourceEntityIds: ["bridgeStructureInput"],
      calculationBasis: "EXACT_GEOMETRY_DEVELOPMENT",
      formulaId: "F-QTY-GIRDER-N",
      inputRefs: ["girderCount"],
      value: n,
      unit: "count",
      precision: 0,
      status: "READY",
      assumptionIds: [],
      warnings: [],
    }),
    item({
      quantityId: "QTY-XB-N",
      category: "CROSS_BEAM",
      subcategory: "count",
      label: "横桁本数",
      sourceEntityIds: ["bridgeStructureInput"],
      calculationBasis: "EXACT_GEOMETRY_DEVELOPMENT",
      formulaId: "F-QTY-XB-N",
      inputRefs: ["bridgeLength", "crossBeamSpacing"],
      value: crossBeamCount,
      unit: "count",
      precision: 0,
      status: "READY",
      assumptionIds: [],
      warnings: ["位置数は floor(L/spacing)+1。横桁断面寸法は未入力のため詳細鋼体積なし。"],
    }),
  );

  if (resolved.stiffenerSpacing === null) {
    items.push(
      item({
        quantityId: "QTY-ST-N",
        category: "STIFFENER",
        subcategory: "count",
        label: "補剛材本数",
        sourceEntityIds: ["bridgeStructureInput"],
        calculationBasis: "INCOMPLETE_INPUT",
        formulaId: "F-QTY-ST-N",
        inputRefs: ["stiffenerSpacing"],
        value: null,
        unit: "count",
        precision: 0,
        status: "NOT_AVAILABLE",
        assumptionIds: [],
        warnings: ["補剛材間隔未設定"],
      }),
    );
  } else {
    const stiffenerCount = (Math.floor(L / resolved.stiffenerSpacing) + 1) * n;
    items.push(
      item({
        quantityId: "QTY-ST-N",
        category: "STIFFENER",
        subcategory: "count",
        label: "補剛材本数",
        sourceEntityIds: ["bridgeStructureInput"],
        calculationBasis: "EXACT_GEOMETRY_DEVELOPMENT",
        formulaId: "F-QTY-ST-N",
        inputRefs: ["stiffenerSpacing", "bridgeLength", "girderCount"],
        value: stiffenerCount,
        unit: "count",
        precision: 0,
        status: "READY",
        assumptionIds: [],
        warnings: ["本数のみ。補剛材幅の詳細寸法がないため詳細鋼体積は出さない。"],
      }),
    );
  }

  if (resolved.swayBracingInterval === null) {
    items.push(
      item({
        quantityId: "QTY-SW-N",
        category: "SWAY_BRACING",
        subcategory: "count",
        label: "対傾構箇所数",
        sourceEntityIds: ["bridgeStructureInput"],
        calculationBasis: "INCOMPLETE_INPUT",
        formulaId: "F-QTY-SW-N",
        inputRefs: ["swayBracingInterval"],
        value: null,
        unit: "count",
        precision: 0,
        status: "NOT_AVAILABLE",
        assumptionIds: [],
        warnings: ["対傾構間隔未設定"],
      }),
    );
  } else {
    let sway = 0;
    for (let index = 1; index <= crossBeamCount - 2; index += 1) {
      if (index % resolved.swayBracingInterval === 0) sway += 1;
    }
    items.push(
      item({
        quantityId: "QTY-SW-N",
        category: "SWAY_BRACING",
        subcategory: "count",
        label: "対傾構箇所数",
        sourceEntityIds: ["bridgeStructureInput"],
        calculationBasis: "EXACT_GEOMETRY_DEVELOPMENT",
        formulaId: "F-QTY-SW-N",
        inputRefs: ["swayBracingInterval", "crossBeamSpacing"],
        value: sway,
        unit: "count",
        precision: 0,
        status: "READY",
        assumptionIds: [],
        warnings: ["箇所数のみ。部材断面未入力のため詳細鋼体積なし。"],
      }),
    );
  }

  items.push(
    item({
      quantityId: "QTY-LB-LOWER",
      category: "LOWER_LATERAL_BRACING",
      subcategory: "flag",
      label: "下横構有無",
      sourceEntityIds: ["bridgeStructureInput"],
      calculationBasis: "EXACT_GEOMETRY_DEVELOPMENT",
      formulaId: "F-QTY-LB-L",
      inputRefs: ["lateralBracingEnabled"],
      value: resolved.lateralBracingEnabled ? 1 : 0,
      unit: "flag",
      precision: 0,
      status: "READY",
      assumptionIds: [],
      warnings: ["有無フラグのみ。詳細鋼体積なし。"],
    }),
    item({
      quantityId: "QTY-LB-UPPER",
      category: "UPPER_LATERAL_BRACING",
      subcategory: "flag",
      label: "上横構有無",
      sourceEntityIds: ["bridgeStructureInput"],
      calculationBasis: "EXACT_GEOMETRY_DEVELOPMENT",
      formulaId: "F-QTY-LB-U",
      inputRefs: ["upperLateralBracingEnabled"],
      value: resolved.upperLateralBracingEnabled ? 1 : 0,
      unit: "flag",
      precision: 0,
      status: "READY",
      assumptionIds: [],
      warnings: ["有無フラグのみ。詳細鋼体積なし。"],
    }),
  );

  const hasSteel = resolved.steelUnitWeight !== null;
  items.push(
    item({
      quantityId: "QTY-MG-W",
      category: "MAIN_GIRDER",
      subcategory: "weight",
      label: "主桁重量（ユーザー単位重量）",
      sourceEntityIds: ["bridgeStructureInput"],
      calculationBasis: hasSteel ? "USER_PROVIDED_UNVERIFIED" : "INCOMPLETE_INPUT",
      formulaId: "F-QTY-MG-W",
      inputRefs: ["QTY-MG-VALL", "steelUnitWeight"],
      value: hasSteel && exactOk ? v1 * n * resolved.steelUnitWeight! : null,
      unit: "kN",
      precision: 12,
      status: hasSteel && exactOk ? "USER_PROVIDED_UNVERIFIED" : "NOT_AVAILABLE",
      assumptionIds: hasSteel ? ["USER_UNIT_WEIGHT_STEEL"] : [],
      warnings: [
        "USER_PROVIDED_UNVERIFIED",
        "NOT_FOR_FORMAL_QUANTITY",
        hasSteel ? "単位重量はユーザー入力（正式採択なし）" : "鋼単位重量未設定",
      ],
    }),
  );

  const hasRc = resolved.rcUnitWeight !== null;
  items.push(
    item({
      quantityId: "QTY-DK-W",
      category: "RC_DECK",
      subcategory: "weight",
      label: "RC床版重量（ユーザー単位重量）",
      sourceEntityIds: ["bridgeStructureInput"],
      calculationBasis: hasRc ? "USER_PROVIDED_UNVERIFIED" : "INCOMPLETE_INPUT",
      formulaId: "F-QTY-DK-W",
      inputRefs: ["QTY-DK-VOL", "rcUnitWeight"],
      value: hasRc ? deckVol * resolved.rcUnitWeight! : null,
      unit: "kN",
      precision: 12,
      status: hasRc ? "USER_PROVIDED_UNVERIFIED" : "NOT_AVAILABLE",
      assumptionIds: hasRc ? ["USER_UNIT_WEIGHT_RC"] : [],
      warnings: [
        "USER_PROVIDED_UNVERIFIED",
        "NOT_FOR_FORMAL_QUANTITY",
        hasRc ? "単位重量はユーザー入力（正式採択なし）" : "RC単位重量未設定",
      ],
    }),
  );

  items.push(
    item({
      quantityId: "QTY-PV-VOL",
      category: "PAVEMENT",
      subcategory: "volume",
      label: "舗装体積",
      sourceEntityIds: [],
      calculationBasis: "INCOMPLETE_INPUT",
      formulaId: "F-QTY-PV-V",
      inputRefs: ["pavementThickness", "pavementWidth"],
      value: null,
      unit: "m3",
      precision: 12,
      status: "NOT_AVAILABLE",
      assumptionIds: [],
      warnings: ["canonical schemaに舗装入力がないため算出せず補完しない"],
    }),
    item({
      quantityId: "QTY-PAINT-GEOM",
      category: "PAINT_AREA",
      subcategory: "area",
      label: "塗装面積（幾何推定・開発）",
      sourceEntityIds: ["bridgeStructureInput"],
      calculationBasis: "DEVELOPMENT_GEOMETRIC_SURFACE_ESTIMATE",
      formulaId: "F-QTY-PAINT-GEOM",
      inputRefs: ["flange", "web", "bridgeLength", "girderCount"],
      value: exactOk && overhang >= 0 ? paintAll : null,
      unit: "m2",
      precision: 12,
      status: exactOk && overhang >= 0 ? "READY" : "BLOCKED",
      assumptionIds: ["PAINT-GEOM-I-EXPOSED-NO-CONTACT-COEFF"],
      warnings: [
        "DEVELOPMENT_GEOMETRIC_SURFACE_ESTIMATE",
        "正式塗装数量ではない",
        "接触面・添接・補剛材・マスキング・塗装系係数は含まない",
      ],
    }),
  );

  // Isolated approximate secondary volumes (visualization assumptions) — not detailed steel.
  const STIFFENER_PLATE_WIDTH_M = 0.15;
  const BRACING_MEMBER_DIAMETER_M = 0.08;
  if (resolved.stiffenerSpacing !== null && exactOk) {
    const stiffenerCount = (Math.floor(L / resolved.stiffenerSpacing) + 1) * n;
    const approxVol = stiffenerCount * webHeight * STIFFENER_PLATE_WIDTH_M * resolved.webThickness;
    items.push(
      item({
        quantityId: "QTY-ST-V-APPROX",
        category: "STIFFENER",
        subcategory: "volume_approx",
        label: "補剛材体積（可視化仮定・概算）",
        sourceEntityIds: ["bridgeStructureInput"],
        calculationBasis: "APPROXIMATE_VISUALIZATION_ASSUMPTION",
        formulaId: "F-QTY-ST-V-APPROX",
        inputRefs: ["stiffenerSpacing", "ASSUMPTION:stiffenerPlateWidth=0.15"],
        value: approxVol,
        unit: "m3",
        precision: 12,
        status: "READY",
        assumptionIds: ["STIFFENER_PLATE_WIDTH_M=0.15"],
        warnings: ["APPROXIMATE_VISUALIZATION_ASSUMPTION", "詳細鋼重ではない", "詳細数量表と分離"],
      }),
    );
  }

  if (resolved.swayBracingInterval !== null && n >= 2 && exactOk) {
    let sway = 0;
    for (let index = 1; index <= crossBeamCount - 2; index += 1) {
      if (index % resolved.swayBracingInterval === 0) sway += 1;
    }
    const height = resolved.girderDepth - resolved.topFlangeThickness / 2 - resolved.bottomFlangeThickness / 2;
    const diagonalLength = Math.sqrt((resolved.girderSpacing / 2) ** 2 + height ** 2);
    const memberArea = Math.PI * (BRACING_MEMBER_DIAMETER_M / 2) ** 2;
    const approxVol = sway * (n - 1) * 2 * memberArea * diagonalLength;
    items.push(
      item({
        quantityId: "QTY-SW-V-APPROX",
        category: "SWAY_BRACING",
        subcategory: "volume_approx",
        label: "対傾構体積（可視化仮定・概算）",
        sourceEntityIds: ["bridgeStructureInput"],
        calculationBasis: "APPROXIMATE_VISUALIZATION_ASSUMPTION",
        formulaId: "F-QTY-SW-V-APPROX",
        inputRefs: ["ASSUMPTION:bracingDiameter=0.08"],
        value: approxVol,
        unit: "m3",
        precision: 12,
        status: "READY",
        assumptionIds: ["BRACING_MEMBER_DIAMETER_M=0.08"],
        warnings: ["APPROXIMATE_VISUALIZATION_ASSUMPTION", "詳細鋼重ではない"],
      }),
    );
  }

  items.push(
    item({
      quantityId: "QTY-SUM-OVERHANG",
      category: "SUMMARY",
      subcategory: "geometry",
      label: "左右張出し",
      sourceEntityIds: ["bridgeStructureInput"],
      calculationBasis: overhang >= 0 ? "EXACT_GEOMETRY_DEVELOPMENT" : "INCOMPLETE_INPUT",
      formulaId: "F-QTY-OVERHANG",
      inputRefs: ["width", "girderCount", "girderSpacing"],
      value: overhang >= 0 ? overhang : null,
      unit: "m",
      precision: 12,
      status: overhang >= 0 ? "READY" : "BLOCKED",
      assumptionIds: [],
      warnings: overhang >= 0 ? [] : ["overhang < 0 — layout fail-closed"],
    }),
  );

  return items;
}

export function buildQuantityModel(
  project: ProjectModel,
  options?: { readonly generatedAt?: string; readonly forceStale?: boolean },
): QuantityModel {
  const draft = getBridgeStructureInputDraft(project);
  const stale = options?.forceStale === true || !isBridgeStructureGenerationCurrent(project);
  const inputChecksum = buildInputChecksum(draft);
  const inputRevision = buildInputRevision(draft);
  const generatedAt = options?.generatedAt ?? new Date().toISOString();
  const warnings = [
    "UNVERIFIED DEVELOPMENT QUANTITY",
    "NOT FOR ESTIMATE, DESIGN OR CONSTRUCTION",
    "NUMERIC_DESIGN_AUTHORIZATION: NOT_GRANTED",
  ];

  if (stale) {
    warnings.push("STALE: regenerate structure before using quantities for export");
  }

  const layoutDiagnostics = validateBridgeLayoutContract({
    bridgeSystem: draft.bridgeSystem,
    bridgeLength: draft.bridgeLength,
    spanLength: draft.spanLength,
    spans: draft.spans,
    supports: draft.supports,
  });
  if (layoutDiagnostics.length > 0) {
    warnings.push(...layoutDiagnostics);
  }

  const resolved = resolveDraft(draft);
  const baseItems = resolved ? computeItems(resolved) : null;
  const appHaunchItems =
    resolved && baseItems ? buildAppurtenanceHaunchQuantityItems(project, draft) : [];
  const items = baseItems
    ? [...baseItems, ...appHaunchItems].map((entry) =>
        stale
          ? {
              ...entry,
              status: entry.status === "READY" || entry.status === "USER_PROVIDED_UNVERIFIED" ? ("STALE" as const) : entry.status,
              warnings: [...entry.warnings, "STALE"],
            }
          : entry,
      )
    : [
        item({
          quantityId: "QTY-BLOCKED",
          category: "SUMMARY",
          subcategory: "error",
          label: "数量算出不可",
          sourceEntityIds: [],
          calculationBasis: "INCOMPLETE_INPUT",
          formulaId: "F-QTY-BLOCKED",
          inputRefs: [],
          value: null,
          unit: "—",
          precision: 0,
          status: "INCOMPLETE",
          assumptionIds: [],
          warnings: ["入力不完全"],
        }),
      ];

  if (appHaunchItems.length > 0) {
    warnings.push(
      "APPURTENANCE/RC_HAUNCH quantities derived from C1 geometry kernel; RC_DECK body remains separate (no double count).",
    );
  }

  return {
    schemaVersion: QUANTITY_MODEL_SCHEMA_VERSION,
    quantityModelId: `qty-${project.project.id}-${inputChecksum.slice(0, 12)}`,
    projectId: project.project.id,
    inputRevision,
    inputChecksum,
    generatedAt,
    developmentLabel: "UNVERIFIED_DEVELOPMENT_ONLY",
    authorizationStatus: "NOT_GRANTED",
    designOrConstructionUse: "PROHIBITED",
    stale,
    warnings,
    items,
  };
}

export function quantityModelToJson(model: QuantityModel): string {
  return `${JSON.stringify(model, null, 2)}\n`;
}

export function quantityModelToCsv(model: QuantityModel): string {
  const header =
    "quantityId,category,label,value,unit,status,basis,warnings,inputRevision,inputChecksum";
  const rows = model.items.map((entry) => {
    const value = entry.value === null || entry.value === undefined ? "" : String(entry.value);
    const warnings = entry.warnings.join("|").replaceAll(",", ";");
    return [
      entry.quantityId,
      entry.category,
      entry.label.replaceAll(",", ";"),
      value,
      entry.unit,
      entry.status,
      entry.calculationBasis,
      warnings,
      model.inputRevision,
      model.inputChecksum,
    ].join(",");
  });
  // UTF-8 BOM for Excel-friendly CSV
  return `\uFEFF${[header, ...rows].join("\n")}\n`;
}

export function assertQuantityModelExportable(model: QuantityModel): void {
  if (model.stale) {
    throw new Error("STALE quantity model export rejected");
  }
  if (model.authorizationStatus !== "NOT_GRANTED") {
    // Development track must remain NOT_GRANTED; refuse unexpected grants.
    throw new Error("Unexpected authorizationStatus for development quantity export");
  }
}

export function findQuantityValue(model: QuantityModel, quantityId: string): number | null {
  return model.items.find((entry) => entry.quantityId === quantityId)?.value ?? null;
}
