/**
 * DrawingSetModel — multi-sheet development drawings (Step 3-A+).
 * DEVELOPMENT GENERAL ARRANGEMENT
 * NOT A DESIGN-APPROVED OR FABRICATION DRAWING
 * NOT FOR CONSTRUCTION
 * NUMERIC_DESIGN_AUTHORIZATION: NOT_GRANTED
 */

import type { ProjectModel } from "../../types";
import { computeContentChecksum } from "../../contracts/legacy/checksum";
import { buildInputChecksum, buildQuantityModel } from "../quantity/quantityModel";
import { buildReportModel } from "../report/reportModel";
import {
  buildStandardSectionDrawingModel,
  drawingModelChecksum,
  type DrawingEntity,
  type DrawingModel,
} from "./drawingModel";

function modelChecksum(value: unknown): string {
  return computeContentChecksum(value).hexDigest;
}
import { getBridgeStructureInputDraft, isBridgeStructureGenerationCurrent } from "../bridgeStructure/generateBsdd";
import {
  computeDeckOverhang,
  generateSimpleSupportStations,
  generateSpacingStations,
  generateSwayBracingStations,
  girderCenterOffsetsY,
} from "./stationGenerator";

export const DRAWING_SET_SCHEMA_VERSION = "1.0.0-development";

export const DRAWING_SET_LAYERS = [
  "APOLLO_BORDER",
  "APOLLO_TITLE",
  "APOLLO_DECK",
  "APOLLO_GIRDER",
  "APOLLO_CROSSBEAM",
  "APOLLO_BRACING",
  "APOLLO_STIFFENER",
  "APOLLO_SUPPORT",
  "APOLLO_BEARING",
  "APOLLO_CENTERLINE",
  "APOLLO_STATION",
  "APOLLO_DIMENSION",
  "APOLLO_TEXT",
  "APOLLO_MEMBER_MARK",
  "APOLLO_TABLE",
  "APOLLO_WARNING",
  "APOLLO_OPTIONAL",
] as const;

export type DrawingSetLayerId = (typeof DRAWING_SET_LAYERS)[number];

export type DrawingViewType =
  | "GENERAL_PLAN"
  | "GENERAL_ELEVATION"
  | "STANDARD_SECTION"
  | "GIRDER_ELEVATION"
  | "FLOOR_SYSTEM_PLAN"
  | "BRACING_LAYOUT"
  | "SUPPORT_BEARING_PLAN"
  | "STIFFENER_LAYOUT"
  | "MEMBER_SCHEDULE";

export type DrawingSetEntity = {
  readonly entityId: string;
  readonly sourceEntityId: string;
  readonly type: "RECT" | "LINE" | "POLYLINE" | "TEXT" | "DIMENSION";
  readonly layerId: DrawingSetLayerId;
  readonly geometry: Record<string, number | string | readonly number[]>;
  readonly style?: Record<string, string | number>;
  readonly metadata?: Record<string, string | number | boolean>;
};

export type ViewModel = {
  readonly viewId: string;
  readonly viewType: DrawingViewType;
  readonly sourceEntityIds: readonly string[];
  readonly localOrigin: readonly [number, number];
  readonly viewport: { readonly minX: number; readonly minY: number; readonly maxX: number; readonly maxY: number };
  readonly scale: string;
  readonly layers: readonly DrawingSetLayerId[];
  readonly entities: readonly DrawingSetEntity[];
  readonly dimensions: readonly DrawingSetEntity[];
  readonly labels: readonly DrawingSetEntity[];
  readonly bounds: { readonly minX: number; readonly minY: number; readonly maxX: number; readonly maxY: number };
};

export type SheetTable = {
  readonly tableId: string;
  readonly title: string;
  readonly headers: readonly string[];
  readonly rows: readonly (readonly string[])[];
};

export type SheetModel = {
  readonly sheetId: string;
  readonly drawingNumber: string;
  readonly title: string;
  readonly paperSize: "A3" | "A1";
  readonly orientation: "landscape" | "portrait";
  readonly scale: string;
  readonly sheetIndex: number;
  readonly totalSheets: number;
  readonly views: readonly ViewModel[];
  readonly tables: readonly SheetTable[];
  readonly notes: readonly string[];
  readonly titleBlock: {
    readonly title: string;
    readonly subtitle: string;
    readonly warning: string;
    readonly drawingNumber: string;
    readonly revision: string;
    readonly inputChecksum: string;
  };
  readonly checksum: string;
};

