import { describe, expect, it } from "vitest";
import { validateFrameAnalysisResultResource } from "../../../../contracts/frameAnalysisResultResource";
import { extractLinearStaticResultFromIf3 } from "../resultAdapter";
import { REAL_IF3_RESULT_RAW } from "./realIf3Fixture";

const REAL_IF3_RESULT = REAL_IF3_RESULT_RAW as never;

describe("resultAdapter canonical IF3 contract (Phase 9-04R3 Sol #1)", () => {
  it("validates against the FrameAnalysisResultResource contract (SUCCEEDED)", () => {
    const validation = validateFrameAnalysisResultResource(REAL_IF3_RESULT as never);
    expect(validation.status).toBe("valid");
    expect(validation.issues).toEqual([]);
  });

  it("reads loadCase label from loadContext.entries via loadContextId", () => {
    const view = extractLinearStaticResultFromIf3(REAL_IF3_RESULT);
    expect(view.reactions[0]?.loadCaseId).toBe("LC1");
    expect(view.memberForces[0]?.loadCaseId).toBe("LC1");
    expect(view.displacements[0]?.loadCaseId).toBe("LC1");
  });

  it("reads entityId as node/member id (canonical entityId, not nodeId/supportId)", () => {
    const view = extractLinearStaticResultFromIf3(REAL_IF3_RESULT);
    expect(view.reactions[0]?.nodeId).toBe("6a27c03d-ec97-5476-a605-f5b61b64809b");
    expect(view.memberForces[0]?.memberId).toBe("d059b760-59aa-5442-98f2-dc81d5bd486a");
    expect(view.displacements[0]?.nodeId).toBe("0011bfd9-b117-503b-8c62-6e3a3a69086f");
  });

  it("reads member force from FLAT keys i.fx..j.mz (canonical)", () => {
    const view = extractLinearStaticResultFromIf3(REAL_IF3_RESULT);
    const mf = view.memberForces[0]!;
    expect(mf.i.fx).toBe(-125);
    expect(mf.j.fx).toBe(125);
    expect(mf.i.fz).toBe(10);
    expect(mf.j.fz).toBe(-10);
    expect(mf.i.my).toBe(-40);
  });

  it("reads reaction vertical from fz (non-zero real value)", () => {
    const view = extractLinearStaticResultFromIf3(REAL_IF3_RESULT);
    expect(view.reactions[0]?.fz).toBe(125);
  });

  it("reads non-zero displacement values", () => {
    const view = extractLinearStaticResultFromIf3(REAL_IF3_RESULT);
    expect(view.displacements[1]?.uz).toBe(-0.5);
  });

  it("does NOT coerce missing numeric values to 0 (fail-closed)", () => {
    const partial = {
      ...REAL_IF3_RESULT_RAW,
      payload: {
        memberForce: {
          schemaVersion: "0.1.0",
          rows: [
            { entityKind: "member", entityId: "m1", values: { "i.fx": 5 }, loadContextId: "c1" },
          ],
        },
      },
    } as never;
    const view = extractLinearStaticResultFromIf3(partial);
    expect(view.memberForces[0]?.i.fx).toBe(5);
    expect(view.memberForces[0]?.i.fy).toBeUndefined();
    expect(view.memberForces[0]?.j.fx).toBeUndefined();
  });
});
