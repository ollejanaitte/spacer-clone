import { describe, expect, it } from "vitest";
import { createReferenceMountain } from "../../terrain/referenceMountain";
import { createDefaultLinerDraft } from "../../../../liner/adapters/linerUiAdapter";
import { evaluateAlignmentAtDistance } from "../../../../liner/core/geometry/horizontal";
import { elevationAt } from "../../../../liner/core/elevationAt";
import type { VerticalElementDraft } from "../../../../liner/schema/types";
import { roadCameraForDraft } from "../road3dCamera";

describe("roadCameraForDraft (Phase 7.4)", () => {
  it("targets the midpoint of the active road's own XY bounds", () => {
    const ref = createReferenceMountain();
    const draft = {
      ...createDefaultLinerDraft(),
      alignment: ref.roadHorizontal,
      verticalAlignment: {
        id: "V-MTN",
        elements: ref.roadVertical as unknown as VerticalElementDraft[],
      },
    };
    const total = ref.roadHorizontal.elements.reduce((s, e) => s + e.length, 0);
    const xs: number[] = [];
    const ys: number[] = [];
    for (let d = 0; d <= total; d += 5) {
      const ev = evaluateAlignmentAtDistance(ref.roadHorizontal, d);
      xs.push(ev.point.x);
      ys.push(ev.point.y);
    }
    const cx = (Math.min(...xs) + Math.max(...xs)) / 2;
    const cy = (Math.min(...ys) + Math.max(...ys)) / 2;

    const camera = roadCameraForDraft(draft);
    expect(camera.target.x).toBeCloseTo(cx, 0);
    // three.z = -domain.y
    expect(camera.target.z).toBeCloseTo(-cy, 0);
    // overhead camera: height above target, offset in z to keep depth
    expect(camera.position.y).toBeGreaterThan(camera.target.y);
    expect(camera.position.z).not.toBe(camera.target.z);
  });

  it("returns a finite default for an empty alignment", () => {
    const draft = createDefaultLinerDraft();
    draft.alignment.elements = [];
    const camera = roadCameraForDraft(draft);
    expect(Number.isFinite(camera.position.x)).toBe(true);
    expect(Number.isFinite(camera.target.z)).toBe(true);
  });
});