export type DrawingSetModel = {
  readonly schemaVersion: typeof DRAWING_SET_SCHEMA_VERSION;
  readonly drawingSetId: string;
  readonly projectId: string;
  readonly inputRevision: string;
  readonly inputChecksum: string;
  readonly resultRevision: string;
  readonly resultChecksum: string;
  readonly quantityModelChecksum: string;
  readonly reportModelChecksum: string;
  readonly standardSectionChecksum: string;
  readonly generatedAt: string;
  readonly developmentStatus: "UNVERIFIED_DEVELOPMENT_ONLY";
  readonly authorizationStatus: "NOT_GRANTED";
  readonly coordinateSystem: {
    readonly x: "BRIDGE_AXIS_START_TO_END";
    readonly y: "TRANSVERSE_LEFT_TO_RIGHT";
    readonly z: "UPWARD";
    readonly station0: "START_SUPPORT_LINE";
    readonly plan: "X-Y";
    readonly elevation: "X-Z";
    readonly section: "Y-Z";
    readonly datumNote: string;
  };
  readonly units: "m";
  readonly layerRegistry: typeof DRAWING_SET_LAYERS;
  readonly styleRegistry: { readonly developmentWatermark: string };
  readonly titleBlockTemplate: string;
  readonly sheets: readonly SheetModel[];
  readonly warnings: readonly string[];
  readonly audit: {
    readonly paperChoiceReason: string;
    readonly scope: string;
  };
  readonly stale: boolean;
  readonly fabricationDrawing: false;
  readonly layout: {
    readonly bridgeLength: number;
    readonly spanLength: number;
    readonly width: number;
    readonly girderCount: number;
    readonly girderSpacing: number;
    readonly overhang: number;
    readonly girderCentersY: readonly number[];
    readonly supportStations: readonly number[];
    readonly crossBeamStations: readonly number[];
    readonly stiffenerStations: readonly number[];
    readonly swayStations: readonly number[];
    readonly girderDepth: number;
    readonly deckThickness: number;
    readonly upperLateralBracingEnabled: boolean;
    readonly lowerLateralBracingEnabled: boolean;
  };
};

function sheetChecksum(sheet: Omit<SheetModel, "checksum">): string {
  return computeContentChecksum(sheet).hexDigest;
}

function boundsOf(entities: readonly DrawingSetEntity[]): {
  readonly minX: number;
  readonly minY: number;
  readonly maxX: number;
  readonly maxY: number;
} {
  const coords: number[] = [];
  for (const e of entities) {
    for (const v of Object.values(e.geometry)) {
      if (typeof v === "number") coords.push(v);
      if (Array.isArray(v)) coords.push(...v.filter((n): n is number => typeof n === "number"));
    }
  }
  if (coords.length === 0) return { minX: -1, minY: -1, maxX: 1, maxY: 1 };
  return {
    minX: Math.min(...coords) - 0.5,
    minY: Math.min(...coords) - 0.5,
    maxX: Math.max(...coords) + 0.5,
    maxY: Math.max(...coords) + 0.5,
  };
}

