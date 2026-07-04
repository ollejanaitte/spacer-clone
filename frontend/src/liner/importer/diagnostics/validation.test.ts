import { describe, expect, it } from "vitest";
import { validateBridge, validateProject } from "./validateImporter";
import { IMPORTER_STATION_NOT_MONOTONIC } from "./diagnosticCodes";
import { createSampleBridge, createSampleImporterProject } from "../__tests__/fixtures/sampleProject";

describe("validateImporter", () => {
  it("detects station monotonic violations", () => {
    const bridge = createSampleBridge();
    const badSection = {
      ...bridge.sections[0]!,
      id: "section-bad",
      pdfPage: 99,
      stationingRef: {
        ...bridge.sections[0]!.stationingRef,
        stationValue: 100,
      },
    };
    const diagnostics = validateBridge({ ...bridge, sections: [...bridge.sections, badSection] });
    expect(diagnostics.some((item) => item.code === IMPORTER_STATION_NOT_MONOTONIC)).toBe(true);
  });

  it("validates full project", () => {
    const project = createSampleImporterProject();
    const diagnostics = validateProject(project);
    expect(Array.isArray(diagnostics)).toBe(true);
  });
});
