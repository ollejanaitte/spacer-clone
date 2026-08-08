import { describe, expect, it } from "vitest";
import {
  buildMountainDraft,
  buildMountainViaduct500Fixture,
} from "../mountain-viaduct-500/fixture";
import {
  MOUNTAIN_CAMERA_PRESETS,
} from "../mountain-viaduct-500/fixture";
import { mountainViaduct500Fixture } from "../mountain-viaduct-500/loader";
import { totalAlignmentLength } from "../../core/geometry/horizontal";

describe("mountain sample fixture assembly", () => {
  it("builds a full editable draft", () => {
    const draft = buildMountainDraft();
    expect(draft.alignment.elements.length).toBeGreaterThan(0);
    expect(draft.verticalAlignment?.elements.length).toBeGreaterThan(0);
    expect(draft.crossSlopeIntervals?.length).toBeGreaterThan(0);
    expect(draft.crossSections?.length).toBeGreaterThan(0);
    expect(draft.piers?.length).toBe(9);
    expect(draft.spans?.length).toBe(8);
  });

  it("route length is 500m", () => {
    const draft = buildMountainDraft();
    expect(totalAlignmentLength(draft.alignment)).toBeCloseTo(500, 3);
  });

  it("fixture carries expected metrics", () => {
    const fixture = buildMountainViaduct500Fixture();
    expect(fixture.expected.totalRouteLengthM).toBe(500);
    expect(fixture.expected.bridgeLengthM).toBe(400);
    expect(fixture.expected.spanCount).toBe(8);
    expect(fixture.expected.pierCount).toBe(7);
    expect(fixture.expected.abutmentCount).toBe(2);
  });

  it("fixture has camera presets and terrain settings", () => {
    const fixture = buildMountainViaduct500Fixture();
    expect(fixture.cameraPresets.length).toBeGreaterThanOrEqual(3);
    expect(fixture.terrain.role).toBe("DISPLAY_LAYER");
    expect(MOUNTAIN_CAMERA_PRESETS[0].id).toBe("overview");
  });

  it("loader returns the same fixture", () => {
    const fixture = mountainViaduct500Fixture();
    expect(fixture.metadata.sampleId).toBe("mountain-viaduct-500");
    expect(fixture.metadata.disclaimer).toContain("SHOWCASE / DEMO");
  });

  it("all input fields are populated (horizontal R/A/L, vertical, bridge)", () => {
    const draft = buildMountainDraft();
    const arcElements = draft.alignment.elements.filter((e) => e.type === "arc");
    const clothoidElements = draft.alignment.elements.filter((e) => e.type === "clothoid");
    expect(arcElements.length).toBeGreaterThanOrEqual(2);
    expect(clothoidElements.length).toBeGreaterThanOrEqual(4);
    for (const arc of arcElements) {
      if (arc.type === "arc") expect(arc.radius).toBeGreaterThan(0);
    }
    const pierIds = draft.piers?.map((p) => p.id);
    expect(pierIds).toEqual(["A1", "P1", "P2", "P3", "P4", "P5", "P6", "P7", "A2"]);
  });
});
