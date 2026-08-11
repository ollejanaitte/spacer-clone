import type { ProjectManager } from "../../project/projectManager";
import { readRoadInputs } from "../roadModuleAdapter";
import { buildRoadIntermediate, type RoadIntermediateResult } from "../road/intermediateResult";
import { readTerrainDocument } from "../terrainModuleAdapter";
import { readExistingConditions } from "../existingConditionsAdapter";
import type { LinearAlignment } from "../../../liner/core/types";
import type { VerticalElement } from "../../../liner/core/geometry/vertical";
import type { CrossSectionTemplateDraft } from "../../../liner/schema/types";
import {
  createEmptyBridgeLayoutDocument,
  BRIDGE_LAYOUT_SCHEMA_VERSION,
} from "./bridgeLayoutTypes";
import type { BridgeLayoutDocument, BridgeLayoutIssue, BridgeRange } from "./bridgeLayoutTypes";
import { validateBridgeLayoutDocument } from "./bridgeLayoutValidation";

/**
 * Phase 4-02「橋梁区間設定」domain logic.
 *
 * 橋長は原則 bridgeLength = endStation - startStation として自動算出する。
 * Road / Terrain / Existing の正本を複製せず、全て reference で参照する。
 * Road Module の station 体系は physical distance [m]（origin 0、equation なし）
 * を正式定義とし、BridgeLayoutDocument の bridgeRange.startStation/endStation
 * も同体系の測点 [m] として扱う。
 */

export const BRIDGE_RANGE_EPSILON = 1e-6;

export interface RoadAlignmentContext {
  readonly ok: boolean;
  /** Road Module の horizontal alignment id（= roadReference.alignmentId） */
  readonly alignmentId: string | null;
  readonly horizontal: LinearAlignment | undefined;
  readonly vertical: readonly VerticalElement[];
  readonly crossSections: readonly CrossSectionTemplateDraft[];
  /** Alignment 延長 [m]（station範囲の上限） */
  readonly totalLength: number;
  readonly issues: readonly BridgeLayoutIssue[];
  readonly intermediate: RoadIntermediateResult | undefined;
  readonly coordinatePolicyId: string | null;
}

/**
 * Road Module の正式データを参照して alignment コンテキストを組み立てる。
 * Road が存在しない / alignment が存在しない場合も fail-closed の
 * ok=false + issues を返す（exception は投げない）。
 */
export function readRoadAlignmentContext(
  manager: ProjectManager,
  projectId: string,
): RoadAlignmentContext {
  const issues: BridgeLayoutIssue[] = [];
  const inputs = readRoadInputs(manager, projectId);
  const horizontal = inputs.horizontal as LinearAlignment | undefined;

  if (!horizontal || typeof horizontal !== "object") {
    return {
      ok: false,
      alignmentId: null,
      horizontal: undefined,
      vertical: [],
      crossSections: [],
      totalLength: 0,
      issues: [{ path: "roadReference", message: "road module has no alignment" }],
      intermediate: undefined,
      coordinatePolicyId: null,
    };
  }
  const elements = (horizontal as { elements?: readonly unknown[] }).elements;
  if (!Array.isArray(elements) || elements.length === 0) {
    return {
      ok: false,
      alignmentId: horizontal.id,
      horizontal,
      vertical: [],
      crossSections: [],
      totalLength: 0,
      issues: [{ path: "roadReference.horizontal.elements", message: "road alignment has no elements" }],
      intermediate: undefined,
      coordinatePolicyId: horizontal.coordinatePolicyId ?? null,
    };
  }

  const vertical = (inputs.vertical as VerticalElement[] | undefined) ?? [];
  const crossSections = (inputs.crossSections as CrossSectionTemplateDraft[] | undefined) ?? [];
  const intermediate = buildRoadIntermediate(
    {
      horizontal,
      vertical,
      crossSections,
      widthChangePoints: [],
      crossSlopeIntervals: [],
      stationDefinition: { originDisplayedStation: 0, equations: [] },
    },
    { sampleInterval: 10 },
  );

  if (!intermediate.ok) {
    return {
      ok: false,
      alignmentId: horizontal.id,
      horizontal,
      vertical,
      crossSections,
      totalLength: intermediate.totalLength,
      issues: intermediate.issues.map((i) => ({ path: `roadReference.${i.path}`, message: i.message })),
      intermediate,
      coordinatePolicyId: horizontal.coordinatePolicyId ?? null,
    };
  }

  return {
    ok: true,
    alignmentId: horizontal.id,
    horizontal,
    vertical,
    crossSections,
    totalLength: intermediate.totalLength,
    issues: [],
    intermediate,
    coordinatePolicyId: horizontal.coordinatePolicyId ?? null,
  };
}

