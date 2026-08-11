import type { ProjectManager } from "../../project/projectManager";
import { buildRoadIntermediate } from "../road/intermediateResult";
import { readTerrainDocument } from "../terrainModuleAdapter";
import { createReferenceMountain } from "../terrain/referenceMountain";
import { getGridElevation, type TerrainGrid } from "../terrain/terrainSurface";
import { readExistingConditions } from "../existingConditionsAdapter";
import type { ExistingConditionEntity } from "../existingConditions";
import type { LinearAlignment } from "../../../liner/core/types";
import type { VerticalElement } from "../../../liner/core/geometry/vertical";
import type { CrossSectionTemplateDraft } from "../../../liner/schema/types";
import type { AbutmentPlacementCandidate, BridgeLayoutIssue } from "./bridgeLayoutTypes";
import { readRoadAlignmentContext, validateBridgeRangeInput, type RoadAlignmentContext } from "./bridgeLayoutDomain";
import type { BridgeLayoutDocument } from "./bridgeLayoutTypes";

/**
 * Phase 4-02 A1/A2配置候補 + Terrain/Existing参照.
 *
 * A1/A2 は「橋梁端部の配置点 / downstream handoff用の最小配置情報」。
 * 橋台躯体・パラペット・翼壁・基礎・杭・詳細CIM・構造照査は対象外。
 *
 * XYZ・標高・接線方向は Road Module の正式 station→XYZ 変換
 * （buildRoadIntermediate.sample）へ委譲し、ここで再実装しない。
 */

export interface ComputeCandidateInput {
  readonly horizontal: LinearAlignment;
  readonly vertical: readonly VerticalElement[];
  readonly crossSections: readonly CrossSectionTemplateDraft[];
  readonly station: number;
}

export type ComputeCandidateResult =
  | { ok: true; candidate: AbutmentPlacementCandidate }
  | { ok: false; issues: readonly BridgeLayoutIssue[] };

/** startStation→A1 / endStation→A2 の配置候補をRoad Module正式APIで算出する。 */
export function computeAbutmentPlacementCandidate(input: ComputeCandidateInput): ComputeCandidateResult {
  if (typeof input.station !== "number" || !Number.isFinite(input.station)) {
    return { ok: false, issues: [{ path: "bridgeLayoutDocument.abutments", message: "station must be a finite number" }] };
  }
  const intermediate = buildRoadIntermediate(
    {
      horizontal: input.horizontal,
      vertical: input.vertical,
      crossSections: input.crossSections,
      widthChangePoints: [],
      crossSlopeIntervals: [],
      stationDefinition: { originDisplayedStation: 0, equations: [] },
    },
    { sampleInterval: 10 },
  );
  const point = intermediate.sample(input.station);
  if (!point) {
    return {
      ok: false,
      issues: [{ path: "bridgeLayoutDocument.abutments", message: `station ${input.station} could not be evaluated on the road alignment` }],
    };
  }
  return {
    ok: true,
    candidate: {
      domainX: point.x,
      domainY: point.y,
      elevation: point.z,
      tangentAzimuthRad: point.azimuth,
      terrainElevation: null,
      roadReferenceId: input.horizontal.id,
      coordinateContextId: input.horizontal.coordinatePolicyId ?? null,
      capturedAt: new Date().toISOString(),
    },
  };
}

/**
 * Terrain 標高を参照（getGridElevation 相当）。
 * grid がない / 点がTIN外の場合は null（明確な参照不能として扱う）。
 */
export function lookupTerrainElevation(grid: TerrainGrid | null | undefined, x: number, y: number): number | null {
  if (!grid) return null;
  return getGridElevation(grid, x, y);
}

/**
 * Project の Terrain サーフェス（grid）を参照する。
 * Phase 4-02 では terrain surfaceReference が解決する場合、
 * Reference Mountain の地形サーフェスをプロジェクト地形として使用する
 * （Terrain ModuleのgridはProject JSONに保持されないため）。
 */
export function getProjectTerrainGrid(manager: ProjectManager, projectId: string): TerrainGrid | null {
  const terrainDoc = readTerrainDocument(manager, projectId);
  if (!terrainDoc || terrainDoc.surfaceReference === null) return null;
  return createReferenceMountain().terrainGrid;
}

export interface BridgeRangeBBox {
  readonly minX: number;
  readonly minY: number;
  readonly maxX: number;
  readonly maxY: number;
}

