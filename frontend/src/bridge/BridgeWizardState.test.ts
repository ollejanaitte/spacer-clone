import { describe, expect, it } from "vitest";
import {
  WIZARD_STEPS,
  STEP_TITLES,
  addSpan,
  appendLine,
  computeImpactFactor,
  defaultCrossSection,
  makeInitialBridgeProject,
  removeLine,
  removeSpan,
  totalLength,
  xPositionsFor,
  yPositionsFor,
} from "./BridgeWizardState";
import type { BridgeLine, BridgeProject } from "./types";

describe("BridgeWizardState", () => {
  it("exposes 6 wizard steps", () => {
    expect(WIZARD_STEPS).toEqual([1, 2, 3, 4, 5, 6]);
    expect(Object.keys(STEP_TITLES)).toHaveLength(6);
  });

  it("creates a sensible default bridge project", () => {
    const p = makeInitialBridgeProject("Test", "bridge-1");
    expect(p.id).toBe("bridge-1");
    expect(p.schemaVersion).toBe("0.1.0");
    expect(p.crossSection.lane_count).toBe(2);
    expect(p.spans).toHaveLength(1);
    expect(p.spans[0].length).toBe(30);
    expect(p.generationSettings.mesh_division).toBe(10);
  });

  it("computes total length", () => {
    const p = makeInitialBridgeProject();
    expect(totalLength(p.spans)).toBe(30);
  });

  it("adds and removes spans with reindexing", () => {
    let spans = [{ index: 1, length: 10, offset: 0 }];
    spans = addSpan(spans);
    expect(spans).toHaveLength(2);
    spans = removeSpan(spans, 1);
    expect(spans).toHaveLength(1);
    expect(spans[0].index).toBe(1);
  });

  it("computes impact factor with cap", () => {
    // computeImpactFactor applies the cap 0.3
    expect(computeImpactFactor([10])).toBeCloseTo(0.3, 5);
    // L=0.001 -> 20/50.001 = 0.4 (above cap, so capped to 0.3)
    expect(computeImpactFactor([0.001])).toBe(0.3);
    // Large L -> not capped
    expect(computeImpactFactor([200])).toBeCloseTo(20 / 250, 5);
    expect(computeImpactFactor([])).toBe(0);
  });

  it("produces y positions for cross section", () => {
    const ys = yPositionsFor(defaultCrossSection());
    expect(ys.length).toBeGreaterThanOrEqual(5);
    expect(ys[0]).toBeLessThan(0);
    expect(ys[ys.length - 1]).toBeGreaterThan(0);
  });

  it("produces x positions for spans", () => {
    const xs = xPositionsFor([{ index: 1, length: 30, offset: 0 }], 10);
    expect(xs).toHaveLength(11);
    expect(xs[0]).toBe(0);
    expect(xs[10]).toBeCloseTo(30);
  });

  it("removes line and dependent loads", () => {
    const line: BridgeLine = { id: "L1", type: "traffic", name: "L", points: [[0, 0, 0], [10, 0, 0]] };
    let project: BridgeProject = {
      ...makeInitialBridgeProject(),
      lines: [line],
      loads: [
        {
          id: "ld1",
          type: "distributed",
          name: "x",
          magnitude: 1.0,
          direction: "-Y",
          line_id: "L1",
        },
      ],
    };
    project = removeLine(project, "L1");
    expect(project.lines).toHaveLength(0);
    expect(project.loads).toHaveLength(0);
  });

  it("appends lines", () => {
    const project = makeInitialBridgeProject();
    const updated = appendLine(project, {
      id: "L1",
      type: "load",
      name: "x",
      points: [[0, 0, 0], [10, 0, 0]],
    });
    expect(updated.lines).toHaveLength(1);
  });
});