function buildGeneralPlanView(layout: DrawingSetModel["layout"]): ViewModel {
  const L = layout.bridgeLength;
  const halfW = layout.width / 2;
  const entities: DrawingSetEntity[] = [];
  const dimensions: DrawingSetEntity[] = [];
  const labels: DrawingSetEntity[] = [];
  const sourceEntityIds: string[] = ["deck", "CL"];

  // Deck outline (plan X-Y)
  entities.push({
    entityId: "plan-deck",
    sourceEntityId: "rcDeck",
    type: "RECT",
    layerId: "APOLLO_DECK",
    geometry: { x: 0, y: -halfW, w: L, h: layout.width },
  });

  // Bridge centerline
  entities.push({
    entityId: "plan-cl",
    sourceEntityId: "CL",
    type: "LINE",
    layerId: "APOLLO_CENTERLINE",
    geometry: { x1: 0, y1: 0, x2: L, y2: 0 },
    style: { strokeDasharray: "4 2" },
  });

  // Support lines
  layout.supportStations.forEach((sx, i) => {
    const sid = `SUP-${i + 1}`;
    sourceEntityIds.push(sid);
    entities.push({
      entityId: `plan-support-${i}`,
      sourceEntityId: sid,
      type: "LINE",
      layerId: "APOLLO_SUPPORT",
      geometry: { x1: sx, y1: -halfW - 0.3, x2: sx, y2: halfW + 0.3 },
    });
    labels.push({
      entityId: `plan-support-label-${i}`,
      sourceEntityId: sid,
      type: "TEXT",
      layerId: "APOLLO_MEMBER_MARK",
      geometry: { x: sx, y: halfW + 0.55, text: sid, height: 0.25 },
    });
  });

  // Girder centerlines G1..Gn
  layout.girderCentersY.forEach((gy, i) => {
    const gid = `G${i + 1}`;
    sourceEntityIds.push(gid);
    entities.push({
      entityId: `plan-girder-${i + 1}`,
      sourceEntityId: gid,
      type: "LINE",
      layerId: "APOLLO_GIRDER",
      geometry: { x1: 0, y1: gy, x2: L, y2: gy },
    });
    labels.push({
      entityId: `plan-girder-mark-${i + 1}`,
      sourceEntityId: gid,
      type: "TEXT",
      layerId: "APOLLO_MEMBER_MARK",
      geometry: { x: -0.8, y: gy, text: gid, height: 0.3 },
    });
  });

  // Cross beams C1..Cm
  layout.crossBeamStations.forEach((cx, i) => {
    const cid = `C${i + 1}`;
    sourceEntityIds.push(cid);
    entities.push({
      entityId: `plan-crossbeam-${i + 1}`,
      sourceEntityId: cid,
      type: "LINE",
      layerId: "APOLLO_CROSSBEAM",
      geometry: {
        x1: cx,
        y1: layout.girderCentersY[0] ?? -halfW,
        x2: cx,
        y2: layout.girderCentersY[layout.girderCentersY.length - 1] ?? halfW,
      },
    });
    labels.push({
      entityId: `plan-crossbeam-mark-${i + 1}`,
      sourceEntityId: cid,
      type: "TEXT",
      layerId: "APOLLO_STATION",
      geometry: { x: cx, y: -halfW - 0.55, text: cid, height: 0.22 },
    });
  });

  // Sway bracing positions (schematic marks)
  layout.swayStations.forEach((sx, i) => {
    const bid = `SW-${i + 1}`;
    sourceEntityIds.push(bid);
    entities.push({
      entityId: `plan-sway-${i + 1}`,
      sourceEntityId: bid,
      type: "LINE",
      layerId: "APOLLO_BRACING",
      geometry: {
        x1: sx,
        y1: (layout.girderCentersY[0] ?? 0) + 0.15,
        x2: sx,
        y2: (layout.girderCentersY[layout.girderCentersY.length - 1] ?? 0) - 0.15,
      },
      style: { strokeDasharray: "2 2" },
      metadata: { schematic: true },
    });
  });

  // Lateral bracing status notes
  labels.push({
    entityId: "plan-lateral-status",
    sourceEntityId: "lateral",
    type: "TEXT",
    layerId: "APOLLO_TEXT",
    geometry: {
      x: L / 2,
      y: -halfW - 1.1,
      text: `upper lateral: ${layout.upperLateralBracingEnabled ? "ENABLED (schematic)" : "DISABLED"} | lower lateral: ${layout.lowerLateralBracingEnabled ? "ENABLED (schematic)" : "DISABLED"}`,
      height: 0.2,
    },
  });

  dimensions.push(
    {
      entityId: "plan-dim-span",
      sourceEntityId: "spanLength",
      type: "DIMENSION",
      layerId: "APOLLO_DIMENSION",
      geometry: { x1: 0, y1: halfW + 1.0, x2: layout.spanLength, y2: halfW + 1.0, text: `L_span=${layout.spanLength} m` },
    },
    {
      entityId: "plan-dim-model",
      sourceEntityId: "bridgeLength",
      type: "DIMENSION",
      layerId: "APOLLO_DIMENSION",
      geometry: { x1: 0, y1: halfW + 1.4, x2: L, y2: halfW + 1.4, text: `L_model=${L} m` },
    },
    {
      entityId: "plan-dim-width",
      sourceEntityId: "width",
      type: "DIMENSION",
      layerId: "APOLLO_DIMENSION",
      geometry: { x1: -1.2, y1: -halfW, x2: -1.2, y2: halfW, text: `B=${layout.width} m` },
    },
    {
      entityId: "plan-dim-spacing",
      sourceEntityId: "girderSpacing",
      type: "DIMENSION",
      layerId: "APOLLO_DIMENSION",
      geometry: {
        x1: L + 0.6,
        y1: layout.girderCentersY[0] ?? 0,
        x2: L + 0.6,
        y2: layout.girderCentersY[Math.min(1, layout.girderCentersY.length - 1)] ?? 0,
        text: `s=${layout.girderSpacing} m`,
      },
    },
    {
      entityId: "plan-dim-overhang",
      sourceEntityId: "overhang",
      type: "DIMENSION",
      layerId: "APOLLO_DIMENSION",
      geometry: {
        x1: L + 1.1,
        y1: -halfW,
        x2: L + 1.1,
        y2: layout.girderCentersY[0] ?? -halfW,
        text: `oh=${layout.overhang} m`,
      },
    },
  );

  if (layout.crossBeamStations.length >= 2) {
    dimensions.push({
      entityId: "plan-dim-cb-spacing",
      sourceEntityId: "crossBeamSpacing",
      type: "DIMENSION",
      layerId: "APOLLO_DIMENSION",
      geometry: {
        x1: layout.crossBeamStations[0]!,
        y1: -halfW - 1.5,
        x2: layout.crossBeamStations[1]!,
        y2: -halfW - 1.5,
        text: `cb=${layout.crossBeamStations[1]! - layout.crossBeamStations[0]!} m`,
      },
    });
  }

  const all = [...entities, ...dimensions, ...labels];
  const b = boundsOf(all);
  return {
    viewId: "view-general-plan",
    viewType: "GENERAL_PLAN",
    sourceEntityIds,
    localOrigin: [0, 0],
    viewport: b,
    scale: "FIT",
    layers: DRAWING_SET_LAYERS,
    entities,
    dimensions,
    labels,
    bounds: b,
  };
}