/** 橋梁区間のRoad中心線サンプルから domain 上の矩形範囲を算出する。 */
export function computeBridgeRangeBBox(
  context: RoadAlignmentContext,
  startStation: number,
  endStation: number,
  margin = 60,
): BridgeRangeBBox | null {
  const intermediate = context.intermediate;
  if (!intermediate || !context.ok) return null;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  const step = 10;
  for (let s = startStation; s <= endStation + 1e-9; s += step) {
    const p = intermediate.sample(Math.min(s, endStation));
    if (!p) continue;
    minX = Math.min(minX, p.x);
    minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x);
    maxY = Math.max(maxY, p.y);
  }
  if (!Number.isFinite(minX)) return null;
  return { minX: minX - margin, minY: minY - margin, maxX: maxX + margin, maxY: maxY + margin };
}

function pointInBBox(x: number, y: number, bbox: BridgeRangeBBox): boolean {
  return x >= bbox.minX && x <= bbox.maxX && y >= bbox.minY && y <= bbox.maxY;
}

/** 線分 (a1,b1)-(a2,b2) が bbox と交差するか（スラブ法による軽量判定）。 */
function segmentIntersectsBBox(a1x: number, a1y: number, a2x: number, a2y: number, bbox: BridgeRangeBBox): boolean {
  if (pointInBBox(a1x, a1y, bbox) || pointInBBox(a2x, a2y, bbox)) return true;
  const dx = a2x - a1x;
  const dy = a2y - a1y;
  // 完全にbbox外にある線分の場合は高速に除外
  if (Math.max(a1x, a2x) < bbox.minX || Math.min(a1x, a2x) > bbox.maxX) return false;
  if (Math.max(a1y, a2y) < bbox.minY || Math.min(a1y, a2y) > bbox.maxY) return false;
  // 線分と4辺との交差判定（cross product sign test）
  const intersects = (fx: number, fy: number, tx: number, ty: number): boolean => {
    const d1 = (tx - a1x) * (fy - a1y) - (ty - a1y) * (fx - a1x);
    const d2 = (tx - a2x) * (fy - a2y) - (ty - a2y) * (fx - a2x);
    if ((d1 > 0 && d2 > 0) || (d1 < 0 && d2 < 0)) return false;
    const d3 = (a2x - a1x) * (fy - a1y) - (a2y - a1y) * (fx - a1x);
    const d4 = (a2x - a1x) * (ty - a1y) - (a2y - a1y) * (tx - a1x);
    if ((d3 > 0 && d4 > 0) || (d3 < 0 && d4 < 0)) return false;
    return true;
  };
  if (intersects(bbox.minX, bbox.minY, bbox.maxX, bbox.minY)) return true;
  if (intersects(bbox.maxX, bbox.minY, bbox.maxX, bbox.maxY)) return true;
  if (intersects(bbox.maxX, bbox.maxY, bbox.minX, bbox.maxY)) return true;
  if (intersects(bbox.minX, bbox.maxY, bbox.minX, bbox.minY)) return true;
  return false;
}

/** entity geometry が bridge range bbox に交差/内包するか判定（干渉判定エンジンではない）。 */
export function isExistingNearRange(entity: ExistingConditionEntity, bbox: BridgeRangeBBox): boolean {
  const points = entity.geometry.points;
  if (points.length === 0) return false;
  if (pointInBBox(points[0].x, points[0].y, bbox)) return true;
  for (let i = 1; i < points.length; i += 1) {
    const p = points[i];
    if (pointInBBox(p.x, p.y, bbox)) return true;
    const prev = points[i - 1];
    if (segmentIntersectsBBox(prev.x, prev.y, p.x, p.y, bbox)) return true;
  }
  return false;
}

/** 橋梁区間およびA1/A2周辺のExisting entityを参照する。 */
export function collectExistingNearRange(
  entities: readonly ExistingConditionEntity[] | undefined,
  bbox: BridgeRangeBBox | null,
): readonly ExistingConditionEntity[] {
  if (!entities || !bbox) return [];
  return entities.filter((e) => isExistingNearRange(e, bbox));
}

export interface AbutmentCandidateView {
  readonly role: "A1" | "A2";
  readonly station: number;
  readonly candidate: AbutmentPlacementCandidate;
}

export interface BridgeLayoutTerrainView {
  readonly surfaceReference: string | null;
  readonly available: boolean;
  readonly elevationA1: number | null;
  readonly elevationA2: number | null;
  /** road elevation - terrain elevation（正なら道路が地盤より上） */
  readonly diffA1: number | null;
  readonly diffA2: number | null;
}

export interface BridgeLayoutExistingView {
  readonly available: boolean;
  readonly entityCount: number;
  readonly entities: readonly ExistingConditionEntity[];
}

