/**
 * Reference Business 001 — Tutorial Sample (Lane S / S-10).
 *
 * 10〜20分で主要操作 (Site Context / Road / Bridge / 3D / Save/Reopen) を
 * 体験するための軽量サンプル。Reference Business 001 (本番相当・Acceptance 用)
 * とは分離し、合成地形・簡易線形・単純橋で構成する。
 *
 * 設計ルール (tutorial-samples.md):
 * - 軽量データ (合成地形 16×16・道路 300m・1径間橋) で初回表示が高速。
 * - RB001 と別 fixture (混在させない)。
 * - Acceptance 判定には使用しない。
 *
 * 既存モジュールを再利用 (ゼロから再実装しない):
 * - terrain: 合成 Heightfield → buildTerrainDocument (Lane T 資産)
 * - road:    LinearAlignment (Liner core geometry)
 * - bridge:  BridgeLayout workflowState (U-4 資産)
 * - save:    PDC serialize/deserialize (Lane A 資産)
 */

import { createEmptyProject, parseProject } from "../../../next/project/projectDataCore";
import type { Project } from "../../../next/project/schema";
import { Heightfield } from "../../../terrain/heightfield";
import { buildTerrainDocument, buildTerrainAsset } from "../../../terrain/generation";
import { persistTerrain } from "../../../terrain/terrainPersistence";
import { writeRoadWorkflowState, writeBridgeWorkflowState, type RoadWorkflowState, type BridgeWorkflowState } from "../../../workflow/workflowState";
import type { LinearAlignment } from "../../core/types";

export const TUTORIAL_SAMPLE_PROJECT_NAME = "チュートリアル 体験サンプル (5-Span 高架橋)" as const;
export const TUTORIAL_ROAD_ID = "TUT-ROAD-1" as const;
export const TUTORIAL_BRIDGE_ID = "TUT-BRIDGE-1" as const;
export const TUTORIAL_TERRAIN_ID = "terrain-tutorial-synthetic" as const;
export const TUTORIAL_TERRAIN_ASSET_PATH = "assets/terrain/tutorial-synthetic.sct1" as const;

/** 軽量合成地形: 16×16・cellSize 20m・標高 30-60m の緩やかな丘。 */
export function buildTutorialHeightfield(): Heightfield {
  const width = 16;
  const height = 16;
  const cellSize = 20;
  const originX = 0;
  const originY = 0;
  const data = new Float32Array(width * height);
  for (let j = 0; j < height; j += 1) {
    for (let i = 0; i < width; i += 1) {
      data[j * width + i] = 30 + 30 * ((i + j) / (width + height - 2));
    }
  }
  return new Heightfield({ width, height, cellSize, originX, originY, rowMajor: true }, data);
}

/** 簡易道路: 300m の直線 + 右カーブ。 */
export function buildTutorialAlignment(): LinearAlignment {
  return {
    id: TUTORIAL_ROAD_ID,
    linerModelId: "MODEL-TUTORIAL",
    coordinatePolicyId: "COORD-TUTORIAL",
    elements: [
      { id: "T-S1", type: "straight", start: { x: 0, y: 0 }, azimuth: 0, length: 200 },
      { id: "T-A1", type: "arc", start: { x: 200, y: 0 }, azimuth: 0, length: 100, radius: 300, turn: "right" },
    ],
  };
}

/**
 * チュートリアル Project を構築する。
 * Site Context (terrain) → Road → Bridge までを同一 Project で接続。
 */
export async function buildTutorialSampleProject(): Promise<Project> {
  let project = createEmptyProject(TUTORIAL_SAMPLE_PROJECT_NAME);

  // Site Context: 合成地形 + SCT1 資産化
  const heightfield = buildTutorialHeightfield();
  const asset = await buildTerrainAsset(heightfield, TUTORIAL_TERRAIN_ASSET_PATH);
  const document = buildTerrainDocument({
    terrainId: TUTORIAL_TERRAIN_ID,
    heightfield,
    source: { sourceType: "dem", sourceName: "チュートリアル合成地形 (DEM相当)", importedAt: "2026-08-17T00:00:00.000Z" },
    projectOrigin: { x: 0, y: 0, z: 0 },
    assetPath: TUTORIAL_TERRAIN_ASSET_PATH,
  });
  project = persistTerrain(project, document, asset);

  // Road
  const roadState: RoadWorkflowState = {
    roadId: TUTORIAL_ROAD_ID,
    alignmentId: TUTORIAL_ROAD_ID,
    name: "チュートリアル道路 (300m)",
    totalLengthM: 300,
    bridgeCandidate: { startStation: 100, endStation: 200, nominalSpanM: 100, note: "1径間" },
    placedAt: "2026-08-17T00:00:00.000Z",
  };
  project = writeRoadWorkflowState(project, roadState);

  // Bridge (1径間)
  const bridgeState: BridgeWorkflowState = {
    bridgeId: TUTORIAL_BRIDGE_ID,
    name: "チュートリアル橋梁 (1径間)",
    roadId: TUTORIAL_ROAD_ID,
    bridgeRange: { startStation: 100, endStation: 200, bridgeLength: 100 },
    piers: [
      { supportId: "A1", station: 100 },
      { supportId: "A2", station: 200 },
    ],
    spans: [
      {
        spanId: "S1",
        index: 0,
        startSupportId: "A1",
        endSupportId: "A2",
        startStation: 100,
        endStation: 200,
        length: 100,
      },
    ],
    placedAt: "2026-08-17T00:00:00.000Z",
  };
  project = writeBridgeWorkflowState(project, bridgeState);

  return project;
}

/** チュートリアル Project が canonical parse に合格することを確認する。 */
export function validateTutorialProject(project: Project): boolean {
  const parsed = parseProject(project);
  return parsed.ok;
}