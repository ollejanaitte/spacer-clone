import { describe, expect, it } from "vitest";
import { buildMountainDraft } from "../mountain-viaduct-500/fixture";
import { buildUnified3DScene } from "../mountain-viaduct-500/scene";
import { resolveSupportMarkers } from "../mountain-viaduct-500/markers";
import { terrainPositionsToThree } from "../mountain-viaduct-500/threeCoords";
import { terrainElevation } from "../mountain-viaduct-500/terrain";

describe("terrain fix: coordinate consistency", () => {
  it("terrain three positions match substructure three positions (P4)", () => {
    const draft = buildMountainDraft();
    const { markers } = resolveSupportMarkers(draft);
    const p4 = markers.find((m) => m.id === "P4")!;
    // substructure uses [x, z, -y]
    const subThree = [p4.x, p4.z, -p4.y];
    // terrain at nearest vertex: positions are (x, height, y) -> three (x, height, -y)
    const raw = buildUnified3DScene(draft).terrain.positions;
    const three = terrainPositionsToThree(raw);
    let best: number[] | null = null;
    let bestD = Infinity;
    for (let i = 0; i < three.length; i += 3) {
      const tx = three[i], tz = three[i + 2];
      const d = Math.hypot(tx - p4.x, tz - (-p4.y));
      if (d < bestD) { bestD = d; best = [tx, three[i + 1], tz]; }
    }
    expect(best).not.toBeNull();
    // terrain height at P4 is below the bridge deck (pier height > 0)
    expect((best as number[])[1]).toBeLessThan(subThree[1] - 10);
  });

  it("terrain bounds are not astronomically large (fit camera)", () => {
    const scene = buildUnified3DScene(buildMountainDraft());
    const { minX, maxX, minY, maxY, minZ, maxZ } = scene.bounds;
    // route is 500m; terrain X span should be ~500, not 5000+
    expect(maxX - minX).toBeLessThan(1500);
    expect(maxY - minY).toBeLessThan(1500);
    expect(maxZ - minZ).toBeLessThan(150);
  });

  it("deep valley floor is clearly below the bridge deck", () => {
    const draft = buildMountainDraft();
    const { markers } = resolveSupportMarkers(draft);
    const p4 = markers.find((m) => m.id === "P4")!;
    const ground = terrainElevation(p4.x, p4.y);
    expect(p4.z - ground).toBeGreaterThan(15); // tall pier at the valley
  });
});
