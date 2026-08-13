import { describe, expect, it } from "vitest";
import { createReferenceMountain } from "../../terrain/referenceMountain";
import { createDefaultLinerDraft } from "../../../../liner/adapters/linerUiAdapter";
import { buildRoadCimSurface } from "../roadCimSurface";
import { createMountainRoadSample } from "../../road/referenceSamples";
import { verticalElementsToDraft } from "../../road/verticalDraftBridge";
import type { CrossSlopeIntervalDraft } from "../../../../liner/schema/types";

describe("buildRoadCimSurface (Phase 8-02 WP-C)", () => {
  it("builds a surface with left/center/right ribbon from the reference mountain road", () => {
    const ref = createReferenceMountain();
    const draft = createDefaultLinerDraft();
    draft.alignment = ref.roadHorizontal;
    draft.verticalAlignment = {
      id: ref.roadHorizontal.id,
      elements: verticalElementsToDraft(ref.roadVertical),
    };
    draft.crossSections = [ref.roadCrossSection];
    const surface = buildRoadCimSurface(draft, { sampleInterval: 10 });
    expect(surface.vertices.length).toBeGreaterThan(0);
    expect(surface.stationCount).toBeGreaterThan(2);
    // 3 columns per station
    expect(surface.vertices.length).toBe(surface.stationCount * 3);
    // triangles = 2 quads per station pair -> 4 tris
    expect(surface.triangles.length).toBe((surface.stationCount - 1) * 4);
    // width reflects left+right offsets (4.5 + 4.5)
    expect(surface.width).toBeCloseTo(9, 0);
  });

  it("reflects width widening from widthChangePoints", () => {
    const sample = createMountainRoadSample();
    const draft = createDefaultLinerDraft();
    draft.alignment = sample.horizontal;
    draft.verticalAlignment = {
      id: sample.horizontal.id,
      elements: verticalElementsToDraft(sample.vertical),
    };
    draft.crossSections = [...sample.crossSections];
    draft.widthChangePoints = [...sample.widthChangePoints];
    draft.crossSlopeIntervals = [...sample.crossSlopeIntervals] as CrossSlopeIntervalDraft[];
    const surface = buildRoadCimSurface(draft, { sampleInterval: 5 });
    expect(surface.vertices.length).toBeGreaterThan(0);
    expect(surface.width).toBeGreaterThan(0);
  });

  it("returns empty for an invalid draft", () => {
    const draft = createDefaultLinerDraft();
    draft.alignment.elements = [];
    const surface = buildRoadCimSurface(draft);
    expect(surface.vertices.length).toBe(0);
    expect(surface.stationCount).toBe(0);
  });
});
