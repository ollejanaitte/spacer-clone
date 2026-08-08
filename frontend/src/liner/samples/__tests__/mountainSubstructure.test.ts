import { describe, expect, it } from "vitest";
import { buildMountainDraft } from "../mountain-viaduct-500/fixture";
import {
  buildSubstructure3d,
  buildSubstructureElement,
} from "../mountain-viaduct-500/substructure";
import { resolveSupportMarkers } from "../mountain-viaduct-500/markers";

describe("mountain substructure 3D", () => {
  it("builds 9 elements (2 abutments + 7 piers)", () => {
    const bundle = buildSubstructure3d(buildMountainDraft());
    expect(bundle.elements).toHaveLength(9);
    expect(bundle.elements.filter((e) => e.kind === "abutment")).toHaveLength(2);
    expect(bundle.elements.filter((e) => e.kind === "pier")).toHaveLength(7);
  });

  it("each element has positive pier height and box geometry", () => {
    const bundle = buildSubstructure3d(buildMountainDraft());
    for (const element of bundle.elements) {
      expect(element.pierHeight).toBeGreaterThan(0);
      expect(element.boxes.length).toBeGreaterThanOrEqual(3); // column + cap + support
      for (const box of element.boxes) {
        expect(box.sizeZ).toBeGreaterThan(0);
        expect(box.sizeX).toBeGreaterThan(0);
      }
    }
  });

  it("pier top connects near bridge underside (cap under deck)", () => {
    const bundle = buildSubstructure3d(buildMountainDraft());
    for (const element of bundle.elements) {
      const cap = element.boxes.find((b) => b.sizeZ < 2);
      expect(cap).toBeDefined();
      // cap center is just below the top Z
      expect(cap!.centerZ + cap!.sizeZ / 2).toBeLessThanOrEqual(element.topZ + 1e-6);
    }
  });

  it("pier bottom touches terrain (column base at ground)", () => {
    const bundle = buildSubstructure3d(buildMountainDraft());
    for (const element of bundle.elements) {
      const column = element.boxes[0];
      expect(column.centerZ - column.sizeZ / 2).toBeCloseTo(element.groundZ, 1);
    }
  });

  it("P4 is the tallest pier (deep valley)", () => {
    const bundle = buildSubstructure3d(buildMountainDraft());
    const heights = new Map(bundle.elements.map((e) => [e.id, e.pierHeight]));
    expect(heights.get("P4")).toBeGreaterThan(heights.get("A1")! + 10);
    expect(heights.get("P4")).toBeGreaterThan(heights.get("A2")! + 10);
    expect(heights.get("P4")).toBeGreaterThan(heights.get("P1")! + 10);
    expect(heights.get("P4")).toBeGreaterThan(heights.get("P7")! + 10);
  });

  it("element positions derive from markers (station-based)", () => {
    const draft = buildMountainDraft();
    const { markers } = resolveSupportMarkers(draft);
    const bundle = buildSubstructure3d(draft);
    for (let i = 0; i < markers.length; i += 1) {
      const element = bundle.elements[i];
      const marker = markers[i];
      expect(element.id).toBe(marker.id);
      expect(element.topZ).toBeCloseTo(marker.z, 6);
    }
  });

  it("single element builder works for a marker", () => {
    const draft = buildMountainDraft();
    const marker = resolveSupportMarkers(draft).markers.find((m) => m.id === "P4")!;
    const element = buildSubstructureElement(marker);
    expect(element.pierHeight).toBeGreaterThan(20);
    expect(element.boxes.length).toBeGreaterThanOrEqual(3);
  });
});
