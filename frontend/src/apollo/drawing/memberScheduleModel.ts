/**
 * MemberScheduleModel — derived from QuantityModel (no independent re-takeoff).
 * UNVERIFIED DEVELOPMENT ONLY — NOT FOR DESIGN OR CONSTRUCTION
 */

import type { ProjectModel } from "../../types";
import { computeContentChecksum } from "../../contracts/legacy/checksum";
import { buildQuantityModel, findQuantityValue, type QuantityModel } from "../quantity/quantityModel";
import { getBridgeStructureInputDraft, isBridgeStructureGenerationCurrent } from "../bridgeStructure/generateBsdd";
import { buildInputChecksum } from "../quantity/quantityModel";
import {
  generateSimpleSupportStations,
  generateSpacingStations,
  generateSwayBracingStations,
} from "./stationGenerator";

export const MEMBER_SCHEDULE_SCHEMA_VERSION = "1.0.0-development";

export type MemberScheduleCategory =
  | "MAIN_GIRDER"
  | "CROSS_BEAM"
  | "SWAY_BRACING"
  | "UPPER_LATERAL_BRACING"
  | "LOWER_LATERAL_BRACING"
  | "STIFFENER"
  | "BEARING"
  | "RC_DECK"
  | "PAVEMENT_OPTIONAL";

export type MemberScheduleRow = {
  readonly memberId: string;
  readonly category: MemberScheduleCategory;
  readonly sourceEntityId: string;
  readonly description: string;
  readonly section: string;
  readonly material: string;
  readonly count: number | "NOT_AVAILABLE";
  readonly length: number | "NOT_AVAILABLE";
  readonly volume: number | "NOT_AVAILABLE";
  readonly weight: number | "NOT_AVAILABLE";
  readonly unit: string;
  readonly quantityStatus: string;
  readonly assumptionStatus: string;
  readonly drawingRefs: readonly string[];
  readonly notes: string;
};

export type MemberScheduleModel = {
  readonly schemaVersion: typeof MEMBER_SCHEDULE_SCHEMA_VERSION;
  readonly scheduleId: string;
  readonly projectId: string;
  readonly inputRevision: string;
  readonly inputChecksum: string;
  readonly quantityModelChecksum: string;
  readonly generatedAt: string;
  readonly developmentStatus: "UNVERIFIED_DEVELOPMENT_ONLY";
  readonly authorizationStatus: "NOT_GRANTED";
  readonly stale: boolean;
  readonly rows: readonly MemberScheduleRow[];
  readonly warnings: readonly string[];
};

function qty(model: QuantityModel, id: string): number | null {
  return findQuantityValue(model, id);
}

function cellNum(v: number | null | undefined): number | "NOT_AVAILABLE" {
  if (v === null || v === undefined) return "NOT_AVAILABLE";
  return v;
}

