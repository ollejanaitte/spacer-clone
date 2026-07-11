import { describe, expect, it } from "vitest";
import { compareAnalysisResults, createAnalysisResultParityEnvelope, serializeAnalysisResultParityEnvelope } from "../index";
import { eigenParityFixtures, staticParityFixtures } from "./fixtures/resultParityFixtures";

describe("result parity core", () => {
  it("keeps static results equivalent with semantic identity matching", () => {
    const report = compareAnalysisResults(staticParityFixtures.left, staticParityFixtures.right);
    expect(report.status).toBe("equivalent");
    expect(report.resultSummary.static?.displacementCount).toBe(2);
    expect(report.resultSummary.static?.reactionCount).toBe(1);
  });

  it("treats reversed member end force data as indeterminate until core reversal is proven", () => {
    const report = compareAnalysisResults(staticParityFixtures.left, staticParityFixtures.reversedMember);
    expect(report.status).toBe("indeterminate");
  });

  it("accepts eigen mode permutations and sign-invariant MAC", () => {
    const report = compareAnalysisResults(eigenParityFixtures.left, eigenParityFixtures.modeReversed);
    expect(report.status).toBe("equivalent");
    expect(report.resultSummary.eigen?.matchedModeCount).toBe(2);
  });

  it("treats sign-flipped modes as equivalent", () => {
    const report = compareAnalysisResults(eigenParityFixtures.left, eigenParityFixtures.signFlipped);
    expect(report.status).toBe("equivalent");
  });

  it("keeps missing, failed, and invalid distinct", () => {
    expect(compareAnalysisResults(eigenParityFixtures.missingFailedInvalid.missing, eigenParityFixtures.left).status).toBe("indeterminate");
    expect(compareAnalysisResults(eigenParityFixtures.missingFailedInvalid.failed, eigenParityFixtures.left).status).toBe("invalid");
    expect(compareAnalysisResults(eigenParityFixtures.missingFailedInvalid.invalid, eigenParityFixtures.left).status).toBe("invalid");
  });
});

describe("result parity serializer", () => {
  it("serializes deterministically", () => {
    const envelope = createAnalysisResultParityEnvelope(staticParityFixtures.left, staticParityFixtures.right, {
      sources: {
        left: { source: "bridgeDefinition", label: "left" },
        right: { source: "bridgeDefinition", label: "right" },
      },
      generatedAt: "2026-07-11T12:00:00.000Z",
      toolVersion: "test",
    });
    const first = serializeAnalysisResultParityEnvelope(envelope);
    const second = serializeAnalysisResultParityEnvelope(envelope);
    expect(first).toBe(second);
  });
});
