import { describe, expect, it } from "vitest";
import { buildMountainDraft } from "../mountain-viaduct-500/fixture";
import { resolveSupportMarkers } from "../mountain-viaduct-500/markers";
import { terrainElevation } from "../mountain-viaduct-500/terrain";

describe("mountain support markers", () => {
  it("resolves 9 markers (2 abutments + 7 piers)", () => {
    const draft = buildMountainDraft();
    const { markers } = resolveSupportMarkers(draft);
    expect(markers).toHaveLength(9);
    expect(markers.filter((m) => m.kind === "abutment")).toHaveLength(2);
    expect(markers.filter((m) => m.kind === "pier")).toHaveLength(7);
  });

  it("markers at correct stations", () => {
    const draft = buildMountainDraft();
    const { markers } = resolveSupportMarkers(draft);
    const a1 = markers.find((m) => m.id === "A1");
    const a2 = markers.find((m) => m.id === "A2");
    expect(a1?.station).toBe(50);
    expect(a2?.station).toBe(450);
    const p1 = markers.find((m) => m.id === "P1");
    const p7 = markers.find((m) => m.id === "P7");
    expect(p1?.station).toBe(100);
    expect(p7?.station).toBe(400);
  });

  it("markers have finite XYZ and direction", () => {
    const draft = buildMountainDraft();
    const { markers } = resolveSupportMarkers(draft);
    for (const marker of markers) {
      expect(Number.isFinite(marker.x)).toBe(true);
      expect(Number.isFinite(marker.y)).toBe(true);
      expect(Number.isFinite(marker.z)).toBe(true);
      expect(Number.isFinite(marker.direction.x)).toBe(true);
      expect(Number.isFinite(marker.direction.y)).toBe(true);
    }
  });

  it("resolves 8 span polylines", () => {
    const draft = buildMountainDraft();
    const { spans } = resolveSupportMarkers(draft);
    expect(spans).toHaveLength(8);
  });

  it("deep valley makes P4 the tallest pier and abutments low (pier height distribution)", () => {
    const draft = buildMountainDraft();
    const { markers } = resolveSupportMarkers(draft);
    const pierHeight = (id: string): number => {
      const marker = markers.find((m) => m.id === id);
      const ground = terrainElevation(marker!.station, 0);
      return marker!.z - ground;
    };
    // all supports stand above terrain (positive height)
    for (const marker of markers) {
      expect(pierHeight(marker.id)).toBeGreaterThan(0);
    }
    // P4 is the tallest; abutments and end piers are low
    const p4 = pierHeight("P4");
    const p1 = pierHeight("P1");
    const p7 = pierHeight("P7");
    const a1 = pierHeight("A1");
    const a2 = pierHeight("A2");
    expect(p4).toBeGreaterThan(p1 + 10);
    expect(p4).toBeGreaterThan(p7 + 10);
    expect(p4).toBeGreaterThan(a1 + 10);
    expect(p4).toBeGreaterThan(a2 + 10);
  });
});
