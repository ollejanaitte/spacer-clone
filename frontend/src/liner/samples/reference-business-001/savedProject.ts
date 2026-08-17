/**
 * Reference Business 001 — Saved Complete Project / Reopen (Lane S / S-9).
 *
 * RB001 完成 Project を PDC Project として保存し、Save → Close →
 * Application restart 相当 → Reopen で再現されることを保証する。
 *
 * 構成 (PDC module slots):
 *   - terrain:        Gujo terrainDocument + assetManifest (Lane T)
 *   - road:           RB001 road workflowState (RoadWorkflowState)
 *   - bridgeLayout:   RB001 bridge layout document + workflowState
 *   - superstructure: RB001-SUPER-1
 *   - substructure:   RB001-SUB-1
 *   - analysis:       RB001-ANL-1 (NOT_RUN)
 *   - cim:            統合3D表示用 (Lane V contract は scene を毎回生成・非保存)
 *
 * Save/Close/Reopen は PDC projectDataCore の serialize/deserialize を
 * 既存経路として利用する (再実装しない)。
 */

import { createEmptyProject, parseProject, serializeProject, deserializeProject } from "../../../next/project/projectDataCore";
import type { Project } from "../../../next/project/schema";
import { persistTerrain, extractTerrainDocument } from "../../../terrain/terrainPersistence";
import { buildGujoSampleTerrainDocument, buildGujoSampleAsset, GUJO_COORDINATE_CONTEXT, GUJO_COORDINATE_CONTEXT_ID, GUJO_SOURCE_DATASET } from "../../../terrain/gujoSample";
import { writeRoadWorkflowState, writeBridgeWorkflowState } from "../../../workflow/workflowState";
import { buildRb001RoadWorkflowState, computeSpanArrangement, RB001_BRIDGE_WORKFLOW_NAME } from "../../../workflow/roadBridgeSamples";
import { buildRb001RoadDomainDraft } from "./roadAlignment";
import { buildCanonicalRoadData } from "../../../next/modules/road/roadDataSchema";
import { writeCanonicalRoadDataToProject } from "../../../next/modules/road/roadModuleCanonicalWriter";
import { buildRb001Superstructure } from "./superstructure";
import { buildRb001Substructure } from "./substructure";
import { buildRb001Analysis } from "./analysis";
import { RB001_BRIDGE_ID, RB001_BRIDGE_NAME, RB001_BRIDGE_LENGTH } from "./bridgeArrangement";
import { buildRb001BridgeLayout } from "./bridgeArrangement";
import { REF_BUSINESS_001_ROAD_ID, REF_BUSINESS_001_ROAD_NAME } from "./roadAlignment";
import {
  writeSuperstructureModuleToProject,
  writeSubstructureModuleToProject,
  writeAnalysisModuleToProject,
  writeBridgeLayoutModuleToProject,
} from "../../../next/persistence/unifiedModuleWriter";

export const RB001_COMPLETE_PROJECT_NAME = "RB001 郡上市八幡 長良川橋 完成Project" as const;

export interface Rb001CompleteProjectResult {
  readonly project: Project;
  readonly summary: {
    readonly terrainDocumentId: string | undefined;
    readonly roadId: string | undefined;
    readonly bridgeId: string | undefined;
    readonly superstructureDocumentId: string;
    readonly substructureDocumentId: string;
    readonly analysisStatus: string;
    readonly moduleKeys: string[];
  };
}

/**
 * RB001 完成 Project を構築する。
 * 各 module を既存 adapter/writer 経由で同一 PDC Project へ格納する。
 */
