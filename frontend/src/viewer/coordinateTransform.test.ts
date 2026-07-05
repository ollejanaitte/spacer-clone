// @vitest-environment jsdom

import { describe, expect, it, beforeEach, afterEach } from "vitest";
import {
  applySpacerAxisSwap,
  applyViewerDisplayTransform,
  createSpacerAxisSwap,
  isLinerDerivedProject,
  loadStoredSpacerAxisSwap,
  resolveInitialSpacerAxisSwap,
  resolveViewerDisplayCoordinatePolicy,
  SPACER_AXIS_SWAP_STORAGE_KEY,
  modelDisplacementToViewer,
  modelMemberLoadToViewer,
  modelNodalLoadToViewer,
  modelToViewerVector,
} from "./coordinateTransform";
import { createDefaultProject } from "../data/defaultProject";
import { PROJECT_LINER_METADATA_SCHEMA_VERSION } from "../liner/schema/types";

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

describe("applyViewerDisplayTransform", () => {
  it("keeps general project axis swap behavior unchanged", () => {
    expect(applyViewerDisplayTransform(1, 2, 3, "off", "general")).toEqual({ x: 1, y: 2, z: 3 });
    expect(applyViewerDisplayTransform(1, 2, 3, "on", "general")).toEqual({ x: 1, y: 3, z: 2 });
  });

  it("leaves liner project coordinates unchanged when swap is off", () => {
    const model = { x: 0, y: 5.4833, z: 17.6595 };
    expect(applyViewerDisplayTransform(model.x, model.y, model.z, "off", "liner")).toEqual(model);
  });

  it("maps LINER PH12/HCL model coordinates to bridge-oriented viewer display when swap is on", () => {
    const model = { x: 0, y: 0, z: 17.6595 };
    const out = applyViewerDisplayTransform(model.x, model.y, model.z, "on", "liner");
    expect(out.x).toBe(0);
    expect(out.y).toBeCloseTo(17.6595);
    expect(out.z).toBeCloseTo(0);
  });

  it("maps LINER PH12/G1 model coordinates to bridge-oriented viewer display when swap is on", () => {
    const model = { x: 0, y: 5.4833, z: 17.6595 };
    expect(applyViewerDisplayTransform(model.x, model.y, model.z, "on", "liner")).toEqual({
      x: 0,
      y: 17.6595,
      z: -5.4833,
    });
  });

  it("maps LINER PH12/ECL model coordinates to bridge-oriented viewer display when swap is on", () => {
    const model = { x: 0, y: -11.9577, z: 17.6595 };
    expect(applyViewerDisplayTransform(model.x, model.y, model.z, "on", "liner")).toEqual({
      x: 0,
      y: 17.6595,
      z: 11.9577,
    });
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

describe("isLinerDerivedProject", () => {
  it("returns true when project.liner metadata is present", () => {
    expect(
      isLinerDerivedProject({
        ...createDefaultProject(),
        liner: {
          schemaVersion: PROJECT_LINER_METADATA_SCHEMA_VERSION,
          linerModelId: "gc06",
          coordinatePolicyId: "policy",
          intermediateSchemaVersion: "0.2.0",
          sourceRevision: "abc123",
        },
      }),
    ).toBe(true);
  });

  it("returns false for general projects", () => {
    expect(isLinerDerivedProject(createDefaultProject())).toBe(false);
  });
});

describe("resolveViewerDisplayCoordinatePolicy", () => {
  it("selects liner display policy only for liner-derived projects", () => {
    expect(resolveViewerDisplayCoordinatePolicy(true)).toBe("liner");
    expect(resolveViewerDisplayCoordinatePolicy(false)).toBe("general");
  });
});

describe("resolveInitialSpacerAxisSwap", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    window.localStorage.clear();
  });

  it("defaults to on for liner-derived projects without a stored preference", () => {
    expect(resolveInitialSpacerAxisSwap(true)).toBe("on");
  });

  it("defaults to off for general projects without a stored preference", () => {
    expect(resolveInitialSpacerAxisSwap(false)).toBe("off");
  });

  it("respects an explicit stored on preference", () => {
    window.localStorage.setItem(SPACER_AXIS_SWAP_STORAGE_KEY, "on");
    expect(resolveInitialSpacerAxisSwap(false)).toBe("on");
    expect(resolveInitialSpacerAxisSwap(true)).toBe("on");
  });

  it("respects an explicit stored off preference", () => {
    window.localStorage.setItem(SPACER_AXIS_SWAP_STORAGE_KEY, "off");
    expect(resolveInitialSpacerAxisSwap(true)).toBe("off");
    expect(resolveInitialSpacerAxisSwap(false)).toBe("off");
  });

  it("treats missing localStorage as unset", () => {
    expect(loadStoredSpacerAxisSwap()).toBeNull();
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