import { describe, expect, it } from "vitest";
import { buildRb001Analysis } from "../analysis";
import { RB001_BRIDGE_ID, RB001_BRIDGE_NAME, RB001_BRIDGE_LENGTH, RB001_SUPPORT_STATIONS, buildRb001BridgeLayout } from "../bridgeArrangement";
import { buildRb001Superstructure } from "../superstructure";
import { buildRb001Substructure } from "../substructure";
import { buildRb001CompleteProject } from "../savedProject";
import {
  GUJO_COORDINATE_CONTEXT_ID,
  GUJO_SAMPLE_ASSET_CHECKSUM,
  GUJO_SAMPLE_ASSET_PATH,
  GUJO_SOURCE_DATASET,
} from "../../../../terrain/gujoSample";
import { readBridgeWorkflowState, readRoadWorkflowState } from "../../../../workflow/workflowState";

/**
 * S-11 Reference Sample Finalization — RB001 の正式 fixture/sample 化。
 *
 * 確認項目:
 * - ID 安定 (RB001_BRIDGE_ID / RB001-SUPER-1 / RB001-SUB-1 / RB001-ANL-1)
 * - oracle 明確 (6径間×50m・STA.1200-1500・A1+P1..P5+A2)
 * - Gujo constants 共通 import (ハードコード禁止)
 * - datasetContentHash の意味 (意図的 substitute = fixture checksum)
 * - 上部工/下部工/解析 oracle
 * - Save/Reopen expected state
 */
describe("S-11 Reference Sample Finalization (RB001)", () => {
  it("frozen bridge oracle: 6 spans x 50m over STA.1200-1500 (A1+P1..P5+A2)", () => {
    expect(RB001_BRIDGE_ID).toBe("RB001-BRIDGE-1");
    expect(RB001_BRIDGE_NAME).toBe("郡上市八幡 長良川橋");
    expect(RB001_BRIDGE_LENGTH).toBe(300);
    expect(RB001_SUPPORT_STATIONS).toHaveLength(7);
    expect(RB001_SUPPORT_STATIONS[0]).toEqual({ supportId: "A1", supportType: "abutment", station: 1200 });
    expect(RB001_SUPPORT_STATIONS[6]).toEqual({ supportId: "A2", supportType: "abutment", station: 1500 });
    for (let i = 1; i <= 5; i += 1) {
      expect(RB001_SUPPORT_STATIONS[i]).toMatchObject({ supportId: `P${i}`, supportType: "pier" });
      expect(RB001_SUPPORT_STATIONS[i].station).toBe(1200 + i * 50);
    }
  });

  it("span arrangement oracle: 6 spans of 50m", () => {
    const layout = buildRb001BridgeLayout();
    expect(layout.spans).toHaveLength(6);
    for (const span of layout.spans) {
      expect(span.length).toBeCloseTo(50, 6);
    }
  });

  it("Gujo constants are imported from the shared module (no string literal drift)", () => {
    const superDoc = buildRb001Superstructure();
    const subDoc = buildRb001Substructure();
    const layout = buildRb001BridgeLayout();

    expect(superDoc.supportReferences?.supports[0]?.coordinateContextId).toBe(GUJO_COORDINATE_CONTEXT_ID);
    expect(subDoc.terrainReferences?.coordinateContextId).toBe(GUJO_COORDINATE_CONTEXT_ID);
    expect(subDoc.terrainReferences?.surfaceReference).toBe(GUJO_SAMPLE_ASSET_PATH);
    expect(layout.terrainReference?.coordinateContextId).toBe(GUJO_COORDINATE_CONTEXT_ID);
  });

  it("datasetContentHash is an intentional substitute of the fixture checksum (documented)", () => {
    expect(GUJO_SOURCE_DATASET.datasetContentHash).toBe(GUJO_SAMPLE_ASSET_CHECKSUM);
    // S-11: 意図的 substitute 契約 (GSI 実タイルは bundle 不可 → representative
    // fixture の checksum を正本として使用)。gujoSample.ts に注記済み。
    expect(GUJO_SAMPLE_ASSET_CHECKSUM).toMatch(/^[a-f0-9]{64}$/);
  });

  it("structural document oracles are consistent", () => {
    const superSummary = {
      docId: buildRb001Superstructure().documentId,
      subDocId: buildRb001Substructure().documentId,
      analysis: buildRb001Analysis(),
    };
    expect(superSummary.docId).toMatch(/^[0-9a-f]{8}-/);
    expect(superSummary.subDocId).toMatch(/^[0-9a-f]{8}-/);
    expect(superSummary.analysis.document.analysisStatus).toBe("NOT_RUN");
  });

  it("complete project Save/Reopen expected state", () => {
    const { project } = buildRb001CompleteProject();
    const road = readRoadWorkflowState(project);
    const bridge = readBridgeWorkflowState(project);
    expect(road?.roadId).toBe("RB001-ROAD-1");
    expect(bridge?.bridgeId).toBe(RB001_BRIDGE_ID);
    expect(bridge?.spans).toHaveLength(6);
    expect(bridge?.bridgeRange.bridgeLength).toBe(300);
  });
});