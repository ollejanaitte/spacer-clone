// Phase C1 (A-02) 橋脚モデル → Adapter 入力マッパー テスト
import { describe, it, expect } from "vitest";
import {
  mapSupportToAdapterInput,
  modelRevisionOf,
  extractGeometry,
} from "../design/adapterMapper";
import { generateCombo, generateSample } from "../planning/samples/sampleGenerator";
import type { Support } from "../model";

function clone(support: Support): Support {
  return JSON.parse(JSON.stringify(support)) as Support;
}

describe("mapSupportToAdapterInput (portal pier)", () => {
  const p1 = generateCombo("combo-standard")[1];

  it("preserves supportId and structureType", () => {
    const result = mapSupportToAdapterInput(p1);
    expect(result.ok).toBe(true);
    expect(result.value!.supportId).toBe("P1");
    expect(result.value!.structureType).toBe("pier");
  });

  it("extracts geometry from the actual pier model", () => {
    const result = mapSupportToAdapterInput(p1);
    const g = result.value!.geometry;
    expect(g.pierFormType).toBe("portal_frame");
    expect(g.columns).toHaveLength(2);
    expect(g.columns![0].width).toBe(p1.pier!.columns![0].width);
    expect(g.beam).toEqual({
      width: p1.pier!.beam!.width,
      depth: p1.pier!.beam!.depth,
      height: p1.pier!.beam!.height,
    });
    expect(g.footing).toEqual({
      length: p1.pier!.footing.length,
      width: p1.pier!.footing.width,
      thickness: p1.pier!.footing.thickness,
    });
  });

  it("extracts placement with degree skew", () => {
    const result = mapSupportToAdapterInput(p1);
    expect(result.value!.placement.station).toBe(30);
    expect(result.value!.placement.skewDeg).toBeCloseTo(0, 6);
    expect(result.value!.units).toEqual({ length: "m", force: "kN", angle: "deg" });
  });

  it("model value change changes the adapter input (no hardcode)", () => {
    const a = mapSupportToAdapterInput(p1);
    const changed = clone(p1);
    changed.pier!.columns![0].width = 2.0;
    const b = mapSupportToAdapterInput(changed);
    expect(a.value!.geometry.columns![0].width).toBe(1.4);
    expect(b.value!.geometry.columns![0].width).toBe(2.0);
    expect(a.value!.modelRevision).not.toBe(b.value!.modelRevision);
  });

  it("extracts model revision deterministically and reflects changes", () => {
    const rev1 = modelRevisionOf(p1);
    const rev2 = modelRevisionOf(p1);
    expect(rev1).toBe(rev2);
    const changed = clone(p1);
    changed.pier!.footing.thickness = 2.5;
    expect(modelRevisionOf(changed)).not.toBe(rev1);
  });
});

describe("mapSupportToAdapterInput (abutment with piles)", () => {
  const bored = generateSample("foundation_bored", "S1", 0);

  it("maps abutment geometry including pileGroup", () => {
    const result = mapSupportToAdapterInput(bored);
    expect(result.ok).toBe(true);
    const g = result.value!.geometry;
    expect(g.abutmentFormType).toBe("inverted_t");
    expect(g.backwall).toBeDefined();
    expect(g.pileGroup?.pileType).toBe("bored_pile");
    expect(g.pileGroup?.pileCount).toBe(6);
  });

  it("carries bearing seat count", () => {
    const result = mapSupportToAdapterInput(bored);
    expect(result.value!.bearingSeatCount).toBe(0);
  });
});

describe("fail-closed invalid model", () => {
  it("rejects a support with no pier/abutment data", () => {
    const bad: Support = {
      supportId: "X1",
      supportType: "pier",
      skewRad: 0,
      placement: { source: "liner", alignmentId: "aln", station: 0, offset: 0 },
      bearingSeats: [],
    };
    const result = mapSupportToAdapterInput(bad);
    expect(result.ok).toBe(false);
  });

  it("rejects incomplete geometry (zero footing)", () => {
    const s = clone(generateCombo("combo-standard")[0]);
    s.abutment!.footing.thickness = 0;
    const result = mapSupportToAdapterInput(s);
    expect(result.ok).toBe(false);
    expect(result.diagnostics.join("")).toContain("footing");
  });
});
