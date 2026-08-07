import { describe, expect, it } from "vitest";
import { runProfileCrossfallHeightComparison } from "../adapters/profile-crossfall-height";
import { buildComparisonSummary } from "../report";
import { ALIGNMENT_PROFILE_ROWS } from "../../reference-data/dataset-alignment-profile";

describe("R1-P02-03 profile/crossfall/section-height external comparison", () => {
  const results = runProfileCrossfallHeightComparison();
  const summary = buildComparisonSummary(results);

  it("produces a result for every vertical/crossfall/section-height reference row", () => {
    const target = ALIGNMENT_PROFILE_ROWS.filter(
      (r) =>
        r.category === "vertical_profile" ||
        r.category === "crossfall" ||
        r.category === "section_height",
    );
    expect(results.length).toBe(target.length);
    expect(target.length).toBe(14);
  });

  it("vertical crown heights and grades are INPUT_PARITY and PASS", () => {
    const vertical = results.filter((r) => r.category === "vertical_profile");
    expect(vertical.length).toBe(8);
    for (const r of vertical) {
      expect(r.comparison_kind).toBe("INPUT_PARITY");
      expect(r.status).toBe("PASS");
    }
  });

  it("crossfall rows are INPUT_PARITY and PASS", () => {
    const crossfall = results.filter((r) => r.category === "crossfall");
    expect(crossfall.length).toBe(3);
    for (const r of crossfall) {
      expect(r.comparison_kind).toBe("INPUT_PARITY");
      expect(r.status).toBe("PASS");
    }
  });

  it("section_height plan heights are NOT_COMPARABLE (chainage not reproducible)", () => {
    const section = results.filter((r) => r.category === "section_height");
    expect(section.length).toBe(3);
    expect(section.every((r) => r.status === "NOT_COMPARABLE")).toBe(true);
  });

  it("does not claim derived verification for input echoes", () => {
    const derived = results.filter((r) => r.comparison_kind === "DERIVED_OUTPUT");
    expect(derived.length).toBe(0);
  });

  it("summary separates input parity from not-comparable", () => {
    expect(summary.input_parity_total).toBe(11);
    expect(summary.input_parity_pass).toBe(11);
    expect(summary.not_comparable).toBe(3);
    expect(summary.total).toBe(14);
  });
});
