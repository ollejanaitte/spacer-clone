import { describe, expect, it } from "vitest";
import { compareAnalysisResults, compareResponseSpectrumResults, createAnalysisResultParityEnvelope, serializeAnalysisResultParityEnvelope } from "../index";
import { responseSpectrumParityFixtures } from "./fixtures/responseSpectrumParityFixtures";

describe("response spectrum parity", () => {
  it("keeps supported response spectrum results equivalent", () => {
    const report = compareAnalysisResults(responseSpectrumParityFixtures.left, responseSpectrumParityFixtures.right);
    expect(report.status).toBe("equivalent");
    expect(report.resultSummary.responseSpectrum?.modalResultCount).toBe(2);
  });

  it("is order independent for modal results", () => {
    const report = compareAnalysisResults(responseSpectrumParityFixtures.left, responseSpectrumParityFixtures.permuted);
    expect(report.status).toBe("equivalent");
  });

  it("distinguishes missing, failed, and invalid results", () => {
    expect(compareAnalysisResults(responseSpectrumParityFixtures.missing, responseSpectrumParityFixtures.left).status).toBe("indeterminate");
    expect(compareAnalysisResults(responseSpectrumParityFixtures.failed, responseSpectrumParityFixtures.left).status).toBe("invalid");
    expect(compareAnalysisResults(responseSpectrumParityFixtures.invalid, responseSpectrumParityFixtures.left).status).toBe("invalid");
  });

  it("keeps explicit zero distinct from missing", () => {
    const report = compareAnalysisResults(responseSpectrumParityFixtures.zero, responseSpectrumParityFixtures.left);
    expect(report.status).toBe("different");
  });

  it("serializes deterministically", () => {
    const envelope = createAnalysisResultParityEnvelope(responseSpectrumParityFixtures.left, responseSpectrumParityFixtures.right, {
      sources: {
        left: { source: "bridgeDefinition", label: "left" },
        right: { source: "bridgeDefinition", label: "right" },
      },
      generatedAt: "2026-07-11T12:00:00.000Z",
      toolVersion: "test",
    });
    expect(serializeAnalysisResultParityEnvelope(envelope)).toBe(serializeAnalysisResultParityEnvelope(envelope));
  });

  it("compares response spectrum results directly", () => {
    const report = compareResponseSpectrumResults(responseSpectrumParityFixtures.left.responseSpectrumResult!, responseSpectrumParityFixtures.right.responseSpectrumResult!, {
      coordinate: { absolute: 1e-6 },
      length: { absolute: 1e-4, relative: 1e-6, floor: 1 },
      scalar: { absolute: 1e-9, relative: 1e-6, floor: 1e-9 },
      angle: { absolute: 1e-6 },
    });
    expect(report.status).toBe("equivalent");
  });
});
