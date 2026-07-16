import { describe, expect, it } from "vitest";
import { createDefaultLinerDraft } from "../../adapters/linerUiAdapter";
import { buildPlanElevationRows } from "../PlanElevationTable";

describe("buildPlanElevationRows", () => {
  it("derives planned elevation per station from vertical alignment", () => {
    const draft = createDefaultLinerDraft();
    draft.alignment.elements = [
      {
        type: "straight",
        id: "L1",
        start: { x: 0, y: 0 },
        azimuth: 0,
        length: 100,
      },
    ];
    draft.stationDefinition = {
      originDisplayedStation: 0,
      interval: 50,
    };
    draft.verticalAlignment = {
      id: "VA-rows",
      elements: [
        {
          type: "grade",
          id: "VG-1",
          startStation: 0,
          endStation: 100,
          startElevation: 10,
          grade: 0.02,
          length: 100,
        },
      ],
    };

    const rows = buildPlanElevationRows(draft);
    expect(rows.length).toBeGreaterThan(0);

    const startRow = rows.find((row) => row.physicalDistance === 0);
    const midRow = rows.find((row) => row.physicalDistance === 50);
    const endRow = rows.find((row) => row.physicalDistance === 100);

    expect(startRow?.plannedElevation).toBeCloseTo(10, 6);
    expect(midRow?.plannedElevation).toBeCloseTo(11, 6);
    expect(endRow?.plannedElevation).toBeCloseTo(12, 6);
    expect(startRow?.gradePercent).toBeCloseTo(2, 3);
  });

  it("marks stations outside vertical coverage as unavailable", () => {
    const draft = createDefaultLinerDraft();
    draft.alignment.elements = [
      {
        type: "straight",
        id: "L1",
        start: { x: 0, y: 0 },
        azimuth: 0,
        length: 100,
      },
    ];
    draft.stationDefinition = {
      originDisplayedStation: 0,
      interval: 50,
    };
    draft.verticalAlignment = {
      id: "VA-short",
      elements: [
        {
          type: "grade",
          id: "VG-short",
          startStation: 0,
          endStation: 80,
          startElevation: 0,
          grade: 0,
          length: 80,
        },
      ],
    };

    const endRow = buildPlanElevationRows(draft).find((row) => row.physicalDistance === 100);
    expect(endRow?.plannedElevation).toBeNull();
  });
});
