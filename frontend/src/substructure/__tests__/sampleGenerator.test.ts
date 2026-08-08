// Phase C1 (M2-08) サンプル自動生成 純粋ロジックテスト
import { describe, it, expect } from "vitest";
import {
  generateSample,
  generateCombo,
  generateAllSingleSamples,
  generateFromLinerSupports,
  findDuplicateIds,
  SAMPLE_COMBOS,
  type SampleKind,
} from "../planning/samples/sampleGenerator";
import { validateSubstructureProject } from "../validation";

describe("generateSample (9 types)", () => {
  const kinds: SampleKind[] = [
    "abutment_inverted_t",
    "abutment_cantilever",
    "pier_single",
    "pier_wall",
    "pier_portal",
    "foundation_spread",
    "foundation_bored",
    "foundation_steel",
  ];

  it("generates a stable support for every single type", () => {
    for (const k of kinds) {
      const s = generateSample(k, "T1", 0);
      expect(s.supportId).toBe("T1");
      const expectedType =
        k.startsWith("abutment") || k === "foundation_bored" || k === "foundation_steel"
          ? "abutment"
          : "pier";
      expect(s.supportType).toBe(expectedType);
    }
  });

  it("generates stable part IDs per type", () => {
    const portal = generateSample("pier_portal", "P1", 30);
    expect(portal.pier?.columns).toHaveLength(2);
    expect(portal.pier?.columns?.[0].id).toBe("P1-C1");
    expect(portal.pier?.columns?.[1].id).toBe("P1-C2");
    expect(portal.pier?.beam?.id).toBe("P1-BEAM");

    const abut = generateSample("abutment_inverted_t", "A1", 0);
    expect(abut.abutment?.backwall.id).toBe("A1-BACKWALL");
    expect(abut.abutment?.wingWallL.id).toBe("A1-WING-L");
  });

  it("foundation_spread has no pileGroup, bored has bored_pile, steel has steel_pipe", () => {
    const spread = generateSample("foundation_spread", "S1", 0);
    expect(spread.pier?.pileGroup).toBeNull();
    const bored = generateSample("foundation_bored", "S2", 10);
    expect(bored.abutment?.pileGroup?.pileType).toBe("bored_pile");
    const steel = generateSample("foundation_steel", "S3", 20);
    expect(steel.abutment?.pileGroup?.pileType).toBe("steel_pipe");
  });

  it("samples are deterministic (same input → same output)", () => {
    const a = generateSample("pier_portal", "P1", 30);
    const b = generateSample("pier_portal", "P1", 30);
    expect(a).toEqual(b);
  });

  it("all single samples pass validation (fatal-free)", () => {
    for (const k of kinds) {
      const s = generateSample(k, "V1", 0);
      const issues = validateSubstructureProject({
        schemaVersion: "0.2.0",
        projectId: "sample",
        source: "c1",
        coordinateSystem: "x-longitudinal-y-transverse-z-up",
        unitSystem: "si",
        alignmentRefs: [{ alignmentId: "sample-aln", originStation: 0, totalLength: 200 }],
        metadata: { sourceApplication: "x", sourceVersion: "1", sourceRevision: "1", createdAt: "", updatedAt: "" },
        supports: [s],
      });
      expect(issues.filter((i) => i.severity === "error")).toEqual([]);
    }
  });
});

describe("generateCombo", () => {
  it("standard combo yields A1/P1/P2/A2 with stable IDs", () => {
    const combo = generateCombo("combo-standard");
    expect(combo.map((s) => s.supportId)).toEqual(["A1", "P1", "P2", "A2"]);
    expect(combo[0].supportType).toBe("abutment");
    expect(combo[1].supportType).toBe("pier");
  });

  it("repeat generation is identical (deterministic)", () => {
    expect(generateCombo("combo-standard")).toEqual(generateCombo("combo-standard"));
  });

  it("all combos produce valid unique-ID supports", () => {
    for (const c of SAMPLE_COMBOS) {
      const supports = generateCombo(c.id);
      expect(findDuplicateIds(supports)).toEqual([]);
      expect(supports.length).toBeGreaterThan(0);
    }
  });
});

describe("generateAllSingleSamples / findDuplicateIds", () => {
  it("single samples all have unique IDs", () => {
    const all = generateAllSingleSamples();
    expect(all.length).toBe(8);
    expect(findDuplicateIds(all)).toEqual([]);
  });

  it("detects duplicate IDs", () => {
    const a = generateSample("pier_single", "P1", 0);
    const b = generateSample("pier_wall", "P1", 10);
    expect(findDuplicateIds([a, b])).toEqual(["P1"]);
  });
});

describe("generateFromLinerSupports", () => {
  it("maps LINER supports to substructure supports", () => {
    const liner = [
      { id: "P1", station: 20 },
      { id: "P2", station: 60 },
    ];
    const out = generateFromLinerSupports(liner);
    expect(out).toHaveLength(2);
    expect(out[0].supportId).toBe("P1");
    expect(out[0].placement.station).toBe(20);
    expect(out[1].supportId).toBe("P2");
  });

  it("stable on repeat", () => {
    const liner = [{ id: "P1", station: 20 }];
    expect(generateFromLinerSupports(liner)).toEqual(generateFromLinerSupports(liner));
  });
});
