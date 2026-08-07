// Phase C1 Milestone 1 統合検証 — データモデル→バリデーション→配置→3Dジオメトリ→2D投影 の一貫パイプライン。
// Golden Cases: 全下部工形式（直橋・斜橋・曲線橋相当）を一括で生成し、安定ID・決定性・JSON互換・後方互換を検証する。

import { describe, it, expect } from "vitest";
import { validateSubstructureProject, isAllFatalFree } from "../validation";
import { computeAllPlacements } from "../SupportPlacementEngine";
import { buildAllSupportSolids } from "../SubstructureSolidGenerator";
import { projectAll } from "../PlanProjection";
import { type SolidGroup } from "../geometryBase";
import type { SubstructureProject, Support, SupportPlacementSnapshot } from "../model";

/** Golden case データセット（全形式 + 直橋/斜橋/曲線橋）。 */
function goldenProject(): SubstructureProject {
  return {
    schemaVersion: "0.2.0",
    projectId: "m1-golden",
    source: "c1",
    coordinateSystem: "x-longitudinal-y-transverse-z-up",
    unitSystem: "si",
    alignmentRefs: [{ alignmentId: "aln-main", originStation: 0, totalLength: 500 }],
    metadata: {
      sourceApplication: "spacer-clone",
      sourceVersion: "0.2.0",
      sourceRevision: "m1",
      createdAt: "2026-08-08T00:00:00.000Z",
      updatedAt: "2026-08-08T00:00:00.000Z",
    },
    supports: [
      abutmentSupport("A1", "inverted_t", 0),
      abutmentSupport("A2", "cantilever_frame", 0),
      pierSupport("P1", "single_column_rect", 0),
      pierSupport("P2", "wall", 0),
      pierSupport("P3", "portal_frame", 0),
      // 斜橋
      { ...abutmentSupport("A3", "inverted_t", 0.1745), skewRad: 0.1745 },
    ],
  };
}

function abutmentSupport(
  supportId: string,
  formType: "inverted_t" | "cantilever_frame",
  skewRad: number,
): Support {
  return {
    supportId,
    supportType: "abutment",
    skewRad,
    placement: { source: "direct_xyz", position: { x: 10, y: 0, z: 5 }, azimuthRad: Math.PI / 2 },
    bearingSeats: [],
    abutment: {
      id: supportId,
      formType,
      backwall: { id: `${supportId}-BW`, height: 5.5, thickness: 0.8, width: 11.0, seatElevation: 8 },
      wingWallL: { id: `${supportId}-WL`, length: 4, height: 5.5, thickness: 0.5 },
      wingWallR: { id: `${supportId}-WR`, length: 4, height: 5.5, thickness: 0.5 },
      footing: { id: `${supportId}-FOOTING`, length: 12, width: 8, thickness: 1.5, topElevation: 0 },
      pileGroup: { id: `${supportId}-PILES`, pileType: "bored_pile", diameter: 1.2, length: 18, pileCount: 6, spacing: { x: 3.6, y: 3.6 } },
    },
  };
}

function pierSupport(
  supportId: string,
  formType: "single_column_rect" | "wall" | "portal_frame",
  skewRad: number,
): Support {
  const base: Support = {
    supportId,
    supportType: "pier",
    skewRad,
    placement: { source: "direct_xyz", position: { x: 60, y: 0, z: 5 }, azimuthRad: Math.PI / 2 },
    bearingSeats: [],
    pier: {
      id: supportId,
      formType,
      footing: { id: `${supportId}-FOOTING`, length: 10, width: 7, thickness: 1.8, topElevation: 0 },
    },
  };
  if (formType === "portal_frame") {
    base.pier!.columns = [
      { id: `${supportId}-C1`, width: 1.4, depth: 1.8, height: 8, transverseOffset: -3.5 },
      { id: `${supportId}-C2`, width: 1.4, depth: 1.8, height: 8, transverseOffset: 3.5 },
    ];
    base.pier!.beam = { id: `${supportId}-BEAM`, width: 1.6, depth: 9, height: 1.5, spanDirection: "transverse" };
  } else {
    base.pier!.column = { id: `${supportId}-COLUMN`, width: formType === "wall" ? 7 : 1.2, depth: 1.6, height: 7 };
    base.pier!.cap = { id: `${supportId}-CAP`, width: 1.6, depth: formType === "wall" ? 7 : 8, height: 1.2, overhangL: 0.5, overhangR: 0.5 };
  }
  return base;
}

/** placement エンジン出力を snapshot map に変換。 */
function snapshotMap(project: SubstructureProject): Map<string, SupportPlacementSnapshot> {
  const out = computeAllPlacements(project.supports, null);
  const map = new Map<string, SupportPlacementSnapshot>();
  project.supports.forEach((sup, i) => {
    const r = out.results[i];
    map.set(sup.supportId, {
      source: r.snapshot.source,
      position: r.snapshot.position,
      tangent: r.snapshot.tangent,
      transverse: r.snapshot.transverse,
      vertical: r.snapshot.vertical,
      azimuthRad: r.snapshot.azimuthRad,
      skewRad: r.snapshot.skewRad,
    });
  });
  return map;
}

