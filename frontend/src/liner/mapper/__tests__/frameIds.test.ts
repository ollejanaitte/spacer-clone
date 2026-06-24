import { describe, expect, it } from "vitest";
import { frameMemberId, frameNodeId } from "../frameIds";
import { prepareStationPairMember } from "../frameMappingPreview";

describe("liner frame mapping preparation", () => {
  it("creates namespaced node and member identifiers", () => {
    expect(frameNodeId("gc06", 2, 1)).toBe("N_LINER_gc06_002_001");
    expect(frameMemberId("gc06", "L", 0, 1)).toBe("M_LINER_gc06_L_000_001");
  });

  it("keeps source station references on member candidates", () => {
    const nodeI = {
      id: "N_LINER_gc06_000_001",
      gridPointId: "GP-gc06-000-001",
      x: 0,
      y: 0,
      z: 10,
      provenance: {
        alignmentId: "alignment-1",
        sourceRevision: "abc",
      },
    };
    const nodeJ = {
      id: "N_LINER_gc06_001_001",
      gridPointId: "GP-gc06-001-001",
      x: 10,
      y: 0,
      z: 10,
      provenance: {
        alignmentId: "alignment-1",
        sourceRevision: "abc",
      },
    };

    const member = prepareStationPairMember(
      "gc06",
      nodeI,
      nodeJ,
      "ST-000",
      "ST-001",
      0,
      1,
    );

    expect(member).toMatchObject({
      id: "M_LINER_gc06_L_000_001",
      nodeIId: "N_LINER_gc06_000_001",
      nodeJId: "N_LINER_gc06_001_001",
      stationIId: "ST-000",
      stationJId: "ST-001",
    });
  });
});
