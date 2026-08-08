import { describe, expect, it } from "vitest";
import { mountainViaduct500Fixture } from "../mountain-viaduct-500/loader";
import { loadMountainSample } from "../mountain-viaduct-500/loader";
import { totalAlignmentLength } from "../../core/geometry/horizontal";

describe("sample picker loading", () => {
  it("loads into a normal editable draft", () => {
    const fixture = mountainViaduct500Fixture();
    const { draft } = loadMountainSample(fixture);
    // editable: piers/spans arrays are copied (not shared references)
    expect(draft.piers).not.toBe(fixture.piers);
    expect(draft.spans).not.toBe(fixture.spans);
  });

  it("draft is fully populated (horizontal/vertical/crossfall/bridge)", () => {
    const fixture = mountainViaduct500Fixture();
    const { draft } = loadMountainSample(fixture);
    expect(totalAlignmentLength(draft.alignment)).toBeCloseTo(500, 3);
    expect(draft.verticalAlignment?.elements.length).toBeGreaterThan(0);
    expect(draft.crossSlopeIntervals?.length).toBeGreaterThan(0);
    expect(draft.crossSections?.length).toBeGreaterThan(0);
    expect(draft.piers?.length).toBe(9);
    expect(draft.spans?.length).toBe(8);
  });

  it("fixture metadata declares demo disclaimer", () => {
    const fixture = mountainViaduct500Fixture();
    expect(fixture.metadata.disclaimer).toContain("SHOWCASE / DEMO");
  });
});
