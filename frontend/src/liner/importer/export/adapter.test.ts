import { describe, expect, it } from "vitest";
import { convertImporterToPhase35Draft } from "./ImporterToPhase35Adapter";
import { createSampleImporterProject } from "../__tests__/fixtures/sampleProject";

describe("ImporterToPhase35Adapter", () => {
  it("converts sample project to Phase 3.5 draft", () => {
    const project = createSampleImporterProject();
    const result = convertImporterToPhase35Draft(project);
    expect(result.draft).not.toBeNull();
    expect(result.conversionLog).not.toBeNull();
    expect(result.draft?.alignment.elements.length).toBeGreaterThan(0);
    expect(result.draft?.verticalAlignment.elements.length).toBeGreaterThan(0);
  });

  it("blocks export without plan alignment", () => {
    const project = createSampleImporterProject();
    project.bridges[0]!.alignmentMetadata = undefined;
    const result = convertImporterToPhase35Draft(project);
    expect(result.draft).toBeNull();
  });
});
