// Phase C1 (M3-01) プロジェクト永続化 テスト
import { describe, it, expect } from "vitest";
import {
  serializeSubstructureProject,
  deserializeSubstructureProject,
  projectToSupports,
  deriveAlignmentRefs,
  detectDuplicateSupportIds,
} from "../planning/persistence";
import { generateCombo, generateFromLinerSupports } from "../planning/samples/sampleGenerator";
import { validateSubstructureProject } from "../validation";

describe("serializeSubstructureProject", () => {
  it("serializes a standard combo with stable IDs", () => {
    const supports = generateCombo("combo-standard");
    const result = serializeSubstructureProject({ supports });
    expect(result.ok).toBe(true);
    const project = result.value!.project;
    expect(project.schemaVersion).toBe("0.2.0");
    expect(project.supports.map((s) => s.supportId)).toEqual(["A1", "P1", "P2", "A2"]);
    expect(project.supports[1].pier?.columns?.[0].id).toBe("P1-C1");
    expect(JSON.parse(result.value!.json)).toEqual(project);
  });

  it("derives alignment refs from placements", () => {
    const supports = generateCombo("combo-standard");
    const refs = deriveAlignmentRefs(supports);
    expect(refs).toHaveLength(1);
    expect(refs[0].alignmentId).toBe("sample-aln");
    expect(refs[0].totalLength).toBe(90);
  });

  it("rejects duplicate supportIds (fail-closed)", () => {
    const supports = generateFromLinerSupports([
      { id: "P1", station: 0 },
      { id: "P1", station: 50 },
    ]);
    expect(detectDuplicateSupportIds(supports)).toEqual(["P1"]);
    const result = serializeSubstructureProject({ supports });
    expect(result.ok).toBe(false);
  });

  it("rejects invalid geometry (zero dimension) via validation", () => {
    const supports = generateCombo("combo-standard");
    const broken = supports.map((s) => ({
      ...s,
      pier: s.pier ? { ...s.pier, column: { ...s.pier.column!, width: 0 } } : undefined,
    }));
    const result = serializeSubstructureProject({ supports: broken as never });
    expect(result.ok).toBe(false);
  });
});

describe("deserializeSubstructureProject", () => {
  it("round-trips supports and reproduces geometry input", () => {
    const supports = generateCombo("combo-standard");
    const serialized = serializeSubstructureProject({ supports });
    const loaded = deserializeSubstructureProject(serialized.value!.json);
    expect(loaded.ok).toBe(true);
    expect(projectToSupports(loaded.value!)).toEqual(supports);
  });

  it("round-trips LINER-generated supports preserving stations and skew", () => {
    const supports = generateFromLinerSupports([
      { id: "P1", station: 20 },
      { id: "P2", station: 60 },
    ]);
    const serialized = serializeSubstructureProject({ supports });
    const loaded = deserializeSubstructureProject(serialized.value!.json);
    expect(loaded.ok).toBe(true);
    const restored = projectToSupports(loaded.value!);
    expect(restored[0].placement.station).toBe(20);
    expect(restored).toEqual(supports);
  });

  it("rejects non-JSON text", () => {
    const result = deserializeSubstructureProject("not json {{{");
    expect(result.ok).toBe(false);
  });

  it("rejects unsupported schemaVersion (migration gate)", () => {
    const supports = generateCombo("combo-standard");
    const serialized = serializeSubstructureProject({ supports });
    const wrong = JSON.parse(serialized.value!.json) as { schemaVersion: string };
    wrong.schemaVersion = "0.1.0";
    const result = deserializeSubstructureProject(JSON.stringify(wrong));
    expect(result.ok).toBe(false);
    expect(result.diagnostics.join("")).toContain("schemaVersion");
  });

  it("rejects invalid project (fail-closed)", () => {
    const result = deserializeSubstructureProject(
      JSON.stringify({
        schemaVersion: "0.2.0",
        projectId: "x",
        supports: [{ supportId: "A1", supportType: "pier" }],
      }),
    );
    expect(result.ok).toBe(false);
  });
});

describe("round-trip validation", () => {
  it("loaded project is validation-clean (fatal-free)", () => {
    const supports = generateCombo("combo-standard");
    const serialized = serializeSubstructureProject({ supports });
    const loaded = deserializeSubstructureProject(serialized.value!.json);
    const issues = validateSubstructureProject(loaded.value!);
    expect(issues.filter((i) => i.severity === "error")).toEqual([]);
  });
});
