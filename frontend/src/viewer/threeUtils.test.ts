import { describe, expect, it } from "vitest";
import { createDefaultProject } from "../data/defaultProject";
import { createNodeMap, createDisplacementMap } from "./threeUtils";
import type { AnalysisResult } from "../types";

describe("createNodeMap", () => {
  it("returns viewer coordinates identical to model coordinates when swap is off", () => {
    const project = createDefaultProject();
    const map = createNodeMap(project, "off");
    for (const node of project.nodes) {
      const position = map.get(node.id);
      expect(position).not.toBeUndefined();
      expect(position!.x).toBeCloseTo(node.x);
      expect(position!.y).toBeCloseTo(node.y);
      expect(position!.z).toBeCloseTo(node.z);
    }
  });

  it("swaps Y and Z when swap is on, while leaving X unchanged", () => {
    const project = createDefaultProject();
    const map = createNodeMap(project, "on");
    for (const node of project.nodes) {
      const position = map.get(node.id);
      expect(position).not.toBeUndefined();
      expect(position!.x).toBeCloseTo(node.x);
      expect(position!.y).toBeCloseTo(node.z);
      expect(position!.z).toBeCloseTo(node.y);
    }
  });
});

describe("createDisplacementMap", () => {
  const baseDisplacement = {
    loadCaseId: "LC1",
    nodeId: "N1",
    ux: 0.1,
    uy: 0.2,
    uz: 0.3,
    rx: 0,
    ry: 0,
    rz: 0,
  };

  const baseResult: AnalysisResult = {
    projectId: "p",
    schemaVersion: "1.0.0",
    analysisSummary: {
      analysisType: "linear_static",
      status: "success",
      startedAt: "2026-06-15T00:00:00Z",
      finishedAt: "2026-06-15T00:00:00Z",
      durationMs: 0,
      nodeCount: 1,
      memberCount: 0,
      loadCaseCount: 1,
      totalDof: 6,
      freeDof: 0,
      constrainedDof: 6,
      solver: "scipy_sparse",
    },
    displacements: [baseDisplacement],
    reactions: [],
    memberEndForces: [],
    warnings: [],
    errors: [],
  };

  it("returns the raw ux/uy/uz vector when swap is off", () => {
    const map = createDisplacementMap(baseResult, "LC1", 1, "SRSS", "off");
    const vec = map.get("N1");
    expect(vec).not.toBeUndefined();
    expect(vec!.toArray()).toEqual([0.1, 0.2, 0.3]);
  });

  it("swaps Y and Z for the displacement vector when swap is on", () => {
    const map = createDisplacementMap(baseResult, "LC1", 1, "SRSS", "on");
    const vec = map.get("N1");
    expect(vec).not.toBeUndefined();
    expect(vec!.toArray()).toEqual([0.1, 0.3, 0.2]);
  });
});