describe("M1 pipeline: data model -> validation -> placement", () => {
  it("golden project passes validation (fatal-free)", () => {
    const issues = validateSubstructureProject(goldenProject());
    expect(issues).toHaveLength(0);
    expect(isAllFatalFree(issues)).toBe(true);
  });

  it("placement engine produces snapshot for every support", () => {
    const project = goldenProject();
    const map = snapshotMap(project);
    for (const s of project.supports) {
      expect(map.has(s.supportId)).toBe(true);
    }
  });
});

describe("M1 pipeline: 3D geometry for all support types", () => {
  it("generates solids for every support without error", () => {
    const project = goldenProject();
    const map = snapshotMap(project);
    const groups = buildAllSupportSolids(project.supports, map);
    expect(groups).toHaveLength(project.supports.length);
    for (const g of groups) {
      expect(g.solids.length).toBeGreaterThan(0);
    }
  });

  it("abutment includes backwall/wings/footing/piles", () => {
    const project = goldenProject();
    const map = snapshotMap(project);
    const groups = buildAllSupportSolids(project.supports, map);
    const a1 = groups.find((g) => g.supportId === "A1")!;
    const ids = new Set(a1.solids.map((n) => n.id));
    expect(ids.has("A1-BACKWALL")).toBe(true);
    expect(ids.has("A1-WING-L")).toBe(true);
    expect(ids.has("A1-WING-R")).toBe(true);
    expect(ids.has("A1-FOOTING")).toBe(true);
    expect([...a1.solids].some((n) => n.entity === "pile")).toBe(true);
  });

  it("portal pier includes 2 columns + beam", () => {
    const project = goldenProject();
    const map = snapshotMap(project);
    const groups = buildAllSupportSolids(project.supports, map);
    const p3 = groups.find((g) => g.supportId === "P3")!;
    const ids = new Set(p3.solids.map((n) => n.id));
    expect(ids.has("P3-COLUMN-01")).toBe(true);
    expect(ids.has("P3-COLUMN-02")).toBe(true);
    expect(ids.has("P3-BEAM")).toBe(true);
  });

  it("bored pile solids are cylinders with stable IDs", () => {
    const project = goldenProject();
    const map = snapshotMap(project);
    const groups = buildAllSupportSolids(project.supports, map);
    const a1 = groups.find((g) => g.supportId === "A1")!;
    const piles = a1.solids.filter((n) => n.entity === "pile");
    expect(piles.length).toBeGreaterThan(0);
    expect(piles.every((p) => p.kind === "cylinder")).toBe(true);
    expect(piles.every((p) => p.material === "foundation.boredPile")).toBe(true);
    expect(piles[0].id).toBe("A1-PILE-01");
  });

  it("steel pipe pile material", () => {
    const p = goldenProject();
    const sup = p.supports.find((s) => s.supportId === "A2")!;
    sup.abutment!.pileGroup = { id: "A2-PILES", pileType: "steel_pipe", diameter: 0.8, length: 22, pileCount: 9, spacing: { x: 2.8, y: 2.8 } };
    const map = snapshotMap(p);
    const groups = buildAllSupportSolids(p.supports, map);
    const a2 = groups.find((g) => g.supportId === "A2")!;
    const piles = a2.solids.filter((n) => n.entity === "pile");
    expect(piles.every((pl) => pl.material === "foundation.steelPile")).toBe(true);
  });
});

describe("M1 pipeline: 2D plan projection", () => {
  it("projectAll covers every support with sourceObjectId parity", () => {
    const project = goldenProject();
    const map = snapshotMap(project);
    const groups: SolidGroup[] = buildAllSupportSolids(project.supports, map);
    const projections = projectAll(groups);
    expect(projections).toHaveLength(groups.length);
    for (const g of groups) {
      const proj = projections.find((x) => x.supportId === g.supportId)!;
      const ids = new Set(proj.primitives.map((p) => p.sourceObjectId));
      for (const n of g.solids) {
        expect(ids.has(n.id)).toBe(true);
      }
      expect(proj.supportCenter).toEqual({
        x: g.transform.origin.x,
        y: g.transform.origin.y,
      });
    }
  });
});

describe("M1 stable ID + determinism + JSON compatibility", () => {
  it("same project -> identical solids and projections", () => {
    const a = buildAllSupportSolids(goldenProject().supports, snapshotMap(goldenProject()));
    const b = buildAllSupportSolids(goldenProject().supports, snapshotMap(goldenProject()));
    expect(a).toEqual(b);
    expect(projectAll(a)).toEqual(projectAll(b));
  });

  it("golden project survives JSON round-trip", () => {
    const project = goldenProject();
    const round = JSON.parse(JSON.stringify(project)) as SubstructureProject;
    expect(validateSubstructureProject(round)).toHaveLength(0);
  });

  it("backward compatibility: legacy project.schema (no substructure) already validated in projectSchemaRegression", () => {
    // 後方互換（既存 project.json が substructure 追加後も有効）は
    // projectSchemaRegression.test.ts で JSON Schema レベルで担保済み。
    // ここでは M1 golden が 0.2.0 スキーマを満たすことを再確認する。
    const issues = validateSubstructureProject(goldenProject());
    expect(isAllFatalFree(issues)).toBe(true);
  });
});