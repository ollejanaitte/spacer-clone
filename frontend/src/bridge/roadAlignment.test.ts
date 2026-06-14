// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import {
  ROAD_ALIGNMENT_TEMPLATE_HEADER,
  RoadAlignmentCsvError,
  alignmentEnd,
  alignmentStart,
  defaultStraightRoadAlignment,
  ensureRoadAlignment,
  importRoadAlignmentCsv,
  parseRoadAlignmentCsv,
  pointAtStation,
  polylineLength,
  roadAlignmentTemplateCsv,
  setRoadAlignment,
  totalAlignmentLength,
} from "./roadAlignment";
import { makeInitialBridgeProject } from "./BridgeWizardState";

describe("roadAlignment.templateCsv", () => {
  it("includes header and at least one sample row", () => {
    const tpl = roadAlignmentTemplateCsv();
    expect(tpl).toContain(ROAD_ALIGNMENT_TEMPLATE_HEADER);
    expect(tpl.split(/\r?\n/).filter((l) => l.trim().length > 0).length).toBeGreaterThanOrEqual(4);
  });
});

describe("roadAlignment.parseRoadAlignmentCsv", () => {
  it("parses station,x,y,z rows", () => {
    const csv = "station,x,y,z\n0,0,0,0\n10,10,0,0\n20,20,1,0\n30,30,2,0\n";
    const pts = parseRoadAlignmentCsv(csv);
    expect(pts).toHaveLength(4);
    expect(pts[0]).toEqual({ station: 0, x: 0, y: 0, z: 0 });
    expect(pts[3].station).toBe(30);
  });

  it("computes station automatically when blank", () => {
    const csv = "x,y,z\n0,0,0\n10,0,0\n20,0,0\n";
    const pts = parseRoadAlignmentCsv(csv);
    expect(pts[0].station).toBe(0);
    expect(pts[1].station).toBe(10);
    expect(pts[2].station).toBe(20);
  });

  it("ignores comment and empty lines", () => {
    const csv = "# comment\nstation,x,y,z\n0,0,0,0\n\n10,10,0,0\n";
    const pts = parseRoadAlignmentCsv(csv);
    expect(pts).toHaveLength(2);
  });

  it("throws on non-numeric values", () => {
    const csv = "station,x,y,z\n0,abc,0,0\n10,10,0,0\n";
    expect(() => parseRoadAlignmentCsv(csv)).toThrow(RoadAlignmentCsvError);
  });

  it("throws when fewer than 2 points", () => {
    const csv = "station,x,y,z\n0,0,0,0\n";
    expect(() => parseRoadAlignmentCsv(csv)).toThrow(/at least 2/);
  });
});

describe("roadAlignment.geometry", () => {
  const alignment = importRoadAlignmentCsv(
    "station,x,y,z\n0,0,0,0\n10,10,0,0\n20,20,1,0\n30,30,2,0\n",
    "csv",
  );
  it("computes total alignment length", () => {
    expect(totalAlignmentLength(alignment)).toBe(30);
  });
  it("computes polyline length when station is missing", () => {
    const pts = [
      { station: 0, x: 0, y: 0, z: 0 },
      { station: 0, x: 3, y: 0, z: 0 },
      { station: 0, x: 3, y: 4, z: 0 },
    ];
    expect(polylineLength(pts)).toBeCloseTo(7, 6);
  });
  it("returns start and end points", () => {
    expect(alignmentStart(alignment)).toEqual({ station: 0, x: 0, y: 0, z: 0 });
    expect(alignmentEnd(alignment)?.station).toBe(30);
  });
  it("interpolates 3D point at any station", () => {
    const mid = pointAtStation(alignment, 15);
    expect(mid).not.toBeNull();
    expect(mid?.x).toBeCloseTo(15, 6);
    expect(mid?.y).toBeCloseTo(0.5, 6);
    expect(mid?.z).toBeCloseTo(0, 6);
  });
  it("clamps station outside range", () => {
    const before = pointAtStation(alignment, -10);
    const after = pointAtStation(alignment, 999);
    expect(before?.station).toBe(0);
    expect(after?.station).toBe(30);
  });
});

describe("roadAlignment.ensureRoadAlignment", () => {
  it("returns existing roadAlignment if present", () => {
    const p = setRoadAlignment(makeInitialBridgeProject(), defaultStraightRoadAlignment(15));
    const a = ensureRoadAlignment(p);
    expect(a.bridgeLength).toBe(15);
  });
  it("backfills from project.spans when missing", () => {
    const p = makeInitialBridgeProject();
    const a = ensureRoadAlignment(p);
    expect(a.inputMode).toBe("simple");
    expect(a.bridgeLength).toBeGreaterThan(0);
    expect(a.points).toHaveLength(2);
  });
});