export function computeBridgeLength(range: Pick<BridgeRange, "startStation" | "endStation">): number {
  return range.endStation - range.startStation;
}

export interface ValidateBridgeRangeInput {
  readonly startStation: number;
  readonly endStation: number;
  /** Road Alignment 延長 [m]。alignment 参照不可の場合は null */
  readonly alignmentTotalLength: number | null;
  /** roadReference（moduleId: road + alignmentId）が有効か */
  readonly roadReferenceValid: boolean;
  readonly alignmentReferenceValid: boolean;
}

/**
 * 必須validation:
 * - finite number（NaN / Infinity reject）
 * - startStation < endStation（== も reject）
 * - start/end が Road Alignment 範囲内
 * - roadReference / alignmentReference 有効
 */
export function validateBridgeRangeInput(input: ValidateBridgeRangeInput): readonly BridgeLayoutIssue[] {
  const issues: BridgeLayoutIssue[] = [];
  const startOk = typeof input.startStation === "number" && Number.isFinite(input.startStation);
  const endOk = typeof input.endStation === "number" && Number.isFinite(input.endStation);

  if (!startOk) {
    issues.push({ path: "bridgeLayoutDocument.bridgeRange.startStation", message: "startStation must be a finite number" });
  }
  if (!endOk) {
    issues.push({ path: "bridgeLayoutDocument.bridgeRange.endStation", message: "endStation must be a finite number" });
  }
  if (startOk && endOk) {
    if (input.startStation === input.endStation) {
      issues.push({ path: "bridgeLayoutDocument.bridgeRange", message: "startStation must not equal endStation" });
    } else if (input.startStation > input.endStation) {
      issues.push({ path: "bridgeLayoutDocument.bridgeRange", message: "startStation must be less than endStation" });
    }
  }

  if (input.alignmentTotalLength !== null) {
    if (startOk && (input.startStation < -BRIDGE_RANGE_EPSILON || input.startStation > input.alignmentTotalLength + BRIDGE_RANGE_EPSILON)) {
      issues.push({ path: "bridgeLayoutDocument.bridgeRange.startStation", message: `startStation ${input.startStation} is outside the road alignment range [0, ${input.alignmentTotalLength}]` });
    }
    if (endOk && (input.endStation < -BRIDGE_RANGE_EPSILON || input.endStation > input.alignmentTotalLength + BRIDGE_RANGE_EPSILON)) {
      issues.push({ path: "bridgeLayoutDocument.bridgeRange.endStation", message: `endStation ${input.endStation} is outside the road alignment range [0, ${input.alignmentTotalLength}]` });
    }
  }

  if (!input.roadReferenceValid) {
    issues.push({ path: "bridgeLayoutDocument.roadReference", message: "roadReference is invalid (road module has no alignment)" });
  }
  if (!input.alignmentReferenceValid) {
    issues.push({ path: "bridgeLayoutDocument.roadReference.alignmentId", message: "alignmentReference is invalid" });
  }

  return issues;
}

export interface BuildBridgeRangeResult {
  readonly ok: boolean;
  readonly issues: readonly BridgeLayoutIssue[];
  readonly document: BridgeLayoutDocument | undefined;
}

export interface BuildBridgeRangeInput {
  readonly bridgeId: string;
  readonly name: string;
  readonly startStation: number;
  readonly endStation: number;
}

