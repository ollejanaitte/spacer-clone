import { describe, expect, it } from "vitest";
import { LINER_DIAGNOSTIC_CODES } from "../diagnostics";
import { validateCrossSectionTemplates } from "../crossSectionTemplateValidation";

function baseTemplate() {
  return {
    id: "CS-1",
    name: "Default",
    offsetLines: [
      { id: "OL-c", offset: 0, elevation: 0, role: "lane" as const },
      { id: "OL-r", offset: 4, elevation: 0, role: "edge" as const },
    ],
  };
}

describe("validateCrossSectionTemplates", () => {
  it("returns no issues for a valid template without grid definitions", () => {
    expect(validateCrossSectionTemplates({ crossSections: [baseTemplate()] })).toEqual([]);
  });

  it("flags duplicate template ids", () => {
    const issues = validateCrossSectionTemplates({
      crossSections: [baseTemplate(), { ...baseTemplate(), name: "Copy" }],
    });
    expect(issues).toContainEqual(
      expect.objectContaining({
        level: "error",
        code: LINER_DIAGNOSTIC_CODES.crossSectionTemplateDuplicateId,
        entityId: "CS-1",
      }),
    );
  });

  it("flags missing template id", () => {
    const issues = validateCrossSectionTemplates({
      crossSections: [{ ...baseTemplate(), id: "" }],
    });
    expect(issues).toContainEqual(
      expect.objectContaining({
        level: "error",
        code: LINER_DIAGNOSTIC_CODES.crossSectionTemplateMissingId,
      }),
    );
  });

  it("flags duplicate offset line ids within a template", () => {
    const issues = validateCrossSectionTemplates({
      crossSections: [
        {
          ...baseTemplate(),
          offsetLines: [
            { id: "OL-dup", offset: 0, elevation: 0 },
            { id: "OL-dup", offset: 4, elevation: 0 },
          ],
        },
      ],
    });
    expect(issues).toContainEqual(
      expect.objectContaining({
        level: "error",
        code: LINER_DIAGNOSTIC_CODES.crossSectionOffsetLineDuplicateId,
        entityId: "CS-1:OL-dup",
      }),
    );
  });

  it("flags missing grid definition template reference", () => {
    const issues = validateCrossSectionTemplates({
      crossSections: [baseTemplate()],
      gridDefinitions: [
        {
          id: "GRID-1",
          crossSectionTemplateId: "CS-missing",
          stationRange: { startPhysicalDistance: 0, endPhysicalDistance: 50 },
        },
      ],
      alignmentTotalLength: 100,
    });
    expect(issues).toContainEqual(
      expect.objectContaining({
        level: "error",
        code: LINER_DIAGNOSTIC_CODES.crossSectionTemplateReferenceMissing,
        entityId: "GRID-1",
      }),
    );
  });

  it("flags invalid offset line references in grid definitions", () => {
    const issues = validateCrossSectionTemplates({
      crossSections: [baseTemplate()],
      gridDefinitions: [
        {
          id: "GRID-1",
          crossSectionTemplateId: "CS-1",
          stationRange: { startPhysicalDistance: 0, endPhysicalDistance: 50 },
          offsetLineIds: ["OL-missing"],
        },
      ],
      alignmentTotalLength: 100,
    });
    expect(issues).toContainEqual(
      expect.objectContaining({
        level: "error",
        code: LINER_DIAGNOSTIC_CODES.crossSectionOffsetLineReferenceMissing,
        entityId: "GRID-1",
      }),
    );
  });

  it("flags overlapping grid definition ranges", () => {
    const issues = validateCrossSectionTemplates({
      crossSections: [baseTemplate()],
      gridDefinitions: [
        {
          id: "GRID-1",
          crossSectionTemplateId: "CS-1",
          stationRange: { startPhysicalDistance: 0, endPhysicalDistance: 60 },
        },
        {
          id: "GRID-2",
          crossSectionTemplateId: "CS-1",
          stationRange: { startPhysicalDistance: 40, endPhysicalDistance: 100 },
        },
      ],
      alignmentTotalLength: 100,
    });
    expect(issues).toContainEqual(
      expect.objectContaining({
        level: "error",
        code: LINER_DIAGNOSTIC_CODES.crossSectionGridDefinitionOverlap,
        entityId: "GRID-1:GRID-2",
      }),
    );
  });
});
