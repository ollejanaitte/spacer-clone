import { describe, expect, it } from "vitest";
import {
  buildHaunchReportSection,
  buildHaunchResultsCsv,
  HAUNCH_RESULTS_CSV_COLUMNS,
} from "./haunchReportExport";
import { HAUNCH_ALGORITHM_VERSION } from "../core/haunch/types";
import {
  createHaunchDiagnostic,
  LINER_HAUNCH_DIAGNOSTIC_CODES,
} from "../core/haunch/diagnostics";

const sampleRow = {
  definitionId: "haunch-def-1",
  type: "two_point" as const,
  stationPhysicalDistance: 50,
  displayedStation: 50,
  haunchTopElevationM: 15,
  haunchThicknessM: 15,
  side: "left" as const,
  lineId: "OL-girder",
  sourceRevision: "abc",
  algorithmVersion: HAUNCH_ALGORITHM_VERSION,
};

describe("haunchReportExport", () => {
  it("builds CSV with expected column keys and row count", () => {
    const csv = buildHaunchResultsCsv([sampleRow], []);
    const lines = csv.split("\n");
    expect(lines[0]).toBe(HAUNCH_RESULTS_CSV_COLUMNS.join(","));
    expect(lines).toHaveLength(2);
    expect(lines[1]).toContain("haunch-def-1");
    expect(lines[1]).toContain("15");
  });

  it("returns report section with haunchResults key", () => {
    const section = buildHaunchReportSection([sampleRow], []);
    expect(section?.key).toBe("haunchResults");
    expect(section?.rows).toHaveLength(1);
  });

  it("blocks export when error-level HAUNCH diagnostics are present", () => {
    const diagnostics = [
      createHaunchDiagnostic("error", LINER_HAUNCH_DIAGNOSTIC_CODES.unsupportedType, {
        entityId: "haunch-def-1",
      }),
    ];
    expect(buildHaunchResultsCsv([sampleRow], diagnostics)).toBe("");
    expect(buildHaunchReportSection([sampleRow], diagnostics)).toBeNull();
  });
});
