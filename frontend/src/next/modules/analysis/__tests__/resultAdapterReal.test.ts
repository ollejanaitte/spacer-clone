import { describe, expect, it } from "vitest";
import { extractLinearStaticResultFromIf3 } from "../resultAdapter";

describe("resultAdapter (Phase 9-04R3 I-06/07/08)", () => {
  it("extracts rows from the canonical payload shape {schemaVersion, rows}", () => {
    const if3 = {
      status: "SUCCEEDED",
      payload: {
        nodeDisplacement: {
          schemaVersion: "0.1.0",
          rows: [
            { loadCaseId: "LC1", entityId: "n1", values: { ux: 0, uy: 0, uz: 0, rx: 0, ry: 0, rz: 0 } },
            { loadCaseId: "LC1", entityId: "n2", values: { ux: 0, uy: 0, uz: -0.5, rx: 0, ry: 0, rz: 0 } },
          ],
        },
        supportReaction: {
          schemaVersion: "0.1.0",
          rows: [
            { loadCaseId: "LC1", nodeId: "n1", supportId: "A1", values: { fx: 0, fy: 0, fz: 125, mx: 0, my: 0, mz: 0 } },
          ],
        },
        memberForce: {
          schemaVersion: "0.1.0",
          rows: [
            { loadCaseId: "LC1", entityId: "m1", values: { i: { fx: -125, fy: 0, fz: 0, mx: 0, my: 0, mz: 0 }, j: { fx: 125, fy: 0, fz: 0, mx: 0, my: 0, mz: 0 } } },
          ],
        },
      },
    } as never;
    const view = extractLinearStaticResultFromIf3(if3);
    expect(view.displacements.length).toBe(2);
    expect(view.reactions.length).toBe(1);
    expect(view.reactions[0]!.fz).toBe(125);
    expect(view.memberForces.length).toBe(1);
    expect(view.memberForces[0]!.i.fx).toBe(-125);
  });
});
