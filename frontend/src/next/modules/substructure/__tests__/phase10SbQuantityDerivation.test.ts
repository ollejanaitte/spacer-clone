/**
 * SB-04 quantity derivation (REF-MOUNTAIN-1) — 独立照合のための再現test。
 *
 * fixture_constants.json（support形式・station）からcomputeSubstructureQuantityを
 * 実際に実行し、出力を /tmp/opencode/p10-oracle/sb_quantity_output.json へ書く。
 * verify_oracle_evidence.py が本testを実行し、固定 sb_quantity_input.json と厳密比較する。
 *
 * 実行（リポジトリルートの frontend/ から）:
 *   npx vitest run src/next/modules/substructure/__tests__/phase10SbQuantityDerivation.test.ts
 */
import { readFileSync, writeFileSync } from "node:fs";
import { describe, it, expect } from "vitest";
import { generateSample } from "../../../../substructure/planning/samples/sampleGenerator";
import { buildSubstructureDocument } from "../substructureDocumentDomain";
import { computeSubstructureQuantity } from "../substructureDesign";

const FIXTURE = "../docs/rebuild/phase10/evidence/oracle-comparator/fixture_constants.json";
const OUT = process.env.P10_SB_OUTPUT ?? "/tmp/opencode/p10-oracle/sb_quantity_output.json";

describe("Phase10 SB-04 quantity derivation (REF-MOUNTAIN-1)", () => {
  function build(supportId: string, kind: Parameters<typeof generateSample>[0], station: number) {
    const s = generateSample(kind, supportId, station);
    const built = buildSubstructureDocument({
      projectId: "REF-MOUNTAIN-1",
      bridgeLayoutReference: { bridgeId: "REF-MOUNTAIN-1", moduleId: "bridgeLayout", documentVersion: "0.1.0", layoutFingerprint: "fp" },
      superstructureReference: { bridgeId: "REF-MOUNTAIN-1", moduleId: "superstructure", documentVersion: "0.1.0", superstructureDocumentId: "SS-1", handoffSchemaVersion: "1.0.0" },
      roadReference: { moduleId: "road", alignmentId: "ALN", stationReferenceId: null, coordinatePolicyId: null },
      supports: [{
        supportId: s.supportId,
        supportType: s.supportType,
        placement: { source: "liner", alignmentId: "ALN", station, offset: 0 },
        skewRad: s.skewRad,
        bearingSeats: s.bearingSeats,
        pier: s.pier,
        abutment: s.abutment,
      }],
    });
    if (!built.ok) throw new Error(`build failed for ${supportId}`);
    return built.document;
  }
  it("derives and freezes quantities from fixture_constants.json", () => {
    const fx = JSON.parse(readFileSync(FIXTURE, "utf-8"));
    const sub = fx.substructure;
    const docs = sub.supports.map((sid: string) => {
      const spec = sub[sid];
      return build(sid, spec.kind, spec.station);
    });
    const qs = docs.map((d) => computeSubstructureQuantity(d));
    const out = {
      supports: sub.supports,
      A1: { concrete: qs[0].totalConcreteVolumeM3, pile: qs[0].totalPileLengthM },
      P1: { concrete: qs[1].totalConcreteVolumeM3, pile: qs[1].totalPileLengthM },
      A2: { concrete: qs[2].totalConcreteVolumeM3, pile: qs[2].totalPileLengthM },
      totalConcrete: qs.reduce((a: number, q) => a + (q.totalConcreteVolumeM3 ?? 0), 0),
      totalPile: qs.reduce((a: number, q) => a + (q.totalPileLengthM ?? 0), 0),
    };
    writeFileSync(OUT, JSON.stringify(out, null, 2));
    expect(out.totalConcrete).toBeCloseTo(616.72, 1);
    expect(out.P1.concrete).toBeCloseTo(187.92, 1);
  });
});
