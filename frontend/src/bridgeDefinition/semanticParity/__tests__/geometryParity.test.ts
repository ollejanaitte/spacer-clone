import { describe, expect, it } from "vitest";
import { computeGeometryMetrics } from "../geometryParity";
import { normalizeProjectModelForSemanticParity } from "../normalize";
import { project, baseMembers, baseNodes } from "./fixtures/semanticParityFixtures";

describe("geometry parity", () => {
  it("computes node and member counts", () => {
    const model = normalizeProjectModelForSemanticParity(project(baseNodes, baseMembers));
    const metrics = computeGeometryMetrics(model);

    expect(metrics.nodeCount).toBe(3);
    expect(metrics.memberCount).toBe(2);
  });

  it("computes bounding box and centroid", () => {
    const model = normalizeProjectModelForSemanticParity(project(baseNodes, baseMembers));
    const metrics = computeGeometryMetrics(model);

    expect(metrics.boundingBox.min).toEqual({ x: 0, y: 0, z: 0 });
    expect(metrics.boundingBox.max).toEqual({ x: 20, y: 0, z: 0 });
    expect(metrics.centroid.x).toBeCloseTo(10);
  });

  it("computes member length statistics", () => {
    const model = normalizeProjectModelForSemanticParity(project(baseNodes, baseMembers));
    const metrics = computeGeometryMetrics(model);

    expect(metrics.memberLengths.count).toBe(2);
    expect(metrics.memberLengths.min).toBe(10);
    expect(metrics.memberLengths.max).toBe(10);
    expect(metrics.memberLengths.total).toBe(20);
    expect(metrics.memberLengths.mean).toBe(10);
  });

  it("computes empty model metrics without throwing", () => {
    const model = normalizeProjectModelForSemanticParity(project([], []));
    const metrics = computeGeometryMetrics(model);

    expect(metrics.nodeCount).toBe(0);
    expect(metrics.memberCount).toBe(0);
    expect(metrics.memberLengths.count).toBe(0);
    expect(metrics.memberLengths.total).toBe(0);
  });

  it("returns non-finite bounding box when no finite nodes exist", () => {
    const model = normalizeProjectModelForSemanticParity(
      project([{ id: "bad", x: Number.NaN, y: 0, z: 0 }], []),
    );
    const metrics = computeGeometryMetrics(model);

    expect(Number.isNaN(metrics.boundingBox.min.x)).toBe(true);
    expect(Number.isNaN(metrics.centroid.x)).toBe(true);
  });
});
