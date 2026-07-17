import { describe, expect, it } from "vitest";
import {
  buildLdistReportSection,
  buildLdistResultsCsv,
  LDIST_RESULTS_CSV_COLUMNS,
} from "./ldistReportExport";
import { LDIST_ALGORITHM_VERSION } from "../core/ldist/types";
import { createLdistDiagnostic, LINER_LDIST_DIAGNOSTIC_CODES } from "../core/ldist/diagnostics";

const sampleRow = {
  jobId: "ldist-job-1",
  stationPhysicalDistance: 0,
  displayedStation: 0,
  fromLineId: "OL-left",
  toLineId: "OL-right",
  distanceM: 10,
  sourceRevision: "abc",
  algorithmVersion: LDIST_ALGORITHM_VERSION,
  signConvention: "mode_a_unsigned",
};

describe("ldistReportExport", () => {
  it("builds CSV with expected column keys and row count", () => {
    const csv = buildLdistResultsCsv([sampleRow], []);
    const lines = csv.split("\n");
    expect(lines[0]).toBe(LDIST_RESULTS_CSV_COLUMNS.join(","));
    expect(lines).toHaveLength(2);
    expect(lines[1]).toContain("ldist-job-1");
    expect(lines[1]).toContain("10");
  });

  it("returns report section with ldistResults key", () => {
    const section = buildLdistReportSection([sampleRow], []);
    expect(section?.key).toBe("ldistResults");
    expect(section?.rows).toHaveLength(1);
  });

  it("blocks export when error-level LDIST diagnostics are present", () => {
    const diagnostics = [
      createLdistDiagnostic("error", LINER_LDIST_DIAGNOSTIC_CODES.pairsEmpty, { entityId: "job-1" }),
    ];
    expect(buildLdistResultsCsv([sampleRow], diagnostics)).toBe("");
    expect(buildLdistReportSection([sampleRow], diagnostics)).toBeNull();
  });
});