/**
 * 橋梁区間入力から BridgeLayoutDocument を構築する。
 * - roadReference を Road Module の alignment に解決（正本複製なし）
 * - bridgeRange.startStation / endStation を格納
 * - bridgeLength を自動算出
 * - A1/A2 の station を start/end に設定
 * - terrain / existing の reference を現在の Project から解決
 * fail-closed: いずれかの必須validation違反で ok=false。
 */
export function buildBridgeLayoutFromRange(
  manager: ProjectManager,
  projectId: string,
  input: BuildBridgeRangeInput,
): BuildBridgeRangeResult {
  const context = readRoadAlignmentContext(manager, projectId);
  const issues = validateBridgeRangeInput({
    startStation: input.startStation,
    endStation: input.endStation,
    alignmentTotalLength: context.ok ? context.totalLength : null,
    roadReferenceValid: context.ok,
    alignmentReferenceValid: context.ok && context.alignmentId !== null,
  });

  if (issues.length > 0) {
    return { ok: false, issues, document: undefined };
  }

  const terrainDoc = readTerrainDocument(manager, projectId);
  const existingDoc = readExistingConditions(manager, projectId);
  const now = new Date().toISOString();

  const document: BridgeLayoutDocument = {
    ...createEmptyBridgeLayoutDocument(),
    bridgeId: input.bridgeId,
    name: input.name,
    metadata: { createdBy: "rebuild", createdAt: now, updatedAt: now, note: "Phase 4-02 橋梁区間設定" },
    roadReference: {
      moduleId: "road",
      alignmentId: context.alignmentId,
      stationReferenceId: null,
      coordinatePolicyId: context.coordinatePolicyId,
    },
    bridgeRange: {
      startStation: input.startStation,
      endStation: input.endStation,
      bridgeLength: computeBridgeLength({ startStation: input.startStation, endStation: input.endStation }),
    },
    abutments: {
      A1: { supportId: "A1", station: input.startStation, skewAngleRad: null },
      A2: { supportId: "A2", station: input.endStation, skewAngleRad: null },
    },
    piers: [],
    spans: [],
    skew: { signConvention: "counterclockwise-positive", angleRad: null },
    terrainReference: {
      moduleId: "terrain",
      surfaceReference: terrainDoc?.surfaceReference ?? null,
      coordinateContextId: terrainDoc?.coordinateContext?.localOrigin ? "project" : null,
    },
    existingConditionsReference: {
      moduleId: "terrain",
      documentReferenceId: existingDoc?.schemaVersion ?? null,
    },
    validation: {
      schemaVersion: BRIDGE_LAYOUT_SCHEMA_VERSION,
      validatedAt: now,
      ok: true,
      issues: [],
    },
  };

  const docIssues = validateBridgeLayoutDocument(document);
  if (docIssues.length > 0) {
    return { ok: false, issues: docIssues, document: undefined };
  }
  return { ok: true, issues: [], document };
}

/**
 * 既存 BridgeLayoutDocument に対して測点を変更し、橋長・A1/A2 station を
 * 再計算する。Road Alignment 範囲などの外部validationは呼び出し側が
 * validateBridgeRangeInput で行う前提（ここでは構造的な再計算のみ）。
 */
export function applyBridgeRangeToDocument(
  document: BridgeLayoutDocument,
  startStation: number,
  endStation: number,
): BridgeLayoutDocument {
  const now = new Date().toISOString();
  const next: BridgeLayoutDocument = {
    ...document,
    bridgeRange: {
      startStation,
      endStation,
      bridgeLength: computeBridgeLength({ startStation, endStation }),
    },
    abutments: {
      A1: { ...document.abutments.A1, station: startStation },
      A2: { ...document.abutments.A2, station: endStation },
    },
    metadata: {
      ...document.metadata,
      updatedAt: now,
    },
    validation: {
      schemaVersion: BRIDGE_LAYOUT_SCHEMA_VERSION,
      validatedAt: now,
      ok: false,
      issues: [],
    },
  };
  return next;
}