function buildGeneralElevationView(layout: DrawingSetModel["layout"]): ViewModel {
  const L = layout.bridgeLength;
  const H = layout.girderDepth;
  const td = layout.deckThickness;
  const entities: DrawingSetEntity[] = [];
  const dimensions: DrawingSetEntity[] = [];
  const labels: DrawingSetEntity[] = [];
  const sourceEntityIds: string[] = ["girder-elevation", "deck-elevation"];

  // Local datum Z=0 at girder bottom
  entities.push({
    entityId: "elev-datum",
    sourceEntityId: "LOCAL_DATUM",
    type: "LINE",
    layerId: "APOLLO_CENTERLINE",
    geometry: { x1: -1, y1: 0, x2: L + 1, y2: 0 },
    style: { strokeDasharray: "6 3" },
  });
  labels.push({
    entityId: "elev-datum-note",
    sourceEntityId: "LOCAL_DATUM",
    type: "TEXT",
    layerId: "APOLLO_WARNING",
    geometry: {
      x: L / 2,
      y: -0.9,
      text: "LOCAL DATUM — ABSOLUTE ELEVATION NOT PROVIDED",
      height: 0.22,
    },
  });

  // Girder rectangle (side)
  entities.push({
    entityId: "elev-girder",
    sourceEntityId: "mainGirder",
    type: "RECT",
    layerId: "APOLLO_GIRDER",
    geometry: { x: 0, y: 0, w: L, h: H },
  });

  // Deck top/bottom
  entities.push({
    entityId: "elev-deck",
    sourceEntityId: "rcDeck",
    type: "RECT",
    layerId: "APOLLO_DECK",
    geometry: { x: 0, y: H, w: L, h: td },
  });

  layout.supportStations.forEach((sx, i) => {
    const sid = `SUP-${i + 1}`;
    sourceEntityIds.push(sid);
    entities.push({
      entityId: `elev-support-${i}`,
      sourceEntityId: sid,
      type: "LINE",
      layerId: "APOLLO_SUPPORT",
      geometry: { x1: sx, y1: -0.4, x2: sx, y2: H + td + 0.2 },
    });
  });

  layout.crossBeamStations.forEach((cx, i) => {
    entities.push({
      entityId: `elev-cb-${i + 1}`,
      sourceEntityId: `C${i + 1}`,
      type: "LINE",
      layerId: "APOLLO_CROSSBEAM",
      geometry: { x1: cx, y1: H * 0.3, x2: cx, y2: H * 0.7 },
    });
  });

  layout.stiffenerStations.forEach((sx, i) => {
    entities.push({
      entityId: `elev-stiff-${i + 1}`,
      sourceEntityId: `ST-${i + 1}`,
      type: "LINE",
      layerId: "APOLLO_STIFFENER",
      geometry: { x1: sx, y1: 0.05, x2: sx, y2: H - 0.05 },
      metadata: { schematic: true, note: "STIFFENER PLATE SIZE NOT DEFINED" },
    });
  });

  layout.swayStations.forEach((sx, i) => {
    entities.push({
      entityId: `elev-sway-${i + 1}`,
      sourceEntityId: `SW-${i + 1}`,
      type: "LINE",
      layerId: "APOLLO_BRACING",
      geometry: { x1: sx, y1: 0.1, x2: sx, y2: H - 0.1 },
      style: { strokeDasharray: "2 2" },
      metadata: { schematic: true },
    });
  });

  dimensions.push(
    {
      entityId: "elev-dim-span",
      sourceEntityId: "spanLength",
      type: "DIMENSION",
      layerId: "APOLLO_DIMENSION",
      geometry: { x1: 0, y1: H + td + 0.8, x2: layout.spanLength, y2: H + td + 0.8, text: `L=${layout.spanLength} m` },
    },
    {
      entityId: "elev-dim-depth",
      sourceEntityId: "girderDepth",
      type: "DIMENSION",
      layerId: "APOLLO_DIMENSION",
      geometry: { x1: L + 0.5, y1: 0, x2: L + 0.5, y2: H, text: `H=${H} m` },
    },
    {
      entityId: "elev-dim-deck",
      sourceEntityId: "deckThickness",
      type: "DIMENSION",
      layerId: "APOLLO_DIMENSION",
      geometry: { x1: L + 0.9, y1: H, x2: L + 0.9, y2: H + td, text: `t_d=${td} m` },
    },
  );

  labels.push({
    entityId: "elev-section-callout",
    sourceEntityId: "section-callout",
    type: "TEXT",
    layerId: "APOLLO_TEXT",
    geometry: { x: L / 2, y: H + td + 1.2, text: "SECTION A-A → see STANDARD SECTION view / Step 2-C DrawingModel", height: 0.2 },
  });

  const all = [...entities, ...dimensions, ...labels];
  const b = boundsOf(all);
  return {
    viewId: "view-general-elevation",
    viewType: "GENERAL_ELEVATION",
    sourceEntityIds,
    localOrigin: [0, 0],
    viewport: b,
    scale: "FIT",
    layers: DRAWING_SET_LAYERS,
    entities,
    dimensions,
    labels,
    bounds: b,
  };
}

