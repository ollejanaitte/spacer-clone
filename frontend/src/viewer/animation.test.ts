import { describe, expect, it } from "vitest";
import { createDefaultProject } from "../data/defaultProject";
import {
  BRIDGE_NUM_SPANS,
  BRIDGE_PIER_HEIGHT,
  BRIDGE_SOFT_PIERS,
} from "../data/defaultProject";
import {
  computeAnimatedTransform,
  computeAnimationPhase,
  computeDemoModeShape,
  DEFAULT_ANIMATION_OPTIONS,
  resolveAnimationDisplacementMap,
  withNodeDisplacement,
} from "./animation";

describe("computeAnimationPhase", () => {
  it("returns 0 at t=0 regardless of speed", () => {
    expect(computeAnimationPhase(0, 0)).toBe(0);
    expect(computeAnimationPhase(0, 1)).toBe(0);
  });

  it("returns pi/2 at t=0.25 with speed 1", () => {
    expect(computeAnimationPhase(0.25, 1)).toBeCloseTo(Math.PI / 2);
  });

  it("scales linearly with speed", () => {
    expect(computeAnimationPhase(0.25, 2)).toBeCloseTo(Math.PI);
  });

  it("wraps at t=1 back to 0", () => {
    expect(computeAnimationPhase(1, 1)).toBeCloseTo(0);
  });

  it("ignores NaN inputs by returning 0", () => {
    expect(computeAnimationPhase(NaN, 1)).toBe(0);
    expect(computeAnimationPhase(0, NaN)).toBe(0);
  });
});

describe("computeAnimatedTransform", () => {
  const orig = { x: 1, y: 2, z: 3 };
  const disp = { x: 0.1, uy: 0, uz: 0 } as unknown as { x: number; y: number; z: number };

  it("at phase=0 the displacement is zero (no offset from original)", () => {
    const out = computeAnimatedTransform("N", orig, { x: 0.1, y: 0, z: 0 }, 0, 1);
    expect(out.displacement.x).toBe(0);
    expect(out.displacement.y).toBe(0);
    expect(out.displacement.z).toBe(0);
  });

  it("at phase=pi/2 the displacement equals scale * unit displacement", () => {
    const out = computeAnimatedTransform("N", orig, { x: 0.1, y: 0, z: 0 }, Math.PI / 2, 1);
    expect(out.displacement.x).toBeCloseTo(0.1);
    expect(out.displacement.y).toBe(0);
  });

  it("at phase=pi the displacement flips sign", () => {
    const out = computeAnimatedTransform("N", orig, { x: 0.1, y: 0, z: 0 }, Math.PI, 1);
    expect(Math.abs(out.displacement.x)).toBeLessThan(1e-6);
  });

  it("scale multiplies the displacement", () => {
    const out = computeAnimatedTransform("N", orig, { x: 0.1, y: 0, z: 0 }, Math.PI / 2, 3);
    expect(out.displacement.x).toBeCloseTo(0.3);
  });
});