export interface BridgeLayoutView {
  readonly document: BridgeLayoutDocument | undefined;
  readonly road: RoadAlignmentContext;
  readonly bridgeLength: number | null;
  readonly candidates: {
    readonly A1: AbutmentCandidateView | undefined;
    readonly A2: AbutmentCandidateView | undefined;
  };
  readonly terrain: BridgeLayoutTerrainView;
  readonly existing: BridgeLayoutExistingView;
  readonly validation: readonly BridgeLayoutIssue[];
}

/**
 * UI / 3D 用の Bridge Layout ビューモデルを組み立てる。
 * Road / Terrain / Existing は参照のみ（正本複製なし）。
 * 測点変更時は bridgeLength・A1/A2候補・Terrain/Existing参照が再計算される。
 */
export function assembleBridgeLayoutView(
  manager: ProjectManager,
  projectId: string,
  document: BridgeLayoutDocument | undefined,
): BridgeLayoutView {
  const road = readRoadAlignmentContext(manager, projectId);

  if (!document) {
    return {
      document: undefined,
      road,
      bridgeLength: null,
      candidates: { A1: undefined, A2: undefined },
      terrain: { surfaceReference: null, available: false, elevationA1: null, elevationA2: null, diffA1: null, diffA2: null },
      existing: { available: false, entityCount: 0, entities: [] },
      validation: road.ok ? [] : road.issues,
    };
  }

  const range = document.bridgeRange;
  const bridgeLength = Number.isFinite(range.startStation) && Number.isFinite(range.endStation)
    ? range.endStation - range.startStation
    : null;

  const validation = validateBridgeRangeInput({
    startStation: range.startStation,
    endStation: range.endStation,
    alignmentTotalLength: road.ok ? road.totalLength : null,
    roadReferenceValid: road.ok,
    alignmentReferenceValid: road.ok && road.alignmentId !== null && road.alignmentId === document.roadReference.alignmentId,
  });

  const terrainDoc = readTerrainDocument(manager, projectId);
  const terrainAvailable = road.ok && terrainDoc !== undefined && terrainDoc.surfaceReference !== null;
  const grid = getProjectTerrainGrid(manager, projectId);

  let candidateA1: AbutmentCandidateView | undefined;
  let candidateA2: AbutmentCandidateView | undefined;
  if (road.ok && road.horizontal && road.intermediate) {
    const a1 = computeAbutmentPlacementCandidate({
      horizontal: road.horizontal,
      vertical: road.vertical,
      crossSections: road.crossSections,
      station: range.startStation,
    });
    if (a1.ok) {
      const elevation = lookupTerrainElevation(grid, a1.candidate.domainX, a1.candidate.domainY);
      candidateA1 = {
        role: "A1",
        station: range.startStation,
        candidate: { ...a1.candidate, terrainElevation: elevation },
      };
    }
    const a2 = computeAbutmentPlacementCandidate({
      horizontal: road.horizontal,
      vertical: road.vertical,
      crossSections: road.crossSections,
      station: range.endStation,
    });
    if (a2.ok) {
      const elevation = lookupTerrainElevation(grid, a2.candidate.domainX, a2.candidate.domainY);
      candidateA2 = {
        role: "A2",
        station: range.endStation,
        candidate: { ...a2.candidate, terrainElevation: elevation },
      };
    }
  }

  const existingDoc = readExistingConditions(manager, projectId);
  const bbox = computeBridgeRangeBBox(road, range.startStation, range.endStation);
  const nearEntities = collectExistingNearRange(existingDoc?.entities, bbox);

  const terrain: BridgeLayoutTerrainView = {
    surfaceReference: terrainDoc?.surfaceReference ?? null,
    available: terrainAvailable,
    elevationA1: candidateA1?.candidate.terrainElevation ?? null,
    elevationA2: candidateA2?.candidate.terrainElevation ?? null,
    diffA1: candidateA1?.candidate.terrainElevation !== null && candidateA1?.candidate.terrainElevation !== undefined
      ? candidateA1.candidate.elevation - (candidateA1.candidate.terrainElevation as number)
      : null,
    diffA2: candidateA2?.candidate.terrainElevation !== null && candidateA2?.candidate.terrainElevation !== undefined
      ? candidateA2.candidate.elevation - (candidateA2.candidate.terrainElevation as number)
      : null,
  };

  const existing: BridgeLayoutExistingView = {
    available: existingDoc !== undefined,
    entityCount: nearEntities.length,
    entities: nearEntities,
  };

  return {
    document,
    road,
    bridgeLength,
    candidates: { A1: candidateA1, A2: candidateA2 },
    terrain,
    existing,
    validation,
  };
}
