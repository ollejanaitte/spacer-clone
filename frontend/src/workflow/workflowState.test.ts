import { describe, expect, it } from "vitest";
import { createEmptyProject } from "../next/project/projectDataCore";
import {
  BRIDGE_WORKFLOW_ROUTE_PATH,
  ROAD_WORKFLOW_ROUTE_PATH,
  isBridgeWorkflowRoute,
  isRoadWorkflowRoute,
  isSiteContextRoute,
  SITE_CONTEXT_ROUTE_PATH,
} from "./routes";
import {
  assertWorkflowProjectValid,
  readBridgeWorkflowState,
  readRoadWorkflowState,
  writeBridgeWorkflowState,
  writeRoadWorkflowState,
} from "./workflowState";
import { buildSyntheticSiteContextPackage } from "./samplePackage";
import { createSiteContextImportAdapter } from "../next/integration/siteContext/importAdapter";

describe("Lane U routes (Wave 2 workflow steps)", () => {
  it("exposes dedicated Road / Bridge workflow routes", () => {
    expect(isSiteContextRoute(SITE_CONTEXT_ROUTE_PATH)).toBe(true);
    expect(isRoadWorkflowRoute(ROAD_WORKFLOW_ROUTE_PATH)).toBe(true);
    expect(isBridgeWorkflowRoute(BRIDGE_WORKFLOW_ROUTE_PATH)).toBe(true);
    expect(isRoadWorkflowRoute("/pro/linear-coordinate")).toBe(false);
    expect(isBridgeWorkflowRoute("/pro/site-context")).toBe(false);
  });
});

describe("workflowState (Road / Bridge on the shared Project)", () => {
  it("writes and reads the Road workflow state on the same project", () => {
    const base = createEmptyProject("RB-001");
    const withRoad = writeRoadWorkflowState(base, {
      roadId: "RB001-ROAD-1",
      alignmentId: "RB001-ROAD-1",
      name: "郡上市八幡 山岳道路",
      totalLengthM: 2450,
      bridgeCandidate: {
        startStation: 1200,
        endStation: 1500,
        nominalSpanM: 50,
        note: "長良川横断部",
      },
      placedAt: "2026-08-16T00:00:00.000Z",
    });
    expect(withRoad.projectId).toBe(base.projectId);
    expect(readRoadWorkflowState(withRoad)?.roadId).toBe("RB001-ROAD-1");
    const parsed = assertWorkflowProjectValid(withRoad);
    expect(parsed.projectId).toBe(base.projectId);
  });

  it("writes and reads the Bridge workflow state while preserving the road state", () => {
    const base = createEmptyProject("RB-001");
    const withRoad = writeRoadWorkflowState(base, {
      roadId: "RB001-ROAD-1",
      alignmentId: "RB001-ROAD-1",
      name: "郡上市八幡 山岳道路",
      totalLengthM: 2450,
      bridgeCandidate: {
        startStation: 1200,
        endStation: 1500,
        nominalSpanM: 50,
        note: "長良川横断部",
      },
      placedAt: "2026-08-16T00:00:00.000Z",
    });
    const withBridge = writeBridgeWorkflowState(withRoad, {
      bridgeId: "BR-RB001-1",
      name: "長良川橋",
      roadId: "RB001-ROAD-1",
      bridgeRange: { startStation: 1200, endStation: 1500, bridgeLength: 300 },
      piers: [
        { supportId: "P1", station: 1250 },
        { supportId: "P2", station: 1300 },
        { supportId: "P3", station: 1350 },
        { supportId: "P4", station: 1400 },
        { supportId: "P5", station: 1450 },
      ],
      spans: [
        { spanId: "S1", index: 1, startSupportId: "A1", endSupportId: "P1", startStation: 1200, endStation: 1250, length: 50 },
        { spanId: "S2", index: 2, startSupportId: "P1", endSupportId: "P2", startStation: 1250, endStation: 1300, length: 50 },
      ],
      placedAt: "2026-08-16T00:00:00.000Z",
    });
    expect(withBridge.projectId).toBe(base.projectId);
    expect(readRoadWorkflowState(withBridge)?.roadId).toBe("RB001-ROAD-1");
    expect(readBridgeWorkflowState(withBridge)?.bridgeId).toBe("BR-RB001-1");
    expect(readBridgeWorkflowState(withBridge)?.spans[0]?.length).toBe(50);
    const parsed = assertWorkflowProjectValid(withBridge);
    expect(parsed.modules.bridgeLayout).toBeDefined();
  });

  it("rejects a project that fails parseProject", () => {
    const base = createEmptyProject("RB-001");
    const broken = {
      ...base,
      projectId: "not-a-uuid",
    };
    expect(() => assertWorkflowProjectValid(broken)).toThrow(/WORKFLOW-STATE-INVALID-PROJECT/);
  });
});

describe("samplePackage (synthetic .sitecontext)", () => {
  it("produces a package the real Lane B adapter inspects successfully", async () => {
    const input = buildSyntheticSiteContextPackage();
    expect(input.package.envelope.format).toBe("sitecontext-package");
    expect(input.package.envelope.files).toEqual([]);
    const adapter = createSiteContextImportAdapter();
    const result = await adapter.inspect(input);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.report.projectId.length).toBeGreaterThan(0);
      expect(result.report.crsImport.supported).toBe(true);
      expect(Array.isArray(result.report.warnings)).toBe(true);
      expect(Array.isArray(result.report.unsupportedFields)).toBe(true);
    }
  });

  it("can be imported to a mapped target Project", async () => {
    const input = buildSyntheticSiteContextPackage();
    const adapter = createSiteContextImportAdapter();
    const result = await adapter.import(input);
    expect(result.ok).toBe(true);
  });
});