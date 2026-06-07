import { describe, expect, it } from "vitest";
import type { AnalysisResult, EndForce } from "../types";
import { buildResultViewModel } from "./resultViewModel";

describe("buildResultViewModel member-force diagrams", () => {
  it("normalizes connected element end forces into a continuous simple-beam moment diagram", () => {
    const result = staticResult([
      {
        loadCaseId: "LC1",
        memberId: "M1",
        coordinateSystem: "local",
        i: endForce({ mz: 0 }),
        j: endForce({ mz: 10 }),
      },
      {
        loadCaseId: "LC1",
        memberId: "M2",
        coordinateSystem: "local",
        i: endForce({ mz: -10 }),
        j: endForce({ mz: 0 }),
      },
    ]);

    const moments = buildResultViewModel(result, "LC1")?.memberForces.items.filter(
      (item) => item.component === "Mz",
    );

    expect(moments?.map((item) => item.stations.map((station) => station.value))).toEqual([
      [0, 10],
      [10, 0],
    ]);
    expect(moments?.[0].stations[1].value).toBe(moments?.[1].stations[0].value);
  });
});

function endForce(values: Partial<EndForce>): EndForce {
  return {
    fx: 0,
    fy: 0,
    fz: 0,
    mx: 0,
    my: 0,
    mz: 0,
    ...values,
  };
}

function staticResult(memberEndForces: AnalysisResult["memberEndForces"]): AnalysisResult {
  return {
    projectId: "simple-beam",
    schemaVersion: "1.0.0",
    analysisSummary: {
      analysisType: "linear_static",
      status: "success",
      startedAt: "2026-06-06T00:00:00Z",
      finishedAt: "2026-06-06T00:00:00Z",
      durationMs: 0,
      nodeCount: 3,
      memberCount: 2,
      loadCaseCount: 1,
      totalDof: 18,
      freeDof: 7,
      constrainedDof: 11,
      solver: "scipy_sparse",
    },
    displacements: [],
    reactions: [],
    memberEndForces,
    warnings: [],
    errors: [],
  };
}
