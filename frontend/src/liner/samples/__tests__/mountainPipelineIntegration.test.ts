import { describe, expect, it } from "vitest";
import { buildMountainViaduct500Fixture } from "../mountain-viaduct-500/fixture";
import { loadMountainSample } from "../mountain-viaduct-500/loader";
import { buildIntermediateResult } from "../../core/pipeline/pipeline";

describe("mountain sample -> existing pipeline integration", () => {
  it("sample draft flows through buildIntermediateResult without fatal issues", () => {
    const fixture = buildMountainViaduct500Fixture();
    const { draft } = loadMountainSample(fixture);

    const result = buildIntermediateResult(draft);
    // result.horizontal.totalLength should be ~500
    expect(result.horizontal.totalLength).toBeCloseTo(500, 1);
    // diagnostics: no discontinuities
    const discontinuity = result.diagnostics.filter(
      (d) =>
        d.code === "LINER_GEOM_POSITION_DISCONTINUITY" ||
        d.code === "LINER_GEOM_AZIMUTH_DISCONTINUITY",
    );
    expect(discontinuity).toEqual([]);
  });

  it("produces sampled horizontal points across the route", () => {
    const fixture = buildMountainViaduct500Fixture();
    const { draft } = loadMountainSample(fixture);
    const result = buildIntermediateResult(draft);
    expect(result.horizontal.sampledPoints.length).toBeGreaterThan(10);
  });

  it("generates station table", () => {
    const fixture = buildMountainViaduct500Fixture();
    const { draft } = loadMountainSample(fixture);
    const result = buildIntermediateResult(draft);
    expect(result.stations.entries.length).toBeGreaterThan(0);
  });

  it("can be re-evaluated after edit (R change) without failure", () => {
    const fixture = buildMountainViaduct500Fixture();
    const { draft } = loadMountainSample(fixture);
    const arc = draft.alignment.elements.find((e) => e.type === "arc");
    if (arc && arc.type === "arc") {
      arc.radius = 140;
    }
    const result = buildIntermediateResult(draft);
    expect(result.horizontal.totalLength).toBeCloseTo(500, 1);
  });
});
