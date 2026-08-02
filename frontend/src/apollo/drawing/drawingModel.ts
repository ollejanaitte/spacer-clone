/**
 * Drawing Semantic Model — STANDARD_SECTION (Step 2-C development).
 * STANDARD SECTION — DEVELOPMENT PREVIEW
 * NOT A FABRICATION DRAWING — NOT FOR DESIGN OR CONSTRUCTION
 * NUMERIC_DESIGN_AUTHORIZATION: NOT_GRANTED
 */

import type { ProjectModel } from "../../types";
import { computeContentChecksum } from "../../contracts/legacy/checksum";
import { buildInputChecksum } from "../quantity/quantityModel";
import { getBridgeStructureInputDraft, isBridgeStructureGenerationCurrent } from "../bridgeStructure/generateBsdd";

export const DRAWING_MODEL_SCHEMA_VERSION = "1.0.0-development";

export const DRAWING_LAYERS = [
  "APOLLO_DECK",
  "APOLLO_GIRDER",
  "APOLLO_CENTERLINE",
  "APOLLO_DIMENSION",
  "APOLLO_TEXT",
  "APOLLO_TITLE",
  "APOLLO_WARNING",
  "APOLLO_PAVEMENT_OPTIONAL",
] as const;

export type DrawingLayerId = (typeof DRAWING_LAYERS)[number];

export type DrawingEntity = {
  readonly entityId: string;
  readonly sourceEntityId: string;
  readonly type: "RECT" | "LINE" | "POLYLINE" | "TEXT" | "DIMENSION";
  readonly layerId: DrawingLayerId;
  readonly geometry: Record<string, number | string | readonly number[]>;
  readonly style?: Record<string, string | number>;
  readonly metadata?: Record<string, string | number | boolean>;
};

export type DrawingModel = {
  readonly schemaVersion: typeof DRAWING_MODEL_SCHEMA_VERSION;
  readonly drawingId: string;
  readonly drawingType: "STANDARD_SECTION";
  readonly projectId: string;
  readonly inputRevision: string;
  readonly inputChecksum: string;
  readonly generatedAt: string;
  readonly units: "m";
  readonly sheet: {
    readonly size: "A3";
    readonly orientation: "landscape";
    readonly scale: string;
    readonly marginsMm: readonly [number, number, number, number];
    readonly titleBlock: {
      readonly title: string;
      readonly subtitle: string;
      readonly warning: string;
    };
  };
  readonly viewport: { readonly minX: number; readonly minY: number; readonly maxX: number; readonly maxY: number };
  readonly layers: typeof DRAWING_LAYERS;
  readonly entities: readonly DrawingEntity[];
  readonly dimensions: readonly DrawingEntity[];
  readonly labels: readonly DrawingEntity[];
  readonly warnings: readonly string[];
  readonly developmentStatus: "UNVERIFIED_DEVELOPMENT_PREVIEW";
  readonly authorizationStatus: "NOT_GRANTED";
  readonly fabricationDrawing: false;
  readonly stale: boolean;
  readonly layout: {
    readonly width: number;
    readonly girderCount: number;
    readonly girderSpacing: number;
    readonly overhang: number;
    readonly girderCentersX: readonly number[];
    readonly deckThickness: number;
    readonly girderDepth: number;
  };
};

type GeomInput = {
  readonly width: number;
  readonly girderCount: number;
  readonly girderSpacing: number;
  readonly deckThickness: number;
  readonly girderDepth: number;
  readonly topFlangeWidth: number;
  readonly topFlangeThickness: number;
  readonly bottomFlangeWidth: number;
  readonly bottomFlangeThickness: number;
  readonly webThickness: number;
};

export function computeStandardSectionLayout(input: GeomInput): {
  readonly overhang: number;
  readonly girderCentersX: readonly number[];
  readonly ok: boolean;
  readonly reason?: string;
} {
  const overhang = (input.width - (input.girderCount - 1) * input.girderSpacing) / 2;
  if (overhang < 0) {
    return { overhang, girderCentersX: [], ok: false, reason: "negative overhang — fail-closed" };
  }
  if (input.girderCount < 1) {
    return { overhang, girderCentersX: [], ok: false, reason: "girderCount < 1" };
  }
  const first = -((input.girderCount - 1) * input.girderSpacing) / 2;
  const girderCentersX = Array.from({ length: input.girderCount }, (_, i) => first + i * input.girderSpacing);
  return { overhang, girderCentersX, ok: true };
}

