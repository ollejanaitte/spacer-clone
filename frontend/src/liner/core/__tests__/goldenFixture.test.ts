import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import { buildIntermediateResult } from "../pipeline/pipeline";
import type { BuildIntermediateInput } from "../pipeline/pipeline";

const FIXTURE_DIR = join(import.meta.dirname, "../../../../../examples/liner");

function loadFixture(name: string): Record<string, unknown> {
  const raw = readFileSync(join(FIXTURE_DIR, name), "utf-8");
  return JSON.parse(raw);
}

function buildFromFixture(name: string) {
  const domain = loadFixture(name);
  const input: BuildIntermediateInput = {
    alignment: domain.alignment as BuildIntermediateInput["alignment"],
    stationDefinition: domain.stationDefinition as BuildIntermediateInput["stationDefinition"],
    offsets: domain.offsets as number[],
    z: domain.z as number,
    verticalAlignment: domain.verticalAlignment as BuildIntermediateInput["verticalAlignment"],
    computedAt: "2026-01-01T00:00:00.000Z",
  };
  return buildIntermediateResult(input);
}

describe("golden fixture regression tests", () => {
  it("GC-01: straight segment produces expected intermediate", () => {
    const result = buildFromFixture("gc-01-domain.json");
    expect(result.diagnostics.filter((d) => d.level === "error")).toHaveLength(0);
    expect(result.horizontal.segments).toHaveLength(1);
    expect(result.horizontal.segments[0].type).toBe("straight");
    expect(result.horizontal.sampledPoints.length).toBeGreaterThan(0);
    expect(result.grid.points).toHaveLength(3);
    expect(result.sourceRevision).toHaveLength(64);
  });

  it("GC-02: circular arc produces expected intermediate", () => {
    const result = buildFromFixture("gc-02-domain.json");
    expect(result.diagnostics.filter((d) => d.level === "error")).toHaveLength(0);
    expect(result.horizontal.segments).toHaveLength(1);
    expect(result.horizontal.segments[0].type).toBe("arc");
    expect(result.horizontal.totalLength).toBeCloseTo(261.799388, 3);

    const lastPoint = result.horizontal.sampledPoints[result.horizontal.sampledPoints.length - 1];
    expect(lastPoint.x).toBeCloseTo(250, 3);
    expect(lastPoint.y).toBeCloseTo(66.987298, 3);
  });

  it("GC-03: line-arc compound produces expected intermediate", () => {
    const result = buildFromFixture("gc-03-domain.json");
    expect(result.diagnostics.filter((d) => d.level === "error")).toHaveLength(0);
    expect(result.horizontal.segments).toHaveLength(2);
    expect(result.horizontal.segments[0].type).toBe("straight");
    expect(result.horizontal.segments[1].type).toBe("arc");

    const junction = result.horizontal.sampledPoints.find(
      (p) => Math.abs(p.physicalDistance - 100) < 0.01,
    );
    expect(junction).toBeDefined();
    expect(junction!.x).toBeCloseTo(100, 3);
    expect(junction!.y).toBeCloseTo(0, 3);

    const lastPoint = result.horizontal.sampledPoints[result.horizontal.sampledPoints.length - 1];
    expect(lastPoint.x).toBeCloseTo(350, 3);
    expect(lastPoint.y).toBeCloseTo(66.987298, 3);
  });

  it("GC-04: station equation produces expected intermediate", () => {
    const result = buildFromFixture("gc-04-domain.json");
    expect(result.diagnostics.filter((d) => d.level === "error")).toHaveLength(0);
    expect(result.stations.entries.length).toBeGreaterThan(0);

    const eq50 = result.stations.entries.find((e) => Math.abs(e.physicalDistance - 50) < 0.01);
    expect(eq50).toBeDefined();
    expect(eq50!.displayedStation).toBeCloseTo(50, 3);

    const eq150 = result.stations.entries.find((e) => Math.abs(e.physicalDistance - 150) < 0.01);
    expect(eq150).toBeDefined();
    expect(eq150!.displayedStation).toBeCloseTo(250, 3);
  });

  it("GC-05: vertical parabolic curve produces expected intermediate", () => {
    const result = buildFromFixture("gc-05-domain.json");
    expect(result.diagnostics.filter((d) => d.level === "error")).toHaveLength(0);
    expect(result.vertical.segments).toHaveLength(1);
    expect(result.vertical.segments[0].startGrade).toBeCloseTo(0.02, 6);
    expect(result.vertical.segments[0].endGrade).toBeCloseTo(-0.02, 6);

    const sample0 = result.vertical.sampledPoints.find(
      (p) => Math.abs(p.physicalDistance - 0) < 0.01,
    );
    expect(sample0).toBeDefined();
    expect(sample0!.profileElevation).toBeCloseTo(100.0, 3);

    const sample50 = result.vertical.sampledPoints.find(
      (p) => Math.abs(p.physicalDistance - 50) < 0.01,
    );
    expect(sample50).toBeDefined();
    expect(sample50!.profileElevation).toBeCloseTo(100.5, 3);

    const sample100 = result.vertical.sampledPoints.find(
      (p) => Math.abs(p.physicalDistance - 100) < 0.01,
    );
    expect(sample100).toBeDefined();
    expect(sample100!.profileElevation).toBeCloseTo(100.0, 3);
  });

  it("GC-06: 3x3 grid on straight alignment", () => {
    const result = buildFromFixture("gc-06-domain.json");
    expect(result.diagnostics.filter((d) => d.level === "error")).toHaveLength(0);
    expect(result.grid.points).toHaveLength(9);
    expect(result.grid.lines).toHaveLength(6);
    expect(result.grid.cells).toHaveLength(4);

    const center = result.grid.points.find((p) => p.id === "GP-gc06-001-001");
    expect(center).toBeDefined();
    expect(center!.x).toBeCloseTo(10, 6);
    expect(center!.y).toBeCloseTo(0, 6);
    expect(center!.z).toBeCloseTo(10, 6);
  });

  it("GC-07: 45-degree offset produces expected intermediate", () => {
    const result = buildFromFixture("gc-07-domain.json");
    expect(result.diagnostics.filter((d) => d.level === "error")).toHaveLength(0);

    const midPoint = result.horizontal.sampledPoints.find(
      (p) => Math.abs(p.physicalDistance - 50) < 0.01,
    );
    expect(midPoint).toBeDefined();
    expect(midPoint!.x).toBeCloseTo(35.355339, 3);
    expect(midPoint!.y).toBeCloseTo(35.355339, 3);

    const offsetPoint = result.grid.points.find(
      (p) => Math.abs(p.offset - 5) < 0.01 && Math.abs(p.physicalDistance - 50) < 1,
    );
    expect(offsetPoint).toBeDefined();
    expect(offsetPoint!.x).toBeCloseTo(31.819805, 3);
    expect(offsetPoint!.y).toBeCloseTo(38.890873, 3);
  });
});
