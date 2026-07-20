import { describe, expect, it } from "vitest";
import {
  buildHosoReportSection,
  buildHosoResultsCsv,
  HOSO_RESULTS_CSV_COLUMNS,
} from "./hosoReportExport";
import { HOSO_ALGORITHM_VERSION } from "../core/hoso/types";
import {
  createHosoDiagnostic,
  LINER_HOSO_DIAGNOSTIC_CODES,
} from "../core/hoso/diagnostics";

const sampleRow = {
  definitionId: "hoso-def-1",
  type: "longitudinal" as const,
  stationPhysicalDistance: 50,
  displayedStation: 50,
  offsetM: 0,
  pavementThicknessM: 0.25,
  pavementElevationM: 0.25,
  lineId: "OL-girder",
  sourceRevision: "abc",
  algorithmVersion: HOSO_ALGORITHM_VERSION,
};

describe("hosoReportExport", () => {
  it("builds CSV with expected column keys and row count", () => {
    const csv = buildHosoResultsCsv([sampleRow], []);
    const lines = csv.split("\n");
    expect(lines[0]).toBe(HOSO_RESULTS_CSV_COLUMNS.join(","));
    expect(lines).toHaveLength(2);
    expect(lines[1]).toContain("hoso-def-1");
    expect(lines[1]).toContain("0.25");
  });

  it("returns report section with hosoResults key", () => {
    const section = buildHosoReportSection([sampleRow], []);
    expect(section?.key).toBe("hosoResults");
    expect(section?.rows).toHaveLength(1);
  });

  it("blocks export when error-level HOSO diagnostics are present", () => {
    const diagnostics = [
      createHosoDiagnostic("error", LINER_HOSO_DIAGNOSTIC_CODES.unsupportedType, {
        entityId: "hoso-def-1",
      }),
    ];
    expect(buildHosoResultsCsv([sampleRow], diagnostics)).toBe("");
    expect(buildHosoReportSection([sampleRow], diagnostics)).toBeNull();
  });
});
