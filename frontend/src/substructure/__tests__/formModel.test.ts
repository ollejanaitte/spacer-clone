// Phase C1 (M2-03) formModel 純粋ロジックテスト
import { describe, it, expect } from "vitest";
import { supportToForm, validateForm } from "../planning/formModel";
import { degToRad, radToDeg } from "../planning/forms/PlacementFields";
import type { Support } from "../model";

function pierSupport(overrides: Partial<Support> = {}): Support {
  return {
    supportId: "P1",
    supportType: "pier",
    skewRad: 0.1,
    placement: { source: "liner", alignmentId: "aln-001", station: 50, offset: 2 },
    bearingSeats: [],
    pier: {
      id: "P1",
      formType: "single_column_rect",
      column: { id: "C", width: 1.2, depth: 1.6, height: 7 },
      cap: { id: "CAP", width: 1.6, depth: 8, height: 1.2, overhangL: 0.5, overhangR: 0.5 },
      footing: { id: "F", length: 6, width: 8, thickness: 1.8, topElevation: 0 },
      pileGroup: { id: "PG", pileType: "bored_pile", diameter: 1.2, length: 18, pileCount: 6, spacing: { x: 3, y: 3 } },
    },
    ...overrides,
  };
}

describe("degToRad / radToDeg", () => {
  it("round-trips degree/radian", () => {
    expect(radToDeg(degToRad(30))).toBeCloseTo(30, 9);
    expect(degToRad(radToDeg(1.0))).toBeCloseTo(1.0, 9);
  });

  it("handles null", () => {
    expect(degToRad(null)).toBeNull();
    expect(radToDeg(null)).toBeNull();
  });
});

describe("supportToForm", () => {
  it("maps pier support to form state", () => {
    const s = pierSupport();
    const form = supportToForm(s);
    expect(form.supportId).toBe("P1");
    expect(form.supportType).toBe("pier");
    expect(form.placement.station).toBe(50);
    expect(form.placement.offset).toBe(2);
    expect(form.placement.alignmentId).toBe("aln-001");
    expect(form.placement.skewDeg).toBeCloseTo(0.1 * 180 / Math.PI, 6);
    expect(form.pier?.formType).toBe("single_column_rect");
    expect(form.pier?.column.width).toBe(1.2);
    expect(form.foundation.isSpread).toBe(false);
    expect(form.foundation.pile.pileType).toBe("bored_pile");
    expect(form.foundation.pile.diameter).toBe(1.2);
  });

  it("maps spread foundation as isSpread=true without pile", () => {
    const s = pierSupport({
      pier: {
        id: "P1",
        formType: "single_column_rect",
        column: { id: "C", width: 1.2, depth: 1.6, height: 7 },
        cap: { id: "CAP", width: 1.6, depth: 8, height: 1.2, overhangL: 0, overhangR: 0 },
        footing: { id: "F", length: 6, width: 8, thickness: 1.8, topElevation: 0 },
        pileGroup: null,
      },
    });
    const form = supportToForm(s);
    expect(form.foundation.isSpread).toBe(true);
  });

  it("maps abutment to abutment form", () => {
    const s: Support = {
      supportId: "A1",
      supportType: "abutment",
      skewRad: 0,
      placement: { source: "liner", alignmentId: "aln", station: 0, offset: 0 },
      bearingSeats: [],
      abutment: {
        id: "A1",
        formType: "inverted_t",
        backwall: { id: "BW", height: 5.5, thickness: 0.8, width: 11, seatElevation: 8 },
        wingWallL: { id: "WL", length: 4, height: 5.5, thickness: 0.5 },
        wingWallR: { id: "WR", length: 4, height: 5.5, thickness: 0.5 },
        footing: { id: "F", length: 9, width: 7, thickness: 1.5, topElevation: 0 },
      },
    };
    const form = supportToForm(s);
    expect(form.abutment?.formType).toBe("inverted_t");
    expect(form.abutment?.backwall.height).toBe(5.5);
    expect(form.foundation.footing.length).toBe(9);
  });
});

describe("validateForm", () => {
  function formWith(patch: Partial<ReturnType<typeof supportToForm>>) {
    return { ...supportToForm(pierSupport()), ...patch };
  }

  it("valid pier passes (no fatal)", () => {
    const v = validateForm(formWith({}));
    expect(v.hasFatal).toBe(false);
  });

  it("zero column width is fatal", () => {
    const f = formWith({});
    f.pier!.column.width = 0;
    const v = validateForm(f);
    expect(v.hasFatal).toBe(true);
    expect(v.issues.fatal.some((m) => m.includes("柱幅"))).toBe(true);
  });

  it("negative pile diameter is fatal", () => {
    const f = formWith({});
    f.foundation.pile.diameter = -1;
    const v = validateForm(f);
    expect(v.hasFatal).toBe(true);
  });

  it("skew > 30deg is warning (not fatal)", () => {
    const f = formWith({});
    f.placement.skewDeg = 45;
    const v = validateForm(f);
    expect(v.hasFatal).toBe(false);
    expect(v.issues.warning.length).toBeGreaterThan(0);
  });

  it("portal pier columns validated", () => {
    const f = formWith({});
    f.pier = {
      formType: "portal_frame",
      column: { width: null, depth: null, height: null, transverseOffset: null },
      cap: { width: null, depth: null, height: null, overhangL: null, overhangR: null },
      columns: [
        { width: 1.4, depth: 1.8, height: 8, transverseOffset: -3.5 },
        { width: 0, depth: 1.8, height: 8, transverseOffset: 3.5 },
      ],
      beam: { width: 1.6, depth: 9, height: 1.5 },
    };
    const v = validateForm(f);
    expect(v.hasFatal).toBe(true);
  });
});
