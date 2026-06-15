import { describe, expect, it } from "vitest";
import {
  applySpacerAxisSwap,
  createSpacerAxisSwap,
  modelDisplacementToViewer,
  modelMemberLoadToViewer,
  modelNodalLoadToViewer,
  modelToViewerVector,
} from "./coordinateTransform";

describe("applySpacerAxisSwap", () => {
  it("returns identical coordinates when swap is off", () => {
    const out = applySpacerAxisSwap(1, 2, 3, "off");
    expect(out).toEqual({ x: 1, y: 2, z: 3 });
  });

  it("swaps Y and Z when swap is on", () => {
    const out = applySpacerAxisSwap(1, 2, 3, "on");
    expect(out).toEqual({ x: 1, y: 3, z: 2 });
  });

  it("keeps the X component untouched in both modes", () => {
    const off = applySpacerAxisSwap(-4.5, 0.1, 7.2, "off");
    const on = applySpacerAxisSwap(-4.5, 0.1, 7.2, "on");
    expect(off.x).toBe(-4.5);
    expect(on.x).toBe(-4.5);
  });
});

describe("createSpacerAxisSwap", () => {
  it("treats true / \"on\" as on and anything else as off", () => {
    expect(createSpacerAxisSwap(true)).toBe("on");
    expect(createSpacerAxisSwap("on")).toBe("on");
    expect(createSpacerAxisSwap(false)).toBe("off");
    expect(createSpacerAxisSwap("off")).toBe("off");
    expect(createSpacerAxisSwap(undefined)).toBe("off");
  });
});

describe("model* -> viewer conversions", () => {
  it("modelToViewerVector returns a Vector3 with swapped axes when on", () => {
    const off = modelToViewerVector({ x: 1, y: 2, z: 3 }, "off");
    const on = modelToViewerVector({ x: 1, y: 2, z: 3 }, "on");
    expect(off.toArray()).toEqual([1, 2, 3]);
    expect(on.toArray()).toEqual([1, 3, 2]);
  });

  it("modelNodalLoadToViewer returns a force/moment pair that is Y/Z swapped when on", () => {
    const off = modelNodalLoadToViewer({ fx: 1, fy: 2, fz: 3, mx: 4, my: 5, mz: 6 }, "off");
    const on = modelNodalLoadToViewer({ fx: 1, fy: 2, fz: 3, mx: 4, my: 5, mz: 6 }, "on");
    expect(off.force.toArray()).toEqual([1, 2, 3]);
    expect(on.force.toArray()).toEqual([1, 3, 2]);
    expect(off.moment.toArray()).toEqual([4, 5, 6]);
    expect(on.moment.toArray()).toEqual([4, 6, 5]);
  });

  it("modelMemberLoadToViewer swaps Y/Z for distributed load direction", () => {
    const off = modelMemberLoadToViewer({ wx: 0, wy: -1, wz: 0 }, "off");
    const on = modelMemberLoadToViewer({ wx: 0, wy: -1, wz: 0 }, "on");
    expect(off.toArray()).toEqual([0, -1, 0]);
    expect(on.toArray()).toEqual([0, 0, -1]);
  });

  it("modelDisplacementToViewer swaps Y/Z for ux/uy/uz", () => {
    const off = modelDisplacementToViewer({ ux: 0.1, uy: 0.2, uz: 0.3 }, "off");
    const on = modelDisplacementToViewer({ ux: 0.1, uy: 0.2, uz: 0.3 }, "on");
    expect(off.toArray()).toEqual([0.1, 0.2, 0.3]);
    expect(on.toArray()).toEqual([0.1, 0.3, 0.2]);
  });
});