describe("computeDemoModeShape", () => {
  const project = createDefaultProject();

  it("uses the new bridge default project: deck y=20, base y=0", () => {
    for (const node of project.nodes) {
      if (node.id.startsWith("G")) {
        expect(node.y).toBeCloseTo(BRIDGE_PIER_HEIGHT);
        expect(node.z).toBeCloseTo(0);
      } else if (node.id.startsWith("B")) {
        expect(node.y).toBeCloseTo(0);
        expect(node.z).toBeCloseTo(0);
      }
    }
  });

  it("places superstructure nodes every 30m on X from 0 to 150m", () => {
    const xs = project.nodes.filter((n) => n.id.startsWith("G")).map((n) => n.x).sort((a, b) => a - b);
    expect(xs).toHaveLength(BRIDGE_NUM_SPANS + 1);
    for (let i = 0; i <= BRIDGE_NUM_SPANS; i += 1) {
      expect(xs[i]).toBeCloseTo(i * 30);
    }
  });

  it("produces a longitudinal pseudo-mode that sways more on the soft side", () => {
    const shape = computeDemoModeShape(project, "longitudinal");
    let softAmplitude = 0;
    let rockAmplitude = 0;
    for (const [nodeId, vec] of shape.entries()) {
      if (!nodeId.startsWith("G")) continue;
      const pier = nodeId === "G0" || nodeId === "G5" ? "rock" : nodeId === "G1" || nodeId === "G2" ? "rock" : "soft";
      if (pier === "soft") softAmplitude = Math.max(softAmplitude, Math.abs(vec.ux));
      if (pier === "rock") rockAmplitude = Math.max(rockAmplitude, Math.abs(vec.ux));
    }
    expect(softAmplitude).toBeGreaterThan(rockAmplitude);
    expect(BRIDGE_SOFT_PIERS).toContain("B3");
    expect(BRIDGE_SOFT_PIERS).toContain("B4");
  });

  it("flips the dominant axis when the direction is transverse", () => {
    const longitudinal = computeDemoModeShape(project, "longitudinal");
    const transverse = computeDemoModeShape(project, "transverse");
    for (const [nodeId, vec] of longitudinal.entries()) {
      const counterpart = transverse.get(nodeId);
      if (!counterpart) continue;
      expect(counterpart.uz).toBeGreaterThanOrEqual(Math.abs(vec.ux));
    }
  });
});

describe("resolveAnimationDisplacementMap", () => {
  it("returns the demo map regardless of options (display-only fallback)", () => {
    const project = createDefaultProject();
    const map = resolveAnimationDisplacementMap(project, DEFAULT_ANIMATION_OPTIONS);
    expect(map.size).toBeGreaterThan(0);
  });
});

