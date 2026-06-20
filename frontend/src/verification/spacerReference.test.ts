import { describe, expect, it } from "vitest";
import {
  parseSpacerDisplacements,
  parseSpacerReactions,
  parseSpacerMemberForces,
  compareDisplacements,
  compareReactions,
} from "./spacerReference";

const TOLERANCE = { relative: 1e-4, absolute: 1e-10 };

describe("parseSpacerDisplacements", () => {
  it("parses CSV displacement data", () => {
    const csv = `case_id,node_id,ux,uy,uz,rx,ry,rz
LC1,N1,0,0,0,0,0,0
LC1,N2,-1.23e-05,-1.041e-02,0,0,0,-3.902e-03`;
    const rows = parseSpacerDisplacements(csv);
    expect(rows.length).toBe(2);
    expect(rows[0].node_id).toBe("N1");
    expect(rows[1].node_id).toBe("N2");
    expect(rows[1].uy).toBeCloseTo(-0.01041, 5);
  });

  it("returns empty for header-only CSV", () => {
    const csv = "case_id,node_id,ux,uy,uz,rx,ry,rz";
    expect(parseSpacerDisplacements(csv)).toEqual([]);
  });
});

describe("parseSpacerReactions", () => {
  it("parses CSV reaction data", () => {
    const csv = `case_id,node_id,fx,fy,fz,mx,my,mz
LC1,N1,0,10,0,0,0,40`;
    const rows = parseSpacerReactions(csv);
    expect(rows.length).toBe(1);
    expect(rows[0].fy).toBe(10);
    expect(rows[0].mz).toBe(40);
  });
});

describe("parseSpacerMemberForces", () => {
  it("parses CSV member force data", () => {
    const csv = `case_id,member_id,station_x,station_ratio,n,qy,qz,mx,my,mz
LC1,M1,0,0,0,0,0,0,0,0
LC1,M1,1,1,0,-10,0,0,0,-40`;
    const rows = parseSpacerMemberForces(csv);
    expect(rows.length).toBe(2);
    expect(rows[1].qy).toBe(-10);
    expect(rows[1].mz).toBe(-40);
  });
});

describe("compareDisplacements", () => {
  it("compares spacer and clone displacements", () => {
    const spacer = [
      { case_id: "LC1", node_id: "N2", ux: 0, uy: -0.0104065, uz: 0, rx: 0, ry: 0, rz: -0.0039024 },
    ];
    const clone = [
      { nodeId: "N2", ux: 0, uy: -0.010406504, uz: 0, rx: 0, ry: 0, rz: -0.003902439 },
    ];
    const results = compareDisplacements(spacer, clone, TOLERANCE);
    expect(results.length).toBe(6);
    const uyResult = results.find((r) => r.component === "uy");
    expect(uyResult).toBeDefined();
    expect(uyResult!.passed).toBe(true);
  });

  it("detects mismatches", () => {
    const spacer = [
      { case_id: "LC1", node_id: "N2", ux: 0, uy: -0.01, uz: 0, rx: 0, ry: 0, rz: 0 },
    ];
    const clone = [
      { nodeId: "N2", ux: 0, uy: -0.02, uz: 0, rx: 0, ry: 0, rz: 0 },
    ];
    const results = compareDisplacements(spacer, clone, TOLERANCE);
    const uyResult = results.find((r) => r.component === "uy");
    expect(uyResult!.passed).toBe(false);
  });
});

describe("compareReactions", () => {
  it("compares spacer and clone reactions", () => {
    const spacer = [
      { case_id: "LC1", node_id: "N1", fx: 0, fy: 10, fz: 0, mx: 0, my: 0, mz: 40 },
    ];
    const clone = [
      { nodeId: "N1", fx: 0, fy: 10.0, fz: 0, mx: 0, my: 0, mz: 40.0 },
    ];
    const results = compareReactions(spacer, clone, TOLERANCE);
    expect(results.length).toBe(6);
    expect(results.every((r) => r.passed)).toBe(true);
  });
});
