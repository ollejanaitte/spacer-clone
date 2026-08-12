import { describe, expect, it } from "vitest";
import type { SupportReferences } from "../substructureTypes";
import {
  buildSupportPlacementFromHandoff,
  SubstructurePhase4AdapterError,
} from "../substructurePhase4Adapter";

function handoff(overrides: Partial<SupportReferences> = {}): SupportReferences {
  return {
    handoffId: "SH-1",
    schemaVersion: "1.0.0",
    generatedAt: "2026-08-12T00:00:00.000Z",
    supports: [
      { supportId: "A1", supportType: "abutment", label: "A1", station: 100, position: { domainX: 100, domainY: 0, elevation: 100 }, tangentAzimuthRad: 0, skewAngleRad: null, terrainElevation: 98, roadReferenceId: "ALN-1", coordinateContextId: null },
      { supportId: "P1", supportType: "pier", label: "P1", station: 300, position: { domainX: 300, domainY: 0, elevation: 101 }, tangentAzimuthRad: 0, skewAngleRad: 0.1, terrainElevation: 95, roadReferenceId: "ALN-1", coordinateContextId: null },
      { supportId: "A2", supportType: "abutment", label: "A2", station: 450, position: { domainX: 450, domainY: 0, elevation: 100 }, tangentAzimuthRad: 0, skewAngleRad: null, terrainElevation: 97, roadReferenceId: "ALN-1", coordinateContextId: null },
    ],
    ...overrides,
  };
}

describe("Phase 4 Support Handoff Adapter (WP-B)", () => {
  it("maps supportId/supportType/station/skew (T6-ADP-001/002/003/005)", () => {
    const result = buildSupportPlacementFromHandoff(handoff(), { alignmentId: "ALN-1" });
    expect(result.supports).toHaveLength(3);
    expect(result.supports[0].supportId).toBe("A1");
    expect(result.supports[0].supportType).toBe("abutment");
    expect(result.supports[0].placement.station).toBe(100);
    // skew null -> 0 (CCW)
    expect(result.supports[0].skewRad).toBe(0);
    // skew declared -> preserved
    expect(result.supports[1].skewRad).toBeCloseTo(0.1, 6);
    expect(result.supports[1].placement.alignmentId).toBe("ALN-1");
  });

  it("maps virtual_pier -> pier explicitly (T6-ADP-002)", () => {
    const h = handoff({ supports: [{ ...handoff().supports[1], supportType: "virtual_pier" as never }] });
    const result = buildSupportPlacementFromHandoff(h, { alignmentId: "ALN-1" });
    expect(result.supports[0].supportType).toBe("pier");
  });

  it("rejects unknown supportType (T6-ADP-002)", () => {
    const h = handoff({ supports: [{ ...handoff().supports[0], supportType: "beam" as never }] });
    expect(() => buildSupportPlacementFromHandoff(h, { alignmentId: "ALN-1" })).toThrow(SubstructurePhase4AdapterError);
  });

  it("rejects non-finite station (T6-ADP-003)", () => {
    const h = handoff({ supports: [{ ...handoff().supports[0], station: Number.NaN }] });
    expect(() => buildSupportPlacementFromHandoff(h, { alignmentId: "ALN-1" })).toThrow(SubstructurePhase4AdapterError);
  });

  it("rejects duplicate supportId", () => {
    const h = handoff({ supports: [handoff().supports[0], handoff().supports[0]] });
    expect(() => buildSupportPlacementFromHandoff(h, { alignmentId: "ALN-1" })).toThrow(SubstructurePhase4AdapterError);
  });

  it("uses roadReferenceId as fallback alignment when alignmentId absent (T6-ADP-006)", () => {
    const result = buildSupportPlacementFromHandoff(handoff(), { alignmentId: null });
    expect(result.supports[0].placement.alignmentId).toBe("ALN-1");
  });

  it("produces placement Supports usable by the existing engine", () => {
    const result = buildSupportPlacementFromHandoff(handoff(), { alignmentId: "ALN-1" });
    expect(result.placementSupports).toHaveLength(3);
    expect(result.placementSupports[0].placement.source).toBe("liner");
  });
});
