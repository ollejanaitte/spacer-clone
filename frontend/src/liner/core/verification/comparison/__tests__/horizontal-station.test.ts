import { describe, expect, it } from "vitest";
import { runHorizontalStationComparison } from "../adapters/horizontal-station";
import { buildComparisonReport, buildComparisonSummary } from "../report";
import { ALIGNMENT_PROFILE_ROWS } from "../../reference-data/dataset-alignment-profile";

describe("R1-P02-02 horizontal/station external comparison", () => {
  const results = runHorizontalStationComparison();
  const summary = buildComparisonSummary(results);
  const report = buildComparisonReport(results, "2026-08-07");

  it("produces a result for every horizontal_alignment + station reference row", () => {
    const target = ALIGNMENT_PROFILE_ROWS.filter(
      (r) => r.category === "horizontal_alignment" || r.category === "station",
    );
    expect(results.length).toBe(target.length);
    expect(target.length).toBe(14);
  });

  it("horizontal element length/radius/parameter rows are INPUT_PARITY and PASS", () => {
    const horizontal = results.filter((r) => r.category === "horizontal_alignment");
    expect(horizontal.length).toBe(10);
    const parity = horizontal.filter((r) => r.comparison_kind === "INPUT_PARITY");
    expect(parity.length).toBe(10);
    for (const r of parity) {
      expect(r.status).toBe("PASS");
      expect(r.message).toBe("value within tolerance");
    }
  });

  it("station rows are INPUT_PARITY (origin) or NOT_COMPARABLE (chainage)", () => {
    const station = results.filter((r) => r.category === "station");
    expect(station.length).toBe(4);
    const origin = station.find((r) => r.reference_id === "REF-station-001");
    expect(origin?.comparison_kind).toBe("INPUT_PARITY");
    expect(origin?.status).toBe("PASS");
    const notComparable = station.filter((r) => r.status === "NOT_COMPARABLE");
    expect(notComparable.length).toBe(3);
  });

  it("does not claim derived numeric verification for input echoes", () => {
    const derived = results.filter((r) => r.comparison_kind === "DERIVED_OUTPUT");
    expect(derived.length).toBe(0);
  });

  it("summary separates input parity from derived", () => {
    expect(summary.input_parity_total).toBe(11);
    expect(summary.input_parity_pass).toBe(11);
    expect(summary.derived_total).toBe(0);
    expect(summary.not_comparable).toBe(3);
    expect(summary.total).toBe(14);
  });

  it("report is valid and CSV-able", () => {
    expect(report.summary.total).toBe(14);
    expect(report.results.length).toBe(14);
  });
});