export function buildMemberScheduleModel(
  project: ProjectModel,
  options?: { readonly generatedAt?: string },
): MemberScheduleModel {
  const draft = getBridgeStructureInputDraft(project);
  const stale = !isBridgeStructureGenerationCurrent(project);
  const quantity = buildQuantityModel(project, { generatedAt: options?.generatedAt });
  const inputChecksum = buildInputChecksum(draft);
  const inputRevision = draft.generatedAt ?? "STALE_OR_UNGENERATED";
  const generatedAt = options?.generatedAt ?? new Date().toISOString();
  const material = "NOT_PROVIDED";

  const L = draft.bridgeLength;
  const n = draft.girderCount;
  const supports = L !== null ? generateSimpleSupportStations(L).stations : [];
  const bearingCount = n !== null && supports.length > 0 ? n * supports.length : null;
  const crossBeam = L !== null ? generateSpacingStations(L, draft.crossBeamSpacing) : { ok: false, stations: [], count: 0 };
  const sway = generateSwayBracingStations(crossBeam.stations, draft.swayBracingInterval);

  const girderVol = qty(quantity, "QTY-MG-VALL");
  const deckVol = qty(quantity, "QTY-DK-VOL");
  const girderLen = L;
  const steelUw = draft.steelUnitWeight;
  const rcUw = draft.rcUnitWeight;

  const rows: MemberScheduleRow[] = [
    {
      memberId: "MS-MG",
      category: "MAIN_GIRDER",
      sourceEntityId: "mainGirder",
      description: "主桁 G1..Gn",
      section: draft.topFlangeWidth !== null ? `I approx tf/bf/web from input` : "NOT_PROVIDED",
      material,
      count: cellNum(n),
      length: cellNum(girderLen),
      volume: cellNum(girderVol),
      weight:
        girderVol !== null && steelUw !== null
          ? girderVol * steelUw
          : "NOT_AVAILABLE",
      unit: "m / m3 / kN",
      quantityStatus: girderVol === null ? "NOT_AVAILABLE" : "READY",
      assumptionStatus: steelUw === null ? "WEIGHT_NOT_AVAILABLE" : "USER_PROVIDED_UNVERIFIED",
      drawingRefs: ["G-01", "G-02", "G-06"],
      notes: "volume from QuantityModel QTY-MG-VALL",
    },
    {
      memberId: "MS-XB",
      category: "CROSS_BEAM",
      sourceEntityId: "crossBeam",
      description: "横桁 C1..Cm",
      section: "CROSS BEAM SECTION NOT DEFINED",
      material,
      count: cellNum(qty(quantity, "QTY-XB-N") ?? (crossBeam.ok ? crossBeam.count : null)),
      length: "NOT_AVAILABLE",
      volume: "NOT_AVAILABLE",
      weight: "NOT_AVAILABLE",
      unit: "count",
      quantityStatus: "READY",
      assumptionStatus: "SECTION_NOT_DEFINED",
      drawingRefs: ["G-02"],
      notes: "count/position only — no zero-fill for length/volume/weight",
    },
    {
      memberId: "MS-SW",
      category: "SWAY_BRACING",
      sourceEntityId: "swayBracing",
      description: "対傾構",
      section: "NOT_DEFINED",
      material,
      count: cellNum(qty(quantity, "QTY-SW-N") ?? (sway.ok ? sway.count : null)),
      length: "NOT_AVAILABLE",
      volume: "NOT_AVAILABLE",
      weight: "NOT_AVAILABLE",
      unit: "count",
      quantityStatus: draft.swayBracingInterval === null ? "NOT_AVAILABLE" : "READY",
      assumptionStatus: "SCHEMATIC",
      drawingRefs: ["G-03"],
      notes: "schematic stations only",
    },
    {
      memberId: "MS-UL",
      category: "UPPER_LATERAL_BRACING",
      sourceEntityId: "upperLateral",
      description: "上横構",
      section: "NOT_DEFINED",
      material,
      count: draft.upperLateralBracingEnabled ? "NOT_AVAILABLE" : 0,
      length: "NOT_AVAILABLE",
      volume: "NOT_AVAILABLE",
      weight: "NOT_AVAILABLE",
      unit: "status",
      quantityStatus: draft.upperLateralBracingEnabled ? "ENABLED_INCOMPLETE" : "DISABLED",
      assumptionStatus: "SCHEMATIC",
      drawingRefs: ["G-03"],
      notes: draft.upperLateralBracingEnabled ? "enabled — section not defined" : "disabled",
    },
    {
      memberId: "MS-LL",
      category: "LOWER_LATERAL_BRACING",
      sourceEntityId: "lowerLateral",
      description: "下横構",
      section: "NOT_DEFINED",
      material,
      count: draft.lateralBracingEnabled ? "NOT_AVAILABLE" : 0,
      length: "NOT_AVAILABLE",
      volume: "NOT_AVAILABLE",
      weight: "NOT_AVAILABLE",
      unit: "status",
      quantityStatus: draft.lateralBracingEnabled ? "ENABLED_INCOMPLETE" : "DISABLED",
      assumptionStatus: "SCHEMATIC",
      drawingRefs: ["G-03"],
      notes: draft.lateralBracingEnabled ? "enabled — section not defined" : "disabled",
    },
    {
      memberId: "MS-ST",
      category: "STIFFENER",
      sourceEntityId: "stiffener",
      description: "補剛材",
      section: "STIFFENER PLATE SIZE NOT DEFINED",
      material,
      count: cellNum(qty(quantity, "QTY-ST-N")),
      length: "NOT_AVAILABLE",
      volume: "NOT_AVAILABLE",
      weight: "NOT_AVAILABLE",
      unit: "count",
      quantityStatus: draft.stiffenerSpacing === null ? "NOT_AVAILABLE" : "READY",
      assumptionStatus: "STATION_ONLY",
      drawingRefs: ["G-04"],
      notes: "count/stations only",
    },
    {
      memberId: "MS-BRG",
      category: "BEARING",
      sourceEntityId: "bearing",
      description: "支承",
      section: "NOT_SPECIFIED",
      material,
      count: cellNum(bearingCount),
      length: "NOT_AVAILABLE",
      volume: "NOT_AVAILABLE",
      weight: "NOT_AVAILABLE",
      unit: "count",
      quantityStatus: bearingCount === null ? "NOT_AVAILABLE" : "READY",
      assumptionStatus: "GENERIC_SYMBOL",
      drawingRefs: ["G-05"],
      notes: "type/size/fixed-movable = NOT_SPECIFIED; count = girderCount × supportCount",
    },
    {
      memberId: "MS-DECK",
      category: "RC_DECK",
      sourceEntityId: "rcDeck",
      description: "RC床版",
      section: draft.deckThickness !== null ? `t=${draft.deckThickness}m` : "NOT_PROVIDED",
      material,
      count: 1,
      length: cellNum(L),
      volume: cellNum(deckVol),
      weight: deckVol !== null && rcUw !== null ? deckVol * rcUw : "NOT_AVAILABLE",
      unit: "m3 / kN",
      quantityStatus: deckVol === null ? "NOT_AVAILABLE" : "READY",
      assumptionStatus: rcUw === null ? "WEIGHT_NOT_AVAILABLE" : "USER_PROVIDED_UNVERIFIED",
      drawingRefs: ["G-01", "G-07"],
      notes: "volume from QuantityModel",
    },
    {
      memberId: "MS-PAV",
      category: "PAVEMENT_OPTIONAL",
      sourceEntityId: "pavement",
      description: "舗装（任意）",
      section: "NOT_PROVIDED",
      material: "NOT_PROVIDED",
      count: "NOT_AVAILABLE",
      length: "NOT_AVAILABLE",
      volume: "NOT_AVAILABLE",
      weight: "NOT_AVAILABLE",
      unit: "-",
      quantityStatus: "NOT_AVAILABLE",
      assumptionStatus: "NO_CANONICAL_INPUT",
      drawingRefs: ["G-07"],
      notes: "no pavement inputs — not invented; not zero-filled",
    },
  ];

  return {
    schemaVersion: MEMBER_SCHEDULE_SCHEMA_VERSION,
    scheduleId: `msch-${project.project.id}-${inputChecksum.slice(0, 12)}`,
    projectId: project.project.id,
    inputRevision,
    inputChecksum,
    quantityModelChecksum: computeContentChecksum(quantity).hexDigest,
    generatedAt,
    developmentStatus: "UNVERIFIED_DEVELOPMENT_ONLY",
    authorizationStatus: "NOT_GRANTED",
    stale,
    rows,
    warnings: [
      "UNVERIFIED DEVELOPMENT OUTPUT",
      "NOT FOR DESIGN, FABRICATION OR CONSTRUCTION",
      "USER REVIEW REQUIRED",
      "NUMERIC_DESIGN_AUTHORIZATION: NOT_GRANTED",
      "MemberSchedule derived from QuantityModel — no independent re-takeoff",
      ...(stale ? ["STALE"] : []),
    ],
  };
}

export function memberScheduleToJson(model: MemberScheduleModel): string {
  return `${JSON.stringify(model, null, 2)}\n`;
}

export function memberScheduleToCsv(model: MemberScheduleModel): string {
  const header =
    "memberId,category,sourceEntityId,description,section,material,count,length,volume,weight,unit,quantityStatus,assumptionStatus,drawingRefs,notes,inputRevision,inputChecksum";
  const lines = model.rows.map((r) =>
    [
      r.memberId,
      r.category,
      r.sourceEntityId,
      JSON.stringify(r.description),
      JSON.stringify(r.section),
      r.material,
      r.count,
      r.length,
      r.volume,
      r.weight,
      r.unit,
      r.quantityStatus,
      r.assumptionStatus,
      r.drawingRefs.join("|"),
      JSON.stringify(r.notes),
      model.inputRevision,
      model.inputChecksum,
    ].join(","),
  );
  return `${header}\n${lines.join("\n")}\n`;
}

export function assertMemberScheduleExportable(model: MemberScheduleModel): void {
  if (model.stale) throw new Error("STALE member schedule export rejected");
}
