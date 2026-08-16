import { describe, expect, it } from "vitest";
import {
  RB001_BRIDGE_CANDIDATE,
  buildRb001CrossSection,
  buildRb001HorizontalAlignment,
  buildRb001Vertical,
  buildReferenceBusiness001RoadSample,
  rb001AlignmentLength,
  REF_BUSINESS_001_ROAD_ID,
} from "../roadAlignment";
import { validateAlignment } from "../../../core/geometry/horizontal";
import { evaluateVerticalElement } from "../../../core/geometry/vertical";
import { evaluateAlignmentAtDistance } from "../../../core/geometry/horizontal";

describe("Reference Business 001 — road alignment sample (Gujo Hachiman)", () => {
  it("chained horizontal alignment is C0/C1 continuous (validateAlignment clean)", () => {
    const alignment = buildRb001HorizontalAlignment();
    const issues = validateAlignment(alignment);
    expect(issues).toEqual([]);
  });

  it("has the expected total length (2450 m)", () => {
    expect(rb001AlignmentLength()).toBeCloseTo(2450, 6);
  });

  it("starts at the Gujo Hachiman basin west side and stays inside terrain bounds", () => {
    const sample = buildReferenceBusiness001RoadSample();
    const start = sample.horizontal.elements[0];
    if (start.type !== "straight") throw new Error("first element must be straight");
    // EPSG:6674 terrain bounds: X 83,996-89,050 / Y -29,697 to -24,665
    expect(start.start.x).toBeGreaterThan(83996);
    expect(start.start.x).toBeLessThan(89050);
    expect(start.start.y).toBeGreaterThan(-29697);
    expect(start.start.y).toBeLessThan(-24665);
  });

  it("route crosses the Nagara river region (bridge candidate inside the alignment)", () => {
    const sample = buildReferenceBusiness001RoadSample();
    const total = rb001AlignmentLength();
    expect(RB001_BRIDGE_CANDIDATE.startStation).toBeGreaterThan(0);
    expect(RB001_BRIDGE_CANDIDATE.endStation).toBeLessThan(total);
    expect(RB001_BRIDGE_CANDIDATE.endStation).toBeGreaterThan(RB001_BRIDGE_CANDIDATE.startStation);

    // sample a point at the bridge candidate midpoint; it must be finite & inside bounds
    const mid = (RB001_BRIDGE_CANDIDATE.startStation + RB001_BRIDGE_CANDIDATE.endStation) / 2;
    const at = evaluateAlignmentAtDistance(sample.horizontal, mid);
    expect(at.point.x).toBeGreaterThan(83996);
    expect(at.point.x).toBeLessThan(89050);
    expect(at.point.y).toBeGreaterThan(-29697);
    expect(at.point.y).toBeLessThan(-24665);
  });

  it("vertical profile covers the full alignment length with consistent elevations", () => {
    const sample = buildReferenceBusiness001RoadSample();
    const total = rb001AlignmentLength();
    const vertical = buildRb001Vertical();
    const last = vertical[vertical.length - 1];
    const end = last.startPhysicalDistance + last.length;
    expect(end).toBeGreaterThanOrEqual(total - 1e-6);

    const atMid = evaluateVerticalElement(vertical[1], 1100);
    expect(atMid.elevation).toBeGreaterThan(280);
    expect(atMid.elevation).toBeLessThan(340);
  });

  it("cross-section is a 2-lane mountain road (9.0 m width)", () => {
    const cs = buildRb001CrossSection();
    const offsets = cs.offsetLines.map((o) => o.offset);
    expect(Math.max(...offsets)).toBeCloseTo(4.5, 6);
    expect(Math.min(...offsets)).toBeCloseTo(-4.5, 6);
  });

  it("assembled sample matches the RoadReferenceSample-compatible shape", () => {
    const sample = buildReferenceBusiness001RoadSample();
    expect(sample.id).toBe(REF_BUSINESS_001_ROAD_ID);
    expect(sample.horizontal.elements.length).toBe(5);
    expect(sample.vertical.length).toBe(3);
    expect(sample.crossSections.length).toBe(1);
    expect(sample.widthChangePoints.length).toBe(3);
    expect(sample.stationDefinition.originDisplayedStation).toBe(0);
  });
});