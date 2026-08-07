// Phase C1 (I01) 下部工 Data Model / Schema / Validation テスト
import { describe, it, expect } from "vitest";
import {
  SUBSTRUCTURE_SCHEMA_VERSION,
  SUBSTRUCTURE_COORDINATE_SYSTEM,
  SUBSTRUCTURE_UNIT_SYSTEM,
  type PierData,
  type AbutmentData,
  type SubstructureProject,
} from "../model";
import {
  validateSubstructureProject,
  isAllFatalFree,
  type Issue,
} from "../validation";

function baseProject(): SubstructureProject {
  return {
    schemaVersion: SUBSTRUCTURE_SCHEMA_VERSION,
    projectId: "p1",
    source: "c1-test",
    coordinateSystem: SUBSTRUCTURE_COORDINATE_SYSTEM,
    unitSystem: SUBSTRUCTURE_UNIT_SYSTEM,
    alignmentRefs: [{ alignmentId: "aln-001", originStation: 0, totalLength: 100 }],
    supports: [
      {
        supportId: "P1",
        supportType: "pier",
        skewRad: 0,
        placement: { source: "liner", alignmentId: "aln-001", station: 50, offset: 0 },
        bearingSeats: [],
        pier: {
          id: "P1",
          formType: "single_column_rect",
          column: { id: "P1-COLUMN-01", width: 2.0, depth: 2.2, height: 6.0 },
          cap: { id: "P1-CAP", width: 1.6, depth: 7.5, height: 1.6, overhangL: 0, overhangR: 0 },
          footing: { id: "P1-FOOTING", length: 6.0, width: 8.0, thickness: 1.8, topElevation: 0 },
          pileGroup: { id: "P1-PILEGROUP", pileType: "bored_pile", diameter: 1.2, length: 20, pileCount: 4, spacing: { x: 3, y: 3 } },
        },
      },
    ],
    metadata: {
      sourceApplication: "c1",
      sourceVersion: "0.2.0",
      sourceRevision: "test",
      createdAt: "2026-01-01",
      updatedAt: "2026-01-01",
    },
  };
}

function clone<T>(p: T): T {
  return JSON.parse(JSON.stringify(p));
}

function codes(issues: Issue[]): string[] {
  return issues.map((i) => i.code);
}
function allFree(issues: Issue[]): boolean {
  return isAllFatalFree(issues);
}

const portalPier = (): PierData => ({
  id: "P2",
  formType: "portal_frame",
  columns: [
    { id: "P2-COLUMN-01", width: 1.5, depth: 1.5, height: 6.0, transverseOffset: -3 },
    { id: "P2-COLUMN-02", width: 1.5, depth: 1.5, height: 6.0, transverseOffset: 3 },
  ],
  beam: { id: "P2-BEAM", width: 1.5, depth: 8, height: 1.5, spanDirection: "transverse" },
  footing: { id: "P2-FOOTING", length: 5, width: 3, thickness: 1.5, topElevation: 0 },
  pileGroup: { id: "P2-PILEGROUP", pileType: "steel_pipe", diameter: 0.8, length: 18, pileCount: 4, spacing: { x: 2.5, y: 2 } },
});

const baseAbutment = (): AbutmentData => ({
  id: "A1",
  formType: "cantilever_frame",
  backwall: { id: "A1-BACKWALL", height: 5.5, thickness: 0.8, width: 11, seatElevation: 8 },
  wingWallL: { id: "A1-WING-L", length: 4, height: 5.5, thickness: 0.5 },
  wingWallR: { id: "A1-WING-R", length: 4, height: 5.5, thickness: 0.5 },
  footing: { id: "A1-FOOTING", length: 5, width: 7, thickness: 1.5, topElevation: 0 },
  pileGroup: { id: "A1-PILEGROUP", pileType: "bored_pile", diameter: 1.0, length: 15, pileCount: 4, spacing: { x: 2.5, y: 2 } },
});

