import { describe, expect, it } from "vitest";
import { deriveAnalysisEntityId } from "../analysisId";
import { ANALYSIS_ID_NAMESPACE } from "../analysisDocumentTypes";

describe("analysisId (Phase 7-01 A §4 FROZEN)", () => {
  it("derives deterministic UUIDv5 for the same kind+source", () => {
    const a = deriveAnalysisEntityId("node", "supportPoint:AR2:AG1");
    const b = deriveAnalysisEntityId("node", "supportPoint:AR2:AG1");
    expect(a).toBe(b);
  });

  it("is version 5 and RFC variant", () => {
    const id = deriveAnalysisEntityId("member", "M-L-AG1-S1");
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  });

  it("differs across kinds / sources", () => {
    const node = deriveAnalysisEntityId("node", "supportPoint:AR2:AG1");
    const member = deriveAnalysisEntityId("member", "supportPoint:AR2:AG1");
    const other = deriveAnalysisEntityId("node", "supportPoint:PR1:AG1");
    expect(node).not.toBe(member);
    expect(node).not.toBe(other);
  });

  it("rejects empty inputs", () => {
    expect(() => deriveAnalysisEntityId("", "x")).toThrow();
    expect(() => deriveAnalysisEntityId("node", "")).toThrow();
  });

  it("uses the frozen analysis namespace", () => {
    expect(ANALYSIS_ID_NAMESPACE).toBe("a12d8c1e-11f4-4d6b-9a2e-7f8c5d0e1b3a");
  });
});
