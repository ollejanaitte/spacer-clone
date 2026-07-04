import { describe, expect, it } from "vitest";
import { runExportValidation } from "./ExportValidator";
import { createSampleImporterProject } from "../__tests__/fixtures/sampleProject";

describe("ExportValidator", () => {
  it("summarizes validation for export", () => {
    const project = createSampleImporterProject();
    const summary = runExportValidation(project);
    expect(summary.diagnostics.length).toBeGreaterThan(0);
    expect(summary.renderability.export).not.toBe("blocked");
  });
});
