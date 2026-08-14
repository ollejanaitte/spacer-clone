/**
 * SB-04 quantity derivation (REF-MOUNTAIN-1) — 独立照合のための再現script。
 * 実行: npx vitest run <このファイル>
 * 依存: frontend/src/substructure/planning/samples/sampleGenerator.ts (declared geometry)
 *       frontend/src/next/modules/substructure/substructureDesign.ts computeSubstructureQuantity
 */
import { writeFileSync } from "node:fs";
import { describe, it, expect } from "vitest";
import { generateSample } from "../../../frontend/src/substructure/planning/samples/sampleGenerator";
import { buildSubstructureDocument } from "../../../frontend/src/next/modules/substructure/substructureDocumentDomain";
import { computeSubstructureQuantity } from "../../../frontend/src/next/modules/substructure/substructureDesign";

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
  it("derives and freezes quantities", () => {
    const a1 = build("A1", "abutment_inverted_t", 50);
    const p1 = build("P1", "pier_portal", 300);
    const a2 = build("A2", "abutment_inverted_t", 450);
    const q1 = computeSubstructureQuantity(a1);
    const q2 = computeSubstructureQuantity(p1);
    const q3 = computeSubstructureQuantity(a2);
    const out = {
      supports: ["A1", "P1", "A2"],
      A1: { concrete: q1.totalConcreteVolumeM3, pile: q1.totalPileLengthM },
      P1: { concrete: q2.totalConcreteVolumeM3, pile: q2.totalPileLengthM },
      A2: { concrete: q3.totalConcreteVolumeM3, pile: q3.totalPileLengthM },
      totalConcrete: (q1.totalConcreteVolumeM3 ?? 0) + (q2.totalConcreteVolumeM3 ?? 0) + (q3.totalConcreteVolumeM3 ?? 0),
      totalPile: (q1.totalPileLengthM ?? 0) + (q2.totalPileLengthM ?? 0) + (q3.totalPileLengthM ?? 0),
      derivation: "computeSubstructureQuantity(generateSample declared geometry)",
    };
    writeFileSync("sb_quantity_output.json", JSON.stringify(out, null, 2));
    expect(out.totalConcrete).toBe(616.72);
    expect(out.P1.concrete).toBe(187.92);
  });
});
