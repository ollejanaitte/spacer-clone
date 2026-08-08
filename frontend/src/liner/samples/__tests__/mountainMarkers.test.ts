import { describe, expect, it } from "vitest";
import { buildMountainDraft } from "../mountain-viaduct-500/fixture";
import { resolveSupportMarkers } from "../mountain-viaduct-500/markers";

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
});