/** Reuse Step 2 DrawingModel entities — no duplicate generation. */
function buildStandardSectionViewFromDrawingModel(section: DrawingModel): ViewModel {
  const mapLayer = (layerId: string): DrawingSetLayerId => {
    if ((DRAWING_SET_LAYERS as readonly string[]).includes(layerId)) return layerId as DrawingSetLayerId;
    return "APOLLO_OPTIONAL";
  };
  const mapEntity = (e: DrawingEntity): DrawingSetEntity => {
    const mapped: DrawingSetEntity = {
      entityId: e.entityId,
      sourceEntityId: e.sourceEntityId,
      type: e.type,
      layerId: mapLayer(e.layerId),
      geometry: e.geometry,
      metadata: { ...(e.metadata ?? {}), reusedFrom: "DrawingModel.STANDARD_SECTION" },
    };
    return e.style ? { ...mapped, style: e.style } : mapped;
  };
  const entities = section.entities.map(mapEntity);
  const dimensions = section.dimensions.map(mapEntity);
  const labels = section.labels.map(mapEntity);
  return {
    viewId: "view-standard-section",
    viewType: "STANDARD_SECTION",
    sourceEntityIds: section.entities.map((e) => e.sourceEntityId),
    localOrigin: [0, 0],
    viewport: section.viewport,
    scale: section.sheet.scale,
    layers: DRAWING_SET_LAYERS,
    entities,
    dimensions,
    labels,
    bounds: section.viewport,
  };
}

