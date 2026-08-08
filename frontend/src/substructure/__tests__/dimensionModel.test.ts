// Phase C1 (M2-06) dimensionModel 純粋ロジックテスト
import { describe, it, expect } from "vitest";
import { buildDimensions, nodeDimensionLabel, type DimensionMode } from "../planning/dimensions/dimensionModel";
import type { SolidGroup } from "../geometryBase";

function group(supportId: string, overrides: Partial<SolidGroup["solids"][0]> = {}): SolidGroup {
  return {
    supportId,
    solids: [
      {
        id: `${supportId}-FOOTING`,
        kind: "box",
        localCenter: { x: 0, y: 0, z: -0.75 },
        localSize: { x: 12, y: 8, z: 1.5 },
        entity: "footing",
        material: "foundation.footing",
        ...overrides,
      },
    ],
    transform: {
      origin: { x: 100, y: 200, z: 5 },
      xAxis: { x: 1, y: 0, z: 0 },
      yAxis: { x: 0, y: 1, z: 0 },
      zAxis: { x: 0, y: 0, z: 1 },
      skewRad: 0,
    },
  };
}

describe("nodeDimensionLabel", () => {
  it("footing gives length label from localSize", () => {
    const node = {
      id: "A1-FOOTING",
      kind: "box" as const,
      localCenter: { x: 0, y: 0, z: 0 },
      localSize: { x: 12, y: 8, z: 1.5 },
      entity: "footing" as const,
      material: "m",
    };
    const meta = nodeDimensionLabel(node)!;
    expect(meta.kind).toBe("length");
    expect(meta.label).toContain("12.00");
    expect(meta.label).toContain("8.00");
  });

  it("pile gives diameter label", () => {
    const node = {
      id: "A1-PILE-01",
      kind: "cylinder" as const,
      localCenter: { x: 0, y: 0, z: -10 },
      localSize: { x: 1.2, y: 1.2, z: 18 },
      entity: "pile" as const,
      material: "m",
    };
    expect(nodeDimensionLabel(node)!.kind).toBe("diameter");
  });
});

describe("buildDimensions", () => {
  const g = group("A1");

  it("off mode produces no dimensions", () => {
    const d = buildDimensions([g], "off");
    expect(d.lines2D).toHaveLength(0);
    expect(d.markers3D).toHaveLength(0);
  });

  it("all mode produces lines and markers", () => {
    const d = buildDimensions([g], "all");
    expect(d.lines2D.length).toBeGreaterThan(0);
    expect(d.markers3D.length).toBeGreaterThan(0);
    const line = d.lines2D[0];
    // ワールド座標（x: 100 + span, y: 200）
    expect(line.supportId).toBe("A1");
    expect(line.a.x).toBeCloseTo(100 - 6, 6);
    expect(line.b.x).toBeCloseTo(100 + 6, 6);
    expect(line.a.y).toBeCloseTo(200, 6);
  });

  it("selected mode filters to selected support only", () => {
    const g2 = group("P1");
    const d = buildDimensions([g, g2], "selected", "A1");
    expect(d.lines2D.every((l) => l.supportId === "A1")).toBe(true);
  });

  it("values come from model localSize (source of truth)", () => {
    const d = buildDimensions([g], "all");
    const footingLine = d.lines2D.find((l) => l.kind === "length")!;
    expect(footingLine.label).toContain("12.00");
    expect(footingLine.label).toContain("8.00");
  });
});

describe("mode switching behavior", () => {
  it("dimension counts differ by mode", () => {
    const g1 = group("A1");
    const off = buildDimensions([g1], "off").lines2D.length;
    const all = buildDimensions([g1], "all").lines2D.length;
    expect(off).toBe(0);
    expect(all).toBeGreaterThan(0);
  });
});