export function buildRb001CompleteProject(): Rb001CompleteProjectResult {
  let project = createEmptyProject(RB001_COMPLETE_PROJECT_NAME);

  // terrain (Lane T asset + document) + siteContext metadata (Lane B スロット)
  project = persistTerrain(project, buildGujoSampleTerrainDocument(), buildGujoSampleAsset());
  project = {
    ...project,
    metadata: {
      ...project.metadata,
      siteContextCoordinateContexts: [GUJO_COORDINATE_CONTEXT],
      siteContextProjectCoordinateContextId: GUJO_COORDINATE_CONTEXT_ID,
      siteContextSourceDatasets: [GUJO_SOURCE_DATASET],
      existingConditions: {
        schemaVersion: "0.1.0",
        entities: [],
      },
    },
  };

  // road (S-3 workflowState + G-6 canonical roadData)
  project = writeRoadWorkflowState(project, buildRb001RoadWorkflowState("2026-08-16T00:00:00.000Z"));
  // G-6: canonical Road → analysis input adapter。RB001 trusted road fixture から
  // domainDraft を構築し、modules.road.data.roadData (canonical) として格納する。
  // 分析ページ (buildDerivedAnalysisDocument → loadRoadEditorDraft) が同じ
  // canonical Road を読み込めるようになる。架空の道路値は使わない。
  project = writeCanonicalRoadDataToProject(
    project,
    buildCanonicalRoadData(buildRb001RoadDomainDraft(), {
      source: "roadInput",
      migratedAt: "2026-08-16T00:00:00.000Z",
      roadLabel: REF_BUSINESS_001_ROAD_NAME,
      legacyId: REF_BUSINESS_001_ROAD_ID,
    }),
  );

  // bridge layout (S-4 document) + workflowState
  const layout = buildRb001BridgeLayout();
  const layoutWrite = writeBridgeLayoutModuleToProject(project, layout);
  if (!layoutWrite.ok) {
    throw new Error(`RB001-BRIDGE-LAYOUT-PERSIST-FAILED: ${layoutWrite.issues.map((i) => `${i.path}: ${i.message}`).join("; ")}`);
  }
  project = layoutWrite.project;
  project = writeBridgeWorkflowState(project, {
    bridgeId: RB001_BRIDGE_ID,
    name: RB001_BRIDGE_NAME,
    roadId: REF_BUSINESS_001_ROAD_ID,
    bridgeRange: { startStation: 1200, endStation: 1500, bridgeLength: RB001_BRIDGE_LENGTH },
    piers: layout.piers.map((p) => ({ supportId: p.supportId, station: p.station })),
    spans: layout.spans.map((s) => ({
      spanId: s.spanId,
      index: s.index,
      startSupportId: s.startSupportId,
      endSupportId: s.endSupportId,
      startStation: s.startStation,
      endStation: s.endStation,
      length: s.length,
    })),
    placedAt: "2026-08-16T00:00:00.000Z",
  });

  // superstructure (RB001-SUPER-1) + bearings (S-5)
  const superstructure = buildRb001Superstructure();
  const superWrite = writeSuperstructureModuleToProject(project, superstructure);
  if (!superWrite.ok) {
    throw new Error(`RB001-SUPER-PERSIST-FAILED: ${superWrite.issues.map((i) => `${i.path}: ${i.message}`).join("; ")}`);
  }
  project = superWrite.project;

  // substructure (RB001-SUB-1) (S-6)
  const substructure = buildRb001Substructure();
  const subWrite = writeSubstructureModuleToProject(project, substructure);
  if (!subWrite.ok) {
    throw new Error(`RB001-SUB-PERSIST-FAILED: ${subWrite.issues.map((i) => `${i.path}: ${i.message}`).join("; ")}`);
  }
  project = subWrite.project;

  // analysis (S-7; NOT_RUN 維持 — 架空結果を作らない)
  const analysis = buildRb001Analysis();
  const analysisWrite = writeAnalysisModuleToProject(project, analysis.document);
  if (!analysisWrite.ok) {
    throw new Error(`RB001-ANL-PERSIST-FAILED: ${analysisWrite.issues.map((i) => `${i.path}: ${i.message}`).join("; ")}`);
  }
  project = analysisWrite.project;

  const summary = {
    terrainDocumentId: extractTerrainDocument(project)?.terrainId,
    roadId: REF_BUSINESS_001_ROAD_ID,
    bridgeId: RB001_BRIDGE_ID,
    superstructureDocumentId: superstructure.documentId,
    substructureDocumentId: substructure.documentId,
    analysisStatus: analysis.document.analysisStatus,
    moduleKeys: Object.keys(project.modules),
  };

  return { project, summary };
}

/**
 * Save → Close → Reopen を再現する純関数。
 * serializeProject → (Close: project 廃棄) → deserializeProject で再構成し、
 * parseProject 合格を保証する。
 */
export function saveCloseReopenRb001Project(
  project: Project,
): { ok: true; reopened: Project } | { ok: false; issues: string[] } {
  const json = serializeProject(project);
  const parsed = deserializeProject(json);
  if (!parsed.ok) {
    return { ok: false, issues: parsed.issues };
  }
  return { ok: true, reopened: parsed.project };
}

export { RB001_BRIDGE_ID, RB001_BRIDGE_NAME, RB001_BRIDGE_LENGTH };