function buildParticularsTable(layout: DrawingSetModel["layout"], draft: ReturnType<typeof getBridgeStructureInputDraft>): SheetTable {
  const cell = (v: number | null | undefined): string =>
    v === null || v === undefined ? "NOT_PROVIDED" : String(v);
  return {
    tableId: "table-particulars",
    title: "主要諸元 / PARTICULARS",
    headers: ["項目", "値", "単位"],
    rows: [
      ["橋梁形式", "非合成RC床版鋼鈑桁橋（直橋・単径間・等桁高）", "-"],
      ["支間", cell(layout.spanLength), "m"],
      ["構造モデル長", cell(layout.bridgeLength), "m"],
      ["幅員", cell(layout.width), "m"],
      ["主桁本数", cell(layout.girderCount), "本"],
      ["主桁間隔", cell(layout.girderSpacing), "m"],
      ["左右張出し", cell(layout.overhang), "m"],
      ["桁高", cell(layout.girderDepth), "m"],
      ["床版厚", cell(layout.deckThickness), "m"],
      ["上フランジ幅", cell(draft.topFlangeWidth), "m"],
      ["上フランジ厚", cell(draft.topFlangeThickness), "m"],
      ["下フランジ幅", cell(draft.bottomFlangeWidth), "m"],
      ["下フランジ厚", cell(draft.bottomFlangeThickness), "m"],
      ["ウェブ厚", cell(draft.webThickness), "m"],
      ["development status", "UNVERIFIED_DEVELOPMENT_ONLY", "-"],
      ["authorization status", "NOT_GRANTED", "-"],
    ],
  };
}

