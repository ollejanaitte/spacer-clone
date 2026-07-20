import { describe, expect, it } from "vitest";
import type { HosoDefinitionDraft } from "../../../schema/types";
import { buildHosoValidationContext, validateHosoDefinitions } from "../validateHosoDefinitions";
import { LINER_HOSO_DIAGNOSTIC_CODES } from "../diagnostics";

function buildContext() {
  return buildHosoValidationContext([
    {
      id: "alignment-1",
      name: "alignment-1",
      enabled: true,
      sortIndex: 0,
      alignment: { id: "alignment-1", elements: [] },
      stationDefinition: { originDisplayedStation: 0, interval: 10 },
      verticalAlignment: { id: "VA-1", elements: [] },
      crossSections: [
        {
          id: "CS-1",
          name: "Test",
          offsetLines: [{ id: "OL-girder", offset: -5, elevation: 0, role: "custom" }],
        },
      ],
      gridDefinitions: [],
      spans: [],
      piers: [],
    },
  ]);
}

function baseDefinition(
  overrides: Partial<HosoDefinitionDraft> = {},
): HosoDefinitionDraft {
  return {
    id: "hoso-def-1",
    alignmentId: "alignment-1",
    family: "longitudinal",
    variant: "longitudinal_only",
    stationRange: { fromM: 0, toM: 100 },
    anchors: [
      { id: "a1", stationPhysicalDistanceM: 0, thicknessM: 0.2, lineId: "OL-girder" },
      { id: "a2", stationPhysicalDistanceM: 100, thicknessM: 0.3, lineId: "OL-girder" },
    ],
    ...overrides,
  } as HosoDefinitionDraft;
}

describe("validateHosoDefinitions fail-closed", () => {
  it("rejects unknown alignment", () => {
    const diagnostics = validateHosoDefinitions(
      [baseDefinition({ alignmentId: "missing" })],
      buildContext(),
    );
    expect(
      diagnostics.some((entry) => entry.code === LINER_HOSO_DIAGNOSTIC_CODES.invalidReference),
    ).toBe(true);
  });

  it("rejects unsupported variant", () => {
    const diagnostics = validateHosoDefinitions(
      [
        {
          ...baseDefinition(),
          variant: "unknown_variant",
        } as unknown as HosoDefinitionDraft,
      ],
      buildContext(),
    );
    expect(
      diagnostics.some((entry) => entry.code === LINER_HOSO_DIAGNOSTIC_CODES.unsupportedType),
    ).toBe(true);
  });

  it("rejects overlapping offset bands", () => {
    const diagnostics = validateHosoDefinitions(
      [
        baseDefinition({
          offsetBands: [
            { id: "b1", upperLineId: "OL-girder", lowerLineId: "OL-girder" },
            { id: "b2", upperLineId: "OL-girder", lowerLineId: "OL-girder" },
          ],
        }),
      ],
      buildContext(),
    );
    expect(
      diagnostics.some((entry) => entry.code === LINER_HOSO_DIAGNOSTIC_CODES.overlappingBand),
    ).toBe(true);
  });
});
