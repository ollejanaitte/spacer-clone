import { describe, expect, it } from "vitest";
import type { AnalysisResult } from "../types";
import { buildResultCsvExports } from "./resultCsvExport";

const influenceHeader =
  "case_id,line_id,target_id,target_type,node_id,member_id,component,end,station_index,station,ratio,x,y,z,value";

describe("result CSV influence line export", () => {
  it("exports targets in targetResults order and stations in station order", () => {
    const exports = buildResultCsvExports(influenceResult());

    expect(exports["influence_lines.csv"].split(/\r?\n/).filter(Boolean)).toEqual([
      influenceHeader,
      "inf-1,line-1,reaction-1,reaction,N1,,fy,,0,0,0,0,0,0,1",
      "inf-1,line-1,reaction-1,reaction,N1,,fy,,1,5,1,5,0,0,0",
      "inf-1,line-1,moment-1,memberEndForce,,M1,Mz,i,0,0,0,0,0,0,0",
      "inf-1,line-1,moment-1,memberEndForce,,M1,Mz,i,1,5,1,5,0,0,5",
    ]);
  });

  it("returns only the influence header when influenceResult is absent", () => {
    const result = influenceResult();
    delete result.influenceResult;

    expect(buildResultCsvExports(result)["influence_lines.csv"]).toBe(`${influenceHeader}\r\n`);
  });

  it("rejects target values whose length differs from stations", () => {
    const result = influenceResult();
    result.influenceResult!.targetResults[0].values = [1];

    expect(() => buildResultCsvExports(result)).toThrow(
      "Influence target result values length must match stations length.",
    );
  });

  it("rejects non-finite influence values", () => {
    const result = influenceResult();
    result.influenceResult!.targetResults[0].values[0] = Number.POSITIVE_INFINITY;

    expect(() => buildResultCsvExports(result)).toThrow("CSV value contains NaN or Infinity.");
  });

  it("keeps existing CSV exports unchanged", () => {
    const exports = buildResultCsvExports(influenceResult());

    expect(exports["displacements.csv"]).toBe("case_id,node_id,ux,uy,uz,rx,ry,rz\r\n");
    expect(exports["reactions.csv"]).toBe("case_id,node_id,fx,fy,fz,mx,my,mz\r\n");
    expect(exports["member_section_forces.csv"]).toBe(
      "case_id,member_id,station_x,station_ratio,n,qy,qz,mx,my,mz\r\n",
    );
  });
});

function influenceResult(): AnalysisResult {
  return {
    projectId: "p1",
    schemaVersion: "1.0.0",
    analysisSummary: {
      analysisType: "influence_line",
      status: "success",
      startedAt: "2026-06-07T00:00:00Z",
      finishedAt: "2026-06-07T00:00:00Z",
      durationMs: 0,
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
    memberEndForces: [],
    influenceResult: {
      caseId: "inf-1",
      line: {
        id: "line-1",
        memberId: "M1",
        stationCount: 2,
        loadDirection: { x: 0, y: -1, z: 0 },
        loadMagnitude: 1,
      },
      stations: [
        {
          station: 0,
          ratio: 0,
          position: { x: 0, y: 0, z: 0 },
          stationIndex: 0,
        },
        {
          station: 5,
          ratio: 1,
          position: { x: 5, y: 0, z: 0 },
          stationIndex: 1,
        },
      ],
      targets: [
        {
          id: "reaction-1",
          type: "reaction",
          nodeId: "N1",
          component: "fy",
        },
        {
          id: "moment-1",
          type: "memberEndForce",
          memberId: "M1",
          component: "Mz",
          end: "i",
        },
      ],
      targetResults: [
        { targetId: "reaction-1", values: [1, 0] },
        { targetId: "moment-1", values: [0, 5] },
      ],
    },
    warnings: [],
    errors: [],
  };
}
