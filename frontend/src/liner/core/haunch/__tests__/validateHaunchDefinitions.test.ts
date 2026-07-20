import { describe, expect, it } from "vitest";
import {
  addLinerOffset,
  createDefaultLinerDraft,
  updateLinerCrossSectionTemplate,
} from "../../../adapters/linerUiAdapter";
import { buildIntermediateResult } from "../../pipeline/pipeline";
import type { HaunchDefinitionDraft } from "../../../schema/types";
import { LINER_HAUNCH_DIAGNOSTIC_CODES } from "../diagnostics";
import { buildHaunchValidationContext, validateHaunchDefinitions } from "../validateHaunchDefinitions";

function buildContext() {
  let draft = addLinerOffset(createDefaultLinerDraft());
  draft = updateLinerCrossSectionTemplate(draft, {
    id: draft.crossSections?.[0]?.id ?? `CS-${draft.alignment.id}`,
    name: draft.crossSections?.[0]?.name ?? "Test",
    offsetLines: [
      { id: "OL-left", offset: -3, elevation: 0, role: "custom" },
      { id: "OL-right", offset: 3, elevation: 0, role: "custom" },
    ],
  });
  const intermediate = buildIntermediateResult(draft);
  return buildHaunchValidationContext(draft.linerAlignments ?? [], intermediate);
}

function baseTwoPointDefinition(
  overrides: Partial<HaunchDefinitionDraft> = {},
): HaunchDefinitionDraft {
  return {
    id: "haunch-1",
    alignmentId: "alignment-1",
    family: "two_point",
    variant: "two_support_points",
    stationRange: { fromM: 0, toM: 100 },
    anchors: [
      {
        id: "a1",
        stationPhysicalDistanceM: 0,
        mode: "elevation",
        valueM: 10,
        lineId: "OL-left",
      },
      {
        id: "a2",
        stationPhysicalDistanceM: 100,
        mode: "elevation",
        valueM: 20,
        lineId: "OL-right",
      },
    ],
    ...overrides,
  } as HaunchDefinitionDraft;
}

describe("validateHaunchDefinitions fail-closed", () => {
  it("rejects unknown alignmentId", () => {
    const diagnostics = validateHaunchDefinitions(
      [baseTwoPointDefinition({ alignmentId: "missing-alignment" })],
      buildContext(),
    );
    expect(
      diagnostics.some((entry) => entry.code === LINER_HAUNCH_DIAGNOSTIC_CODES.invalidReference),
    ).toBe(true);
  });

  it("rejects unknown line references", () => {
    const definition = baseTwoPointDefinition();
    if (definition.family === "two_point" && definition.variant === "two_support_points") {
      definition.anchors[0] = { ...definition.anchors[0], lineId: "missing-line" };
    }
    const diagnostics = validateHaunchDefinitions([definition], buildContext());
    expect(
      diagnostics.some((entry) => entry.code === LINER_HAUNCH_DIAGNOSTIC_CODES.invalidReference),
    ).toBe(true);
  });

  it("rejects unsupported plane variant two_points_normal_gradient", () => {
    const diagnostics = validateHaunchDefinitions(
      [
        {
          id: "haunch-14",
          alignmentId: "alignment-1",
          family: "plane",
          variant: "two_points_normal_gradient",
          stationRange: { fromM: 0, toM: 100 },
          anchors: [
            {
              id: "a1",
              stationPhysicalDistanceM: 0,
              mode: "elevation",
              valueM: 10,
              lineId: "OL-left",
            },
            {
              id: "a2",
              stationPhysicalDistanceM: 100,
              mode: "elevation",
              valueM: 20,
              lineId: "OL-right",
            },
          ],
          normalGradient: 0.01,
        },
      ],
      buildContext(),
    );
    expect(
      diagnostics.some((entry) => entry.code === LINER_HAUNCH_DIAGNOSTIC_CODES.unsupportedType),
    ).toBe(true);
  });

  it("rejects legacy jipType 12 with liner height required", () => {
    const diagnostics = validateHaunchDefinitions(
      [baseTwoPointDefinition({ jipType: 12 })],
      buildContext(),
    );
    expect(
      diagnostics.some((entry) => entry.code === LINER_HAUNCH_DIAGNOSTIC_CODES.linerHeightRequired),
    ).toBe(true);
  });

  it("rejects invalid station range bounds", () => {
    const diagnostics = validateHaunchDefinitions(
      [baseTwoPointDefinition({ stationRange: { fromM: 100, toM: 0 } })],
      buildContext(),
    );
    expect(
      diagnostics.some((entry) => entry.code === LINER_HAUNCH_DIAGNOSTIC_CODES.rangeInvalid),
    ).toBe(true);
  });

  it("rejects non-finite longitudinal gradient", () => {
    const diagnostics = validateHaunchDefinitions(
      [
        {
          id: "haunch-gradient",
          alignmentId: "alignment-1",
          family: "two_point",
          variant: "one_point_longitudinal_gradient",
          stationRange: { fromM: 0, toM: 100 },
          anchor: {
            id: "a1",
            stationPhysicalDistanceM: 0,
            mode: "elevation",
            valueM: 10,
          },
          longitudinalGradient: Number.NaN,
        },
      ],
      buildContext(),
    );
    expect(
      diagnostics.some(
        (entry) => entry.code === LINER_HAUNCH_DIAGNOSTIC_CODES.definitionSchemaInvalid,
      ),
    ).toBe(true);
  });
});
