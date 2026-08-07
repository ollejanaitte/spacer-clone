import { describe, expect, it } from "vitest";
import { writeFileSync, mkdirSync } from "fs";
import { join } from "path";
import {
  buildCoverageMatrixCsv,
  buildDiscrepancyLedgerCsv,
  buildP02ComparisonReport,
  buildP02ReportCsv,
  runAllP02Comparisons,
} from "../reporting";

const OUT = "/tmp/opencode/r1p02";

describe("R1-P02-04 consolidated comparison reporting", () => {
  const results = runAllP02Comparisons();
  const report = buildP02ComparisonReport();

  it("runs all 28 P02 reference rows", () => {
    expect(results.length).toBe(28);
    expect(report.summary.total).toBe(28);
  });

  it("input parity: 22 PASS, not comparable: 6, no derived", () => {
    expect(report.summary.input_parity_total).toBe(22);
    expect(report.summary.input_parity_pass).toBe(22);
    expect(report.summary.derived_total).toBe(0);
    expect(report.summary.derived_pass).toBe(0);
    expect(report.summary.derived_fail).toBe(0);
    expect(report.summary.not_comparable).toBe(6);
  });

  it("produces report csv with header + 28 rows", () => {
    const csv = buildP02ReportCsv();
    expect(csv.trim().split("\n")).toHaveLength(29);
  });

  it("discrepancy ledger contains only non-PASS rows", () => {
    const ledger = buildDiscrepancyLedgerCsv(results);
    const lines = ledger.trim().split("\n");
    expect(lines.length).toBe(1 + 6); // header + 6 NOT_COMPARABLE
    for (let i = 1; i < lines.length; i += 1) {
      expect(lines[i]).toContain("NOT_COMPARABLE");
    }
  });

  it("coverage matrix covers every reference", () => {
    const coverage = buildCoverageMatrixCsv(results);
    expect(coverage.trim().split("\n")).toHaveLength(1 + 28);
  });

  it("writes report artifacts for review", () => {
    mkdirSync(OUT, { recursive: true });
    writeFileSync(join(OUT, "comparison-report.csv"), buildP02ReportCsv());
    writeFileSync(join(OUT, "discrepancy-ledger.csv"), buildDiscrepancyLedgerCsv(results));
    writeFileSync(join(OUT, "coverage-matrix.csv"), buildCoverageMatrixCsv(results));
    writeFileSync(
      join(OUT, "comparison-report.json"),
      JSON.stringify(report, null, 2),
    );
    expect(true).toBe(true);
  });
});