describe("validateSubstructureProject - valid model", () => {
  it("valid base model has no fatal issues", () => {
    expect(allFree(validateSubstructureProject(baseProject()))).toBe(true);
  });
});

describe("C1 enum support (P01 Freeze)", () => {
  it("accepts portal pier(2 columns + beam) + steel_pipe + direct_xyz + cantilever_frame abutment", () => {
    const p = baseProject();
    p.supports = [
      ...p.supports,
      {
        supportId: "P2",
        supportType: "pier",
        skewRad: 0.5,
        placement: { source: "direct_xyz", position: { x: 1, y: 2, z: 3 } },
        bearingSeats: [],
        pier: portalPier(),
      } as any,
      {
        supportId: "A1",
        supportType: "abutment",
        skewRad: 0,
        placement: { source: "liner", alignmentId: "aln-001", station: 95, offset: 0 },
        bearingSeats: [],
        abutment: baseAbutment(),
      },
    ];
    const issues = validateSubstructureProject(p);
    expect(issues.map((i) => i.code)).toEqual([]);
  });
});

describe("invalid model (fail-closed)", () => {
  it("rejects non-positive dimension", () => {
    const p = baseProject();
    (p.supports[0].pier as any).column.width = -1;
    const issues = validateSubstructureProject(p);
    expect(codes(issues)).toContain("NONPOSITIVE");
    expect(allFree(issues)).toBe(false);
  });

  it("rejects unknown supportType", () => {
    const p = baseProject();
    (p.supports[0] as any).supportType = "virtual_pier";
    expect(codes(validateSubstructureProject(p))).toContain("SUPPORT_TYPE_INVALID");
  });

  it("rejects FUTURE pier formType (not in C1)", () => {
    const p = baseProject();
    (p.supports[0].pier as any).formType = "steel_pier";
    expect(codes(validateSubstructureProject(p))).toContain("UNSUPPORTED_FORM");
  });

  it("rejects unknown pileType", () => {
    const p = baseProject();
    (p.supports[0].pier as any).pileGroup.pileType = "caisson";
    expect(codes(validateSubstructureProject(p))).toContain("UNSUPPORTED_PILE");
  });
});

describe("supportId stable ID uniqueness", () => {
  it("rejects duplicate supportId (FATAL)", () => {
    const p = baseProject();
    p.supports = [p.supports[0], clone(p.supports[0])];
    const issues = validateSubstructureProject(p);
    expect(codes(issues)).toContain("SUPPORT_ID_DUPLICATE");
    expect(allFree(issues)).toBe(false);
  });

  it("accepts unique supportIds across types", () => {
    const p = baseProject();
    p.supports[0].supportId = "P9";
    p.supports.push({
      supportId: "A9",
      supportType: "abutment",
      skewRad: 0,
      placement: { source: "liner", alignmentId: "aln-001", station: 95, offset: 0 },
      bearingSeats: [],
      abutment: baseAbutment(),
    } as any);
    const issues = validateSubstructureProject(p);
    expect(issues.filter((i) => i.code === "SUPPORT_ID_DUPLICATE")).toHaveLength(0);
  });
});

describe("placement rules (P02 Freeze)", () => {
  it("PRIMARY liner placement requires alignmentId", () => {
    const p = baseProject();
    delete (p.supports[0].placement as any).alignmentId;
    const issues = validateSubstructureProject(p);
    expect(codes(issues)).toContain("ALIGNMENT_MISSING");
    expect(allFree(issues)).toBe(false);
  });

  it("EXCEPTION direct_xyz requires position", () => {
    const p = baseProject();
    p.supports[0].placement = { source: "direct_xyz" } as any;
    expect(codes(validateSubstructureProject(p))).toContain("POSITION_INVALID");
  });
});

describe("missing optional substructure (backward compatibility)", () => {
  it("root object without supports is rejected with NO_SUPPORTS and not fatal-clean", () => {
    const p = baseProject();
    (p as any).supports = [];
    const issues = validateSubstructureProject(p);
    expect(codes(issues)).toContain("NO_SUPPORTS");
  });
});