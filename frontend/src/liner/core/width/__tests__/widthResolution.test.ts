import { describe, expect, it } from "vitest";
import type { CrossSectionTemplateDraft } from "../../../schema/types";
import {
  applyWidthExtentsToOffsetLines,
  deriveTemplateLaneExtents,
  resolveStationOffsetLines,
  resolveWidthAtDistance,
  validateWidthChangePoints,
} from "../widthResolution";

function buildTemplate(offsets: Array<{ offset: number; role?: "lane" | "edge" }>): CrossSectionTemplateDraft {
  return {
    id: "CS-test",
    name: "Test",
    offsetLines: offsets.map((entry, index) => ({
      id: `OL-${index}`,
      offset: entry.offset,
      elevation: 0,
      role: entry.role,
    })),
  };
}

describe("width resolution", () => {
  it("derives lane half-widths from template lane offsets", () => {
    const template = buildTemplate([
      { offset: -4, role: "lane" },
      { offset: 0, role: "lane" },
      { offset: 6, role: "lane" },
    ]);

    expect(deriveTemplateLaneExtents(template)).toEqual({
      leftHalfWidth: 4,
      rightHalfWidth: 6,
      source: "template",
    });
  });

  it("uses the latest width change point at or before the station", () => {
    const template = buildTemplate([
      { offset: -3, role: "lane" },
      { offset: 3, role: "lane" },
    ]);
    const widthChangePoints = [
      {
        id: "WP-0",
        physicalDistance: 0,
        leftOffset: 5,
        rightOffset: 5,
      },
      {
        id: "WP-20",
        physicalDistance: 20,
        leftOffset: 7,
        rightOffset: 8,
      },
    ];

    expect(resolveWidthAtDistance(template, widthChangePoints, 10)).toEqual({
      leftHalfWidth: 5,
      rightHalfWidth: 5,
      source: "width_change_point",
      widthChangePointId: "WP-0",
    });
    expect(resolveWidthAtDistance(template, widthChangePoints, 25)).toEqual({
      leftHalfWidth: 7,
      rightHalfWidth: 8,
      source: "width_change_point",
      widthChangePointId: "WP-20",
    });
  });

  it("scales offset lines to resolved width extents", () => {
    const template = buildTemplate([
      { offset: -2, role: "lane" },
      { offset: 0, role: "lane" },
      { offset: 4, role: "lane" },
    ]);
    const resolved = resolveStationOffsetLines(
      template,
      [
        {
          id: "WP-1",
          physicalDistance: 0,
          leftOffset: 4,
          rightOffset: 8,
        },
      ],
      0,
    );

    expect(resolved.map((line) => line.offset)).toEqual([-4, 0, 8]);
  });

  it("flags overlap, out-of-range, and invalid offsets as errors", () => {
    const issues = validateWidthChangePoints(
      [
        {
          id: "WP-1",
          physicalDistance: 0,
          leftOffset: 5,
          rightOffset: 5,
        },
        {
          id: "WP-2",
          physicalDistance: 0,
          leftOffset: 6,
          rightOffset: 6,
        },
        {
          id: "WP-3",
          physicalDistance: 120,
          leftOffset: 4,
          rightOffset: 4,
        },
        {
          id: "WP-4",
          physicalDistance: 10,
          leftOffset: -1,
          rightOffset: 4,
        },
      ],
      100,
    );

    expect(issues.some((issue) => issue.code === "LINER_WIDTH_CHANGE_POINT_OVERLAP")).toBe(true);
    expect(issues.some((issue) => issue.code === "LINER_WIDTH_CHANGE_POINT_OUT_OF_RANGE")).toBe(true);
    expect(issues.some((issue) => issue.code === "LINER_WIDTH_CHANGE_POINT_INVALID")).toBe(true);
  });

  it("keeps template offsets when no width change point applies", () => {
    const template = buildTemplate([
      { offset: -3, role: "lane" },
      { offset: 3, role: "lane" },
    ]);
    const resolved = applyWidthExtentsToOffsetLines(
      template,
      deriveTemplateLaneExtents(template),
    );

    expect(resolved.map((line) => line.offset)).toEqual([-3, 3]);
  });
});