export function buildGeneralArrangementDrawingSet(
  project: ProjectModel,
  options?: { readonly generatedAt?: string },
): DrawingSetModel {
  const draft = getBridgeStructureInputDraft(project);
  const stale = !isBridgeStructureGenerationCurrent(project);
  const inputChecksum = buildInputChecksum(draft);
  const inputRevision = draft.generatedAt ?? "STALE_OR_UNGENERATED";
  const generatedAt = options?.generatedAt ?? new Date().toISOString();
  const quantity = buildQuantityModel(project, { generatedAt });
  const report = buildReportModel(project, { generatedAt });
  const section = buildStandardSectionDrawingModel(project, { generatedAt });

  const baseWarnings = [
    "DEVELOPMENT GENERAL ARRANGEMENT",
    "NOT A DESIGN-APPROVED OR FABRICATION DRAWING",
    "NOT FOR CONSTRUCTION",
    "UNVERIFIED DEVELOPMENT OUTPUT",
    "USER REVIEW REQUIRED",
    "NUMERIC_DESIGN_AUTHORIZATION: NOT_GRANTED",
    "LOCAL DATUM — ABSOLUTE ELEVATION NOT PROVIDED",
  ];

  const required = [
    draft.spanLength,
    draft.bridgeLength,
    draft.width,
    draft.girderCount,
    draft.girderSpacing,
    draft.girderDepth,
    draft.deckThickness,
    draft.crossBeamSpacing,
  ];
  if (required.some((v) => v === null) || draft.bridgeSystem !== "SIMPLE_SINGLE") {
    return emptyDrawingSet(project, inputChecksum, inputRevision, generatedAt, stale, [
      ...baseWarnings,
      draft.bridgeSystem !== "SIMPLE_SINGLE"
        ? "STEP3_SCOPE: SIMPLE_SINGLE only — continuous/skew/curved BLOCKED"
        : "INCOMPLETE_INPUT",
    ]);
  }

  const overhangResult = computeDeckOverhang(draft.width!, draft.girderCount!, draft.girderSpacing!);
  if (!overhangResult.ok) {
    return emptyDrawingSet(project, inputChecksum, inputRevision, generatedAt, stale, [
      ...baseWarnings,
      overhangResult.reason ?? "layout blocked",
    ]);
  }

  const girderCentersY = girderCenterOffsetsY(draft.girderCount!, draft.girderSpacing!);
  const supportStations = generateSimpleSupportStations(draft.bridgeLength!).stations;
  const crossBeam = generateSpacingStations(draft.bridgeLength!, draft.crossBeamSpacing!);
  const stiffener = generateSpacingStations(draft.bridgeLength!, draft.stiffenerSpacing);
  const sway = generateSwayBracingStations(crossBeam.stations, draft.swayBracingInterval);

  const layout: DrawingSetModel["layout"] = {
    bridgeLength: draft.bridgeLength!,
    spanLength: draft.spanLength!,
    width: draft.width!,
    girderCount: draft.girderCount!,
    girderSpacing: draft.girderSpacing!,
    overhang: overhangResult.overhang,
    girderCentersY,
    supportStations,
    crossBeamStations: crossBeam.stations,
    stiffenerStations: stiffener.ok ? stiffener.stations : [],
    swayStations: sway.ok ? sway.stations : [],
    girderDepth: draft.girderDepth!,
    deckThickness: draft.deckThickness!,
    upperLateralBracingEnabled: draft.upperLateralBracingEnabled,
    lowerLateralBracingEnabled: draft.lateralBracingEnabled,
  };

  const plan = buildGeneralPlanView(layout);
  const elevation = buildGeneralElevationView(layout);
  const standardSectionView = buildStandardSectionViewFromDrawingModel(section);

  const warnings = [
    ...baseWarnings,
    ...(stale ? ["STALE"] : []),
    ...(stiffener.ok ? [] : ["stiffener stations: NOT_PROVIDED"]),
    ...(sway.ok ? [] : ["sway bracing: NOT_PROVIDED"]),
    "bracing/stiffener geometry: SCHEMATIC / APPROXIMATE where section not defined",
    "A3 landscape adopted (A1 deferred — HTML/PDF print path more stable on A3)",
  ];

  const tables = [buildParticularsTable(layout, draft)];
  const notes = [
    "UNVERIFIED DEVELOPMENT OUTPUT",
    "NOT FOR DESIGN, FABRICATION OR CONSTRUCTION",
    "USER REVIEW REQUIRED",
    "NUMERIC_DESIGN_AUTHORIZATION: NOT_GRANTED",
    "Standard section view reuses Step 2-C DrawingModel (same stable IDs / checksum).",
  ];

  const sheetWithoutChecksum: Omit<SheetModel, "checksum"> = {
    sheetId: "sheet-G-01",
    drawingNumber: "G-01",
    title: "構造一般図 / GENERAL ARRANGEMENT",
    paperSize: "A3",
    orientation: "landscape",
    scale: "FIT",
    sheetIndex: 1,
    totalSheets: 1,
    views: [plan, elevation, standardSectionView],
    tables,
    notes,
    titleBlock: {
      title: "構造一般図 / GENERAL ARRANGEMENT",
      subtitle: "DEVELOPMENT PREVIEW",
      warning: "NOT A DESIGN-APPROVED OR FABRICATION DRAWING — NOT FOR CONSTRUCTION",
      drawingNumber: "G-01",
      revision: inputRevision,
      inputChecksum,
    },
  };

  const sheet: SheetModel = {
    ...sheetWithoutChecksum,
    checksum: sheetChecksum(sheetWithoutChecksum),
  };

  const qtyChecksum = modelChecksum(quantity);
  const rptChecksum = modelChecksum(report);
  const resultChecksum = computeContentChecksum({
    inputChecksum,
    quantity: qtyChecksum,
    report: rptChecksum,
    section: drawingModelChecksum(section),
    sheet: sheet.checksum,
  }).hexDigest;

  return {
    schemaVersion: DRAWING_SET_SCHEMA_VERSION,
    drawingSetId: `dset-ga-${project.project.id}-${inputChecksum.slice(0, 12)}`,
    projectId: project.project.id,
    inputRevision,
    inputChecksum,
    resultRevision: inputRevision,
    resultChecksum,
    quantityModelChecksum: qtyChecksum,
    reportModelChecksum: rptChecksum,
    standardSectionChecksum: drawingModelChecksum(section),
    generatedAt,
    developmentStatus: "UNVERIFIED_DEVELOPMENT_ONLY",
    authorizationStatus: "NOT_GRANTED",
    coordinateSystem: {
      x: "BRIDGE_AXIS_START_TO_END",
      y: "TRANSVERSE_LEFT_TO_RIGHT",
      z: "UPWARD",
      station0: "START_SUPPORT_LINE",
      plan: "X-Y",
      elevation: "X-Z",
      section: "Y-Z",
      datumNote: "LOCAL DATUM — ABSOLUTE ELEVATION NOT PROVIDED",
    },
    units: "m",
    layerRegistry: DRAWING_SET_LAYERS,
    styleRegistry: {
      developmentWatermark: "UNVERIFIED DEVELOPMENT OUTPUT — NOT FOR CONSTRUCTION",
    },
    titleBlockTemplate: "APOLLO_DEVELOPMENT_A3",
    sheets: [sheet],
    warnings,
    audit: {
      paperChoiceReason: "A3 landscape chosen for PDF/HTML stability; A1 deferred",
      scope: "straight simple-span equal-depth non-composite RC-deck steel plate girder, skew 90°, SI",
    },
    stale,
    fabricationDrawing: false,
    layout,
  };
}