function iSectionPolylines(cx: number, input: GeomInput): DrawingEntity[] {
  const webH = input.girderDepth - input.topFlangeThickness - input.bottomFlangeThickness;
  const y0 = 0;
  const yBf = input.bottomFlangeThickness;
  const yTf = input.bottomFlangeThickness + webH;
  const yTop = input.girderDepth;
  const halfTf = input.topFlangeWidth / 2;
  const halfBf = input.bottomFlangeWidth / 2;
  const halfW = input.webThickness / 2;
  // Outer path clockwise from bottom-left of bottom flange
  const points = [
    cx - halfBf, y0,
    cx + halfBf, y0,
    cx + halfBf, yBf,
    cx + halfW, yBf,
    cx + halfW, yTf,
    cx + halfTf, yTf,
    cx + halfTf, yTop,
    cx - halfTf, yTop,
    cx - halfTf, yTf,
    cx - halfW, yTf,
    cx - halfW, yBf,
    cx - halfBf, yBf,
    cx - halfBf, y0,
  ];
  return [
    {
      entityId: `girder-outline-${cx}`,
      sourceEntityId: `girder@${cx}`,
      type: "POLYLINE",
      layerId: "APOLLO_GIRDER",
      geometry: { points },
    },
  ];
}

export function buildStandardSectionDrawingModel(
  project: ProjectModel,
  options?: { readonly generatedAt?: string },
): DrawingModel {
  const draft = getBridgeStructureInputDraft(project);
  const stale = !isBridgeStructureGenerationCurrent(project);
  const inputChecksum = buildInputChecksum(draft);
  const inputRevision = draft.generatedAt ?? "STALE_OR_UNGENERATED";
  const generatedAt = options?.generatedAt ?? new Date().toISOString();
  const warnings = [
    "STANDARD SECTION — DEVELOPMENT PREVIEW",
    "NOT A FABRICATION DRAWING",
    "NOT FOR DESIGN OR CONSTRUCTION",
    "NUMERIC_DESIGN_AUTHORIZATION: NOT_GRANTED",
    "USER REVIEW REQUIRED",
  ];

  const required = [
    draft.width,
    draft.girderCount,
    draft.girderSpacing,
    draft.deckThickness,
    draft.girderDepth,
    draft.topFlangeWidth,
    draft.topFlangeThickness,
    draft.bottomFlangeWidth,
    draft.bottomFlangeThickness,
    draft.webThickness,
  ];
  if (required.some((v) => v === null)) {
    return emptyBlocked(project, inputChecksum, inputRevision, generatedAt, stale, [
      ...warnings,
      "INCOMPLETE_INPUT",
    ]);
  }

  const geom: GeomInput = {
    width: draft.width!,
    girderCount: draft.girderCount!,
    girderSpacing: draft.girderSpacing!,
    deckThickness: draft.deckThickness!,
    girderDepth: draft.girderDepth!,
    topFlangeWidth: draft.topFlangeWidth!,
    topFlangeThickness: draft.topFlangeThickness!,
    bottomFlangeWidth: draft.bottomFlangeWidth!,
    bottomFlangeThickness: draft.bottomFlangeThickness!,
    webThickness: draft.webThickness!,
  };
  const layout = computeStandardSectionLayout(geom);
  if (!layout.ok) {
    return emptyBlocked(project, inputChecksum, inputRevision, generatedAt, stale, [
      ...warnings,
      layout.reason ?? "layout blocked",
    ]);
  }

  const entities: DrawingEntity[] = [];
  // Deck (top of girders): y from girderDepth to girderDepth+deckThickness, x from -width/2 to width/2
  const deckY0 = geom.girderDepth;
  const deckY1 = geom.girderDepth + geom.deckThickness;
  entities.push({
    entityId: "deck",
    sourceEntityId: "rcDeck",
    type: "RECT",
    layerId: "APOLLO_DECK",
    geometry: { x: -geom.width / 2, y: deckY0, w: geom.width, h: geom.deckThickness },
  });

  for (let i = 0; i < layout.girderCentersX.length; i += 1) {
    const cx = layout.girderCentersX[i]!;
    entities.push(...iSectionPolylines(cx, geom));
    entities.push({
      entityId: `girder-label-${i + 1}`,
      sourceEntityId: `G${i + 1}`,
      type: "TEXT",
      layerId: "APOLLO_TEXT",
      geometry: { x: cx, y: -0.15, text: `G${i + 1}`, height: 0.12 },
    });
  }

  entities.push({
    entityId: "centerline",
    sourceEntityId: "CL",
    type: "LINE",
    layerId: "APOLLO_CENTERLINE",
    geometry: { x1: 0, y1: -0.3, x2: 0, y2: deckY1 + 0.3 },
    style: { strokeDasharray: "4 2" },
  });

  const dimensions: DrawingEntity[] = [
    {
      entityId: "dim-width",
      sourceEntityId: "width",
      type: "DIMENSION",
      layerId: "APOLLO_DIMENSION",
      geometry: {
        x1: -geom.width / 2,
        y1: deckY1 + 0.4,
        x2: geom.width / 2,
        y2: deckY1 + 0.4,
        text: `B=${geom.width} m`,
      },
    },
    {
      entityId: "dim-girder-spacing",
      sourceEntityId: "girderSpacing",
      type: "DIMENSION",
      layerId: "APOLLO_DIMENSION",
      geometry: {
        x1: layout.girderCentersX[0]!,
        y1: -0.45,
        x2: layout.girderCentersX[Math.min(1, layout.girderCentersX.length - 1)]!,
        y2: -0.45,
        text: `s=${geom.girderSpacing} m`,
      },
    },
    {
      entityId: "dim-overhang-left",
      sourceEntityId: "overhang",
      type: "DIMENSION",
      layerId: "APOLLO_DIMENSION",
      geometry: {
        x1: -geom.width / 2,
        y1: deckY1 + 0.7,
        x2: layout.girderCentersX[0]!,
        y2: deckY1 + 0.7,
        text: `oh=${layout.overhang} m`,
      },
    },
    {
      entityId: "dim-deck-thickness",
      sourceEntityId: "deckThickness",
      type: "DIMENSION",
      layerId: "APOLLO_DIMENSION",
      geometry: {
        x1: geom.width / 2 + 0.3,
        y1: deckY0,
        x2: geom.width / 2 + 0.3,
        y2: deckY1,
        text: `t_d=${geom.deckThickness} m`,
      },
    },
    {
      entityId: "dim-girder-depth",
      sourceEntityId: "girderDepth",
      type: "DIMENSION",
      layerId: "APOLLO_DIMENSION",
      geometry: {
        x1: geom.width / 2 + 0.55,
        y1: 0,
        x2: geom.width / 2 + 0.55,
        y2: geom.girderDepth,
        text: `H=${geom.girderDepth} m`,
      },
    },
  ];

  const labels: DrawingEntity[] = [
    {
      entityId: "title",
      sourceEntityId: "title",
      type: "TEXT",
      layerId: "APOLLO_TITLE",
      geometry: { x: 0, y: deckY1 + 1.1, text: "STANDARD SECTION — DEVELOPMENT PREVIEW", height: 0.18 },
    },
    {
      entityId: "warning",
      sourceEntityId: "warning",
      type: "TEXT",
      layerId: "APOLLO_WARNING",
      geometry: {
        x: 0,
        y: deckY1 + 1.35,
        text: "NOT A FABRICATION DRAWING — NOT FOR DESIGN OR CONSTRUCTION",
        height: 0.12,
      },
    },
    {
      entityId: "units-scale",
      sourceEntityId: "meta",
      type: "TEXT",
      layerId: "APOLLO_TEXT",
      geometry: {
        x: 0,
        y: -0.75,
        text: `units=m | scale=FIT | drawingId=pending | rev=${inputRevision.slice(0, 20)} | ck=${inputChecksum.slice(0, 12)}`,
        height: 0.08,
      },
    },
  ];

  // Pavement intentionally omitted — no canonical pavement inputs.
  warnings.push("pavement/curb/railing: NOT_AVAILABLE (no canonical inputs; not invented)");

  if (stale) warnings.push("STALE");

  const all = [...entities, ...dimensions, ...labels];
  const xs = all.flatMap((e) => Object.values(e.geometry).filter((v): v is number => typeof v === "number"));
  const ys = xs; // rough; refine below
  void ys;
  const coords: number[] = [];
  for (const e of all) {
    for (const v of Object.values(e.geometry)) {
      if (typeof v === "number") coords.push(v);
      if (Array.isArray(v)) coords.push(...v.filter((n): n is number => typeof n === "number"));
    }
  }
  const minX = Math.min(...coords, -geom.width / 2) - 0.5;
  const maxX = Math.max(...coords, geom.width / 2) + 0.8;
  const minY = Math.min(...coords, -0.8) - 0.2;
  const maxY = Math.max(...coords, deckY1 + 1.5) + 0.2;

  return {
    schemaVersion: DRAWING_MODEL_SCHEMA_VERSION,
    drawingId: `drw-stdsec-${project.project.id}-${inputChecksum.slice(0, 12)}`,
    drawingType: "STANDARD_SECTION",
    projectId: project.project.id,
    inputRevision,
    inputChecksum,
    generatedAt,
    units: "m",
    sheet: {
      size: "A3",
      orientation: "landscape",
      scale: "FIT",
      marginsMm: [15, 15, 15, 15],
      titleBlock: {
        title: "Standard Section",
        subtitle: "Development Preview",
        warning: "NOT A FABRICATION DRAWING",
      },
    },
    viewport: { minX, minY, maxX, maxY },
    layers: DRAWING_LAYERS,
    entities,
    dimensions,
    labels,
    warnings,
    developmentStatus: "UNVERIFIED_DEVELOPMENT_PREVIEW",
    authorizationStatus: "NOT_GRANTED",
    fabricationDrawing: false,
    stale,
    layout: {
      width: geom.width,
      girderCount: geom.girderCount,
      girderSpacing: geom.girderSpacing,
      overhang: layout.overhang,
      girderCentersX: layout.girderCentersX,
      deckThickness: geom.deckThickness,
      girderDepth: geom.girderDepth,
    },
  };
}

