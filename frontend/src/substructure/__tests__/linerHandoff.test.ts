// Phase C1 (M2-09C) LINER → 下部工 handoff アダプタ テスト
import { describe, it, expect } from "vitest";
import {
  linerPiersToSupportHandoff,
  findDuplicateHandoffIds,
  resolveHandoffAlignmentId,
  type LinerPierHandoffInput,
} from "../planning/linerHandoff";
import { buildLinerGeneratedSupports } from "../planning/SubstructurePlanningHost";
import type { Support } from "../model";

const LINER_PIERS: LinerPierHandoffInput[] = [
  { id: "A1", physicalDistance: 0, kind: "abutment", skewAngleRad: 0 },
  { id: "P1", physicalDistance: 30, kind: "pier", skewAngleRad: 0.05 },
  { id: "P2", physicalDistance: 60, kind: "pier", skewAngleRad: 0 },
  { id: "A2", physicalDistance: 90, kind: "abutment", skewAngleRad: 0 },
];

describe("linerPiersToSupportHandoff", () => {
  it("maps LINER piers to liner-placement supports", () => {
    const out = linerPiersToSupportHandoff(LINER_PIERS);
    expect(out.map((s) => s.id)).toEqual(["A1", "P1", "P2", "A2"]);
    expect(out[1].station).toBe(30);
    expect(out[1].skewRad).toBeCloseTo(0.05, 6);
  });

  it("excludes virtual_pier and unknown kinds", () => {
    const out = linerPiersToSupportHandoff([
      { id: "V1", physicalDistance: 10, kind: "virtual_pier" },
      { id: "P1", physicalDistance: 20, kind: "pier" },
    ]);
    expect(out.map((s) => s.id)).toEqual(["P1"]);
  });

  it("handles empty and invalid inputs safely", () => {
    expect(linerPiersToSupportHandoff([])).toEqual([]);
    expect(linerPiersToSupportHandoff(undefined as unknown as [] )).toEqual([]);
  });

  it("detects duplicate handoff ids", () => {
    const out = linerPiersToSupportHandoff([
      { id: "P1", physicalDistance: 0, kind: "pier" },
      { id: "P1", physicalDistance: 50, kind: "pier" },
    ]);
    expect(findDuplicateHandoffIds(out)).toEqual(["P1"]);
  });
});

describe("resolveHandoffAlignmentId", () => {
  it("prefers activeAlignmentId over alignment.id", () => {
    expect(
      resolveHandoffAlignmentId({ id: "alignment-1", linerModelId: "L1" }, "active-2"),
    ).toBe("active-2");
  });

  it("falls back to alignment.id and empty string", () => {
    expect(resolveHandoffAlignmentId({ id: "alignment-1" }, null)).toBe("alignment-1");
    expect(resolveHandoffAlignmentId(null, "")).toBe("");
    expect(resolveHandoffAlignmentId(undefined, undefined)).toBe("");
  });
});

describe("buildLinerGeneratedSupports", () => {
  it("generates supports carrying LINER ids and stations", () => {
    const out = buildLinerGeneratedSupports(
      linerPiersToSupportHandoff(LINER_PIERS),
      "alignment-1",
    ) as readonly Support[];
    expect(out.map((s) => s.supportId)).toEqual(["A1", "P1", "P2", "A2"]);
    expect(out[1].placement.station).toBe(30);
    expect(out[1].placement.alignmentId).toBe("alignment-1");
  });

  it("inherits skew from LINER data", () => {
    const out = buildLinerGeneratedSupports(
      linerPiersToSupportHandoff(LINER_PIERS),
      "",
    ) as readonly Support[];
    expect(out[1].skewRad).toBeCloseTo(0.05, 6);
    expect(out[2].skewRad).toBe(0);
  });

  it("keeps placement contract intact (station/offset/alignmentId)", () => {
    const out = buildLinerGeneratedSupports(
      linerPiersToSupportHandoff(LINER_PIERS),
      "aln-x",
    ) as readonly Support[];
    for (const s of out) {
      expect(s.placement.source).toBe("liner");
      expect(typeof s.placement.station).toBe("number");
      expect(s.placement.alignmentId).toBe("aln-x");
    }
  });

  it("returns empty for empty handoff", () => {
    expect(buildLinerGeneratedSupports([], "")).toEqual([]);
  });
});
