// @vitest-environment jsdom
// Phase C1 (M2-09A) フォームパッチ → Support モデル変換テスト
import { describe, it, expect } from "vitest";
import { applyFormPatchToSupport } from "../planning/formToSupport";
import { supportToForm } from "../planning/formModel";
import type { Support } from "../model";

function pier(): Support {
  return {
    supportId: "P1",
    supportType: "pier",
    skewRad: 0,
    placement: { source: "liner", alignmentId: "aln", station: 30, offset: 0 },
    bearingSeats: [],
    pier: {
      id: "P1",
      formType: "single_column_rect",
      column: { id: "P1-COLUMN", width: 1.2, depth: 1.6, height: 7 },
      cap: { id: "P1-CAP", width: 1.6, depth: 8, height: 1.2, overhangL: 0.5, overhangR: 0.5 },
      footing: { id: "P1-FOOTING", length: 6, width: 8, thickness: 1.8, topElevation: 0 },
    },
  };
}

describe("applyFormPatchToSupport", () => {
  it("keeps model stable when patch is empty", () => {
    const s = pier();
    expect(applyFormPatchToSupport(s, {})).toEqual(s);
  });

  it("applies placement station/offset/skew/z patches", () => {
    const s = pier();
    const next = applyFormPatchToSupport(s, {
      placement: { alignmentId: "aln", station: 45, offset: 2.5, skewDeg: 10, z: 3 },
    });
    expect(next.placement.station).toBe(45);
    expect(next.placement.offset).toBe(2.5);
    expect(next.skewRad).toBeCloseTo((10 * Math.PI) / 180, 6);
    expect(next.zOverride).toBe(3);
  });

  it("applies column dimension patches", () => {
    const s = pier();
    const next = applyFormPatchToSupport(s, {
      pier: {
        formType: "single_column_rect",
        column: { width: 1.8, depth: 1.6, height: 9, transverseOffset: null },
        cap: { width: 1.6, depth: 8, height: 1.2, overhangL: 0.5, overhangR: 0.5 },
        columns: [
          { width: 0, depth: 0, height: 0, transverseOffset: null },
          { width: 0, depth: 0, height: 0, transverseOffset: null },
        ],
        beam: { width: 0, depth: 0, height: 0 },
      },
    });
    expect(next.pier?.column?.width).toBe(1.8);
    expect(next.pier?.column?.height).toBe(9);
  });

  it("applies footing and pile-group patches", () => {
    const s = pier();
    const next = applyFormPatchToSupport(s, {
      foundation: {
        footing: { length: 8, width: 9, thickness: 2.0, topElevation: 0 },
        pile: { pileType: "bored_pile", diameter: 1.2, length: 18, pileCount: 6 },
        isSpread: false,
      },
    });
    expect(next.pier?.footing.length).toBe(8);
    expect(next.pier?.pileGroup?.diameter).toBe(1.2);
    expect(next.pier?.pileGroup?.pileCount).toBe(6);
  });

  it("clears pileGroup when switching to spread foundation", () => {
    const s = pier();
    const withPiles = applyFormPatchToSupport(s, {
      foundation: {
        footing: { length: 6, width: 8, thickness: 1.8, topElevation: 0 },
        pile: { pileType: "bored_pile", diameter: 1.2, length: 18, pileCount: 6 },
        isSpread: false,
      },
    });
    expect(withPiles.pier?.pileGroup).not.toBeNull();
    const spread = applyFormPatchToSupport(withPiles, {
      foundation: {
        footing: { length: 6, width: 8, thickness: 1.8, topElevation: 0 },
        pile: { pileType: "bored_pile", diameter: 1.2, length: 18, pileCount: 6 },
        isSpread: true,
      },
    });
    expect(spread.pier?.pileGroup).toBeNull();
  });

  it("round-trips via supportToForm for stable fields", () => {
    const s = pier();
    const form = supportToForm(s);
    const next = applyFormPatchToSupport(s, {
      supportId: form.supportId,
      supportType: form.supportType,
      placement: form.placement,
      pier: form.pier,
      abutment: form.abutment,
      foundation: form.foundation,
    });
    expect(next.supportId).toBe(s.supportId);
    expect(next.placement.station).toBe(s.placement.station);
    expect(next.pier?.column?.width).toBe(s.pier?.column?.width);
    expect(next.pier?.footing.length).toBe(s.pier?.footing.length);
  });
});
