// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import {
  SpanLayoutCsvError,
  SpanLayoutError,
  addSupport,
  buildSpansFromSupports,
  defaultSpanLayoutFromSpans,
  ensureSpanLayout,
  parseSpanLayoutCsv,
  removeSupport,
  spanLayoutTemplateCsv,
  syncProjectSpansFromLayout,
  updateSupport,
} from "./spanLayout";
import { makeInitialBridgeProject } from "./BridgeWizardState";
import { importRoadAlignmentCsv } from "./roadAlignment";
import type { Span } from "./types";

describe("spanLayout.templateCsv", () => {
  it("has name,type,station header and example rows", () => {
    const tpl = spanLayoutTemplateCsv();
    expect(tpl).toContain("name,type,station");
    expect(tpl.split(/\r?\n/).filter((l) => l.trim().length > 0).length).toBeGreaterThanOrEqual(4);
  });
});

describe("spanLayout.parseSpanLayoutCsv", () => {
  const alignment = importRoadAlignmentCsv("station,x,y,z\n0,0,0,0\n10,10,0,0\n30,30,2,0\n", "csv");

  it("parses name,type,station rows and sorts by station", () => {
    const csv = "name,type,station\nA1,abutment,0\nP1,pier,10\nA2,abutment,30\n";
    const supports = parseSpanLayoutCsv(csv, alignment);
    expect(supports.map((s) => s.name)).toEqual(["A1", "P1", "A2"]);
  });

  it("throws when station is outside alignment range", () => {
    const csv = "name,type,station\nA1,abutment,0\nA2,abutment,9999\n";
    expect(() => parseSpanLayoutCsv(csv, alignment)).toThrow(SpanLayoutCsvError);
  });

  it("requires abutment on first and last", () => {
    const csv = "name,type,station\nA1,pier,0\nA2,abutment,30\n";
    expect(() => parseSpanLayoutCsv(csv, alignment)).toThrow(/abutment/);
  });

  it("rejects duplicate station", () => {
    const csv = "name,type,station\nA1,abutment,0\nP1,pier,10\nA2,abutment,10\n";
    expect(() => parseSpanLayoutCsv(csv, alignment)).toThrow(/duplicate/);
  });

  it("rejects non-numeric station", () => {
    const csv = "name,type,station\nA1,abutment,abc\nA2,abutment,10\n";
    expect(() => parseSpanLayoutCsv(csv, alignment)).toThrow();
  });
});

describe("spanLayout.buildSpansFromSupports", () => {
  it("returns segments between consecutive supports", () => {
    const segs = buildSpansFromSupports([
      { name: "A1", type: "abutment", station: 0 },
      { name: "P1", type: "pier", station: 10 },
      { name: "A2", type: "abutment", station: 30 },
    ]);
    expect(segs).toEqual([
      { from: "A1", to: "P1", length: 10 },
      { from: "P1", to: "A2", length: 20 },
    ]);
  });
});

describe("spanLayout.defaultSpanLayoutFromSpans", () => {
  it("generates A1 / P1.. / A2 for 5 spans (3 piers) with cumulative station", () => {
    const spans: Span[] = [
      { index: 1, length: 10, offset: 0 },
      { index: 2, length: 20, offset: 0 },
      { index: 3, length: 30, offset: 0 },
      { index: 4, length: 40, offset: 0 },
      { index: 5, length: 50, offset: 0 },
    ];
    const layout = defaultSpanLayoutFromSpans(spans, "simple");
    expect(layout.supports.map((s) => s.name)).toEqual(["A1", "P1", "P2", "P3", "A2"]);
    expect(layout.supports[0].type).toBe("abutment");
    expect(layout.supports[1].type).toBe("pier");
    expect(layout.supports[layout.supports.length - 1].type).toBe("abutment");
    expect(layout.supports.map((s) => s.station)).toEqual([0, 10, 30, 60, 150]);
    // 累加距離によるスパンの長さになる
    expect(layout.spans.map((s) => s.length)).toEqual([10, 20, 30, 90]);
  });
  it("generates A1/A2 for a single span (no piers)", () => {
    const spans: Span[] = [{ index: 1, length: 25, offset: 0 }];
    const layout = defaultSpanLayoutFromSpans(spans, "simple");
    expect(layout.supports.map((s) => s.name)).toEqual(["A1", "A2"]);
    expect(layout.supports.map((s) => s.station)).toEqual([0, 25]);
    expect(layout.spans.map((s) => s.length)).toEqual([25]);
  });
});

describe("spanLayout.mutations", () => {
  // 4 支間 -> A1, P1, P2, P3, A2
  const base = defaultSpanLayoutFromSpans([
    { index: 1, length: 20, offset: 0 },
    { index: 2, length: 10, offset: 0 },
    { index: 3, length: 15, offset: 0 },
    { index: 4, length: 5, offset: 0 },
    { index: 5, length: 8, offset: 0 },
  ]);
  it("addSupport sorts and rebuilds spans", () => {
    const next = addSupport(base, { name: "P4", type: "pier", station: 25 });
    // 5 支間 (20, 10, 15, 5, 8) -> A1=0, P1=20, P2=30, P3=45, A2=50, A2に上書き=58
    // そこに P4=25 を追加 -> [0, 20, 25, 30, 45, 58]
    expect(next.supports.map((s) => s.station)).toEqual([0, 20, 25, 30, 45, 58]);
    expect(next.spans).toHaveLength(5);
  });
  it("updateSupport changes a single support", () => {
    const next = updateSupport(base, "P1", { station: 15 });
    expect(next.supports[1].station).toBe(15);
  });
  it("removeSupport refuses below 2 supports", () => {
    const one = { ...base, supports: base.supports.slice(0, 2) };
    expect(() => removeSupport(one, "A1")).toThrow(SpanLayoutError);
  });
});

describe("spanLayout.ensureSpanLayout", () => {
  it("backfills when missing", () => {
    const p = makeInitialBridgeProject();
    const layout = ensureSpanLayout(p);
    expect(layout.supports.length).toBeGreaterThanOrEqual(2);
  });
  it("syncs to project.spans for backward compatibility", () => {
    const p = makeInitialBridgeProject();
    const layout = ensureSpanLayout(p);
    const synced = syncProjectSpansFromLayout(p, layout);
    expect(synced.spans.length).toBe(layout.spans.length);
  });
});
