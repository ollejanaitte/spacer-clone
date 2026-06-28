import { describe, expect, it } from "vitest";
import { buildMemberForceDetail, formatForceValue } from "./memberForceDetail";
import type { AnalysisResult, ProjectModel } from "../types";

function createMockProject(): ProjectModel {
  return {
    schemaVersion: 1,
    project: {
      id: "test",
      name: "Test",
      schemaVersion: "1.0.0",
      description: "",
      createdAt: "",
      updatedAt: "",
    },
    units: { length: "m", force: "kN", moment: "kN·m", modulus: "kN/m²", area: "m²", inertia: "m⁴" },
    nodes: [
      { id: "N1", x: 0, y: 0, z: 0 },
      { id: "N2", x: 5, y: 0, z: 0 },
    ],
    materials: [],
    sections: [],
    members: [
      { id: "M1", nodeI: "N1", nodeJ: "N2", materialId: "", sectionId: "" },
    ],
    supports: [],
    loadCases: [{ id: "LC1", name: "LC1", type: "static" }],
    nodalLoads: [],
    memberLoads: [],
    analysisSettings: {
      analysisType: "linear_static",
      includeShearDeformation: false,
      largeDisplacement: false,
      tolerance: 1e-6,
    },
  };
}

function createMockResult(): AnalysisResult {
  return {
    projectId: "test",
    schemaVersion: "1.0.0",
    analysisSummary: {
      analysisType: "linear_static",
      status: "success",
      startedAt: "",
      finishedAt: "",
      durationMs: 100,
      nodeCount: 2,
      memberCount: 1,
      loadCaseCount: 1,
      totalDof: 12,
      freeDof: 6,
      constrainedDof: 6,
      solver: "scipy_sparse",
    },
    displacements: [],
    reactions: [],
    memberEndForces: [
      {
        loadCaseId: "LC1",
        memberId: "M1",
        coordinateSystem: "local",
        i: { fx: -10, fy: -5, fz: 3, mx: 1, my: -20, mz: 15 },
        j: { fx: 10, fy: 5, fz: -3, mx: -1, my: 20, mz: -15 },
      },
    ],
    warnings: [],
    errors: [],
  };
}

describe("buildMemberForceDetail", () => {
  it("returns null when no member is selected", () => {
    const result = buildMemberForceDetail(createMockProject(), createMockResult(), null, "LC1");
    expect(result).toBeNull();
  });

  it("returns null when result has errors", () => {
    const resultWithErrors = { ...createMockResult(), errors: [{ code: "E", message: "err", path: null, entityType: null, entityId: null }] };
    const result = buildMemberForceDetail(createMockProject(), resultWithErrors, "M1", "LC1");
    expect(result).toBeNull();
  });

  it("returns null when member does not exist", () => {
    const result = buildMemberForceDetail(createMockProject(), createMockResult(), "NONEXISTENT", "LC1");
    expect(result).toBeNull();
  });

  it("builds detail for a valid member", () => {
    const detail = buildMemberForceDetail(createMockProject(), createMockResult(), "M1", "LC1");
    expect(detail).not.toBeNull();
    expect(detail!.memberId).toBe("M1");
    expect(detail!.nodeI).toBe("N1");
    expect(detail!.nodeJ).toBe("N2");
    expect(detail!.forces.length).toBe(6);

    const nForce = detail!.forces.find((f) => f.component === "N")!;
    expect(nForce.iValue).toBe(10);
    expect(nForce.jValue).toBe(10);
    expect(nForce.unit).toBe("kN");

    const myForce = detail!.forces.find((f) => f.component === "My")!;
    expect(myForce.iValue).toBe(20);
    expect(myForce.jValue).toBe(20);
    expect(myForce.unit).toBe("kN·m");
  });
});

describe("formatForceValue", () => {
  it("formats normal values", () => {
    expect(formatForceValue(0)).toBe("0");
    expect(formatForceValue(1.5)).toBe("1.5");
    expect(formatForceValue(-3.14)).toBe("-3.14");
  });

  it("formats large values in exponential", () => {
    expect(formatForceValue(150000)).toMatch(/1\.500e\+5/);
  });

  it("formats very small values in exponential", () => {
    expect(formatForceValue(0.0001)).toMatch(/1\.000e-4/);
  });

  it("returns -- for non-finite", () => {
    expect(formatForceValue(NaN)).toBe("--");
    expect(formatForceValue(Infinity)).toBe("--");
  });
});