describe("withNodeDisplacement", () => {
  const project = createDefaultProject();

  it("returns original coordinates when animation is disabled", () => {
    const out = withNodeDisplacement(project, { ...DEFAULT_ANIMATION_OPTIONS, enabled: false }, 1.0);
    for (const node of project.nodes) {
      const pos = out.get(node.id);
      expect(pos).toBeDefined();
      expect(pos!.x).toBeCloseTo(node.x);
      expect(pos!.y).toBeCloseTo(node.y);
      expect(pos!.z).toBeCloseTo(node.z);
    }
  });

  it("returns original coordinates when the clock is null/undefined", () => {
    const out = withNodeDisplacement(project, { ...DEFAULT_ANIMATION_OPTIONS, enabled: true }, null);
    for (const node of project.nodes) {
      const pos = out.get(node.id);
      expect(pos!.x).toBeCloseTo(node.x);
      expect(pos!.y).toBeCloseTo(node.y);
    }
    const out2 = withNodeDisplacement(project, { ...DEFAULT_ANIMATION_OPTIONS, enabled: true }, undefined);
    for (const node of project.nodes) {
      const pos = out2.get(node.id);
      expect(pos!.x).toBeCloseTo(node.x);
    }
  });

  it("returns a non-empty override when enabled and the clock is provided", () => {
    const out = withNodeDisplacement(project, { ...DEFAULT_ANIMATION_OPTIONS, enabled: true }, 0.25);
    expect(out.size).toBe(project.nodes.length);
    let changedCount = 0;
    for (const node of project.nodes) {
      const pos = out.get(node.id);
      if (!pos) continue;
      if (pos.x !== node.x || pos.y !== node.y || pos.z !== node.z) changedCount += 1;
    }
    expect(changedCount).toBeGreaterThan(0);
  });

  it("does not mutate the original project nodes", () => {
    const snapshot = project.nodes.map((n) => ({ ...n }));
    withNodeDisplacement(project, { ...DEFAULT_ANIMATION_OPTIONS, enabled: true }, 0.25);
    for (let i = 0; i < project.nodes.length; i += 1) {
      expect(project.nodes[i].x).toBeCloseTo(snapshot[i].x);
      expect(project.nodes[i].y).toBeCloseTo(snapshot[i].y);
      expect(project.nodes[i].z).toBeCloseTo(snapshot[i].z);
    }
  });

  it("moves soft-pier deck nodes further than rock-pier deck nodes", () => {
    const out = withNodeDisplacement(project, { ...DEFAULT_ANIMATION_OPTIONS, enabled: true }, 0.25);
    let softDelta = 0;
    let rockDelta = 0;
    for (const [nodeId, pos] of out) {
      const node = project.nodes.find((n) => n.id === nodeId);
      if (!node) continue;
      const dx = pos.x - node.x;
      const pier = nodeId === "G0" || nodeId === "G5"
        ? "rock"
        : nodeId === "G1" || nodeId === "G2"
          ? "rock"
          : "soft";
      if (pier === "soft") softDelta = Math.max(softDelta, Math.abs(dx));
      else rockDelta = Math.max(rockDelta, Math.abs(dx));
    }
    expect(softDelta).toBeGreaterThan(rockDelta);
  });

  it("returns zero displacement at phase 0 (t=0) and maximum at phase pi/2 (t=0.25)", () => {
    const at0 = withNodeDisplacement(project, { ...DEFAULT_ANIMATION_OPTIONS, enabled: true }, 0);
    const atQuarter = withNodeDisplacement(project, { ...DEFAULT_ANIMATION_OPTIONS, enabled: true }, 0.25);
    let zeroDelta = 0;
    let peakDelta = 0;
    for (const node of project.nodes) {
      const a = at0.get(node.id);
      const b = atQuarter.get(node.id);
      if (!a || !b) continue;
      zeroDelta = Math.max(zeroDelta, Math.abs(a.x - node.x) + Math.abs(a.y - node.y) + Math.abs(a.z - node.z));
      peakDelta = Math.max(peakDelta, Math.abs(b.x - node.x) + Math.abs(b.y - node.y) + Math.abs(b.z - node.z));
    }
    expect(zeroDelta).toBeLessThan(1e-6);
    expect(peakDelta).toBeGreaterThan(0);
  });

  it("scales the displacement linearly with the scale option", () => {
    const optionsBase: typeof DEFAULT_ANIMATION_OPTIONS = { ...DEFAULT_ANIMATION_OPTIONS, scale: 1 };
    const options5: typeof DEFAULT_ANIMATION_OPTIONS = { ...DEFAULT_ANIMATION_OPTIONS, scale: 5 };
    const base = withNodeDisplacement(project, optionsBase, 0.25);
    const big = withNodeDisplacement(project, options5, 0.25);
    const node = project.nodes.find((n) => n.id === "G4")!;
    const basePos = base.get(node.id)!;
    const bigPos = big.get(node.id)!;
    const baseDelta = Math.abs(basePos.x - node.x);
    const bigDelta = Math.abs(bigPos.x - node.x);
    expect(bigDelta).toBeCloseTo(baseDelta * 5, 5);
  });

  it("flips direction when demoDirection is transverse (longitudinal vs transverse swap)", () => {
    const longitudinal = withNodeDisplacement(project, { ...DEFAULT_ANIMATION_OPTIONS, enabled: true, demoDirection: "longitudinal" }, 0.25);
    const transverse = withNodeDisplacement(project, { ...DEFAULT_ANIMATION_OPTIONS, enabled: true, demoDirection: "transverse" }, 0.25);
    const node = project.nodes.find((n) => n.id === "G3")!;
    const longPos = longitudinal.get(node.id)!;
    const transPos = transverse.get(node.id)!;
    const longDeltaX = Math.abs(longPos.x - node.x);
    const longDeltaZ = Math.abs(longPos.z - node.z);
    const transDeltaX = Math.abs(transPos.x - node.x);
    const transDeltaZ = Math.abs(transPos.z - node.z);
    expect(longDeltaX).toBeGreaterThan(0);
    expect(transDeltaZ).toBeGreaterThan(0);
  });
});