function emptyBlocked(
  project: ProjectModel,
  inputChecksum: string,
  inputRevision: string,
  generatedAt: string,
  stale: boolean,
  warnings: string[],
): DrawingModel {
  return {
    schemaVersion: DRAWING_MODEL_SCHEMA_VERSION,
    drawingId: `drw-blocked-${project.project.id}`,
    drawingType: "STANDARD_SECTION",
    projectId: project.project.id,
    inputRevision,
    inputChecksum,
    generatedAt,
    units: "m",
    sheet: {
      size: "A3",
      orientation: "landscape",
      scale: "N/A",
      marginsMm: [15, 15, 15, 15],
      titleBlock: {
        title: "Standard Section",
        subtitle: "BLOCKED",
        warning: "NOT A FABRICATION DRAWING",
      },
    },
    viewport: { minX: -1, minY: -1, maxX: 1, maxY: 1 },
    layers: DRAWING_LAYERS,
    entities: [],
    dimensions: [],
    labels: [],
    warnings,
    developmentStatus: "UNVERIFIED_DEVELOPMENT_PREVIEW",
    authorizationStatus: "NOT_GRANTED",
    fabricationDrawing: false,
    stale,
    layout: {
      width: 0,
      girderCount: 0,
      girderSpacing: 0,
      overhang: 0,
      girderCentersX: [],
      deckThickness: 0,
      girderDepth: 0,
    },
  };
}

export function assertDrawingExportable(model: DrawingModel): void {
  if (model.stale) throw new Error("STALE drawing export rejected");
  if (model.entities.length === 0) throw new Error("Blocked/empty drawing export rejected");
  if (model.fabricationDrawing) throw new Error("Fabrication drawing flag must be false");
}

export function drawingModelChecksum(model: DrawingModel): string {
  return computeContentChecksum(model).hexDigest;
}