function emptyDrawingSet(
  project: ProjectModel,
  inputChecksum: string,
  inputRevision: string,
  generatedAt: string,
  stale: boolean,
  warnings: string[],
): DrawingSetModel {
  return {
    schemaVersion: DRAWING_SET_SCHEMA_VERSION,
    drawingSetId: `dset-blocked-${project.project.id}`,
    projectId: project.project.id,
    inputRevision,
    inputChecksum,
    resultRevision: inputRevision,
    resultChecksum: "BLOCKED",
    quantityModelChecksum: "BLOCKED",
    reportModelChecksum: "BLOCKED",
    standardSectionChecksum: "BLOCKED",
    generatedAt,
    developmentStatus: "UNVERIFIED_DEVELOPMENT_ONLY",
    authorizationStatus: "NOT_GRANTED",
    coordinateSystem: {
      x: "BRIDGE_AXIS_START_TO_END",
      y: "TRANSVERSE_LEFT_TO_RIGHT",
      z: "UPWARD",
      station0: "START_SUPPORT_LINE",
      plan: "X-Y",
      elevation: "X-Z",
      section: "Y-Z",
      datumNote: "LOCAL DATUM — ABSOLUTE ELEVATION NOT PROVIDED",
    },
    units: "m",
    layerRegistry: DRAWING_SET_LAYERS,
    styleRegistry: { developmentWatermark: "BLOCKED" },
    titleBlockTemplate: "APOLLO_DEVELOPMENT_A3",
    sheets: [],
    warnings,
    audit: {
      paperChoiceReason: "N/A",
      scope: "blocked",
    },
    stale,
    fabricationDrawing: false,
    layout: {
      bridgeLength: 0,
      spanLength: 0,
      width: 0,
      girderCount: 0,
      girderSpacing: 0,
      overhang: 0,
      girderCentersY: [],
      supportStations: [],
      crossBeamStations: [],
      stiffenerStations: [],
      swayStations: [],
      girderDepth: 0,
      deckThickness: 0,
      upperLateralBracingEnabled: false,
      lowerLateralBracingEnabled: false,
    },
  };
}

export function assertDrawingSetExportable(model: DrawingSetModel): void {
  if (model.stale) throw new Error("STALE drawing set export rejected");
  if (model.sheets.length === 0) throw new Error("Blocked/empty drawing set export rejected");
  if (model.fabricationDrawing) throw new Error("Fabrication drawing flag must be false");
}

export function drawingSetChecksum(model: DrawingSetModel): string {
  return computeContentChecksum(model).hexDigest;
}

export function getSheetByNumber(model: DrawingSetModel, drawingNumber: string): SheetModel | undefined {
  return model.sheets.find((s) => s.drawingNumber === drawingNumber);
}
