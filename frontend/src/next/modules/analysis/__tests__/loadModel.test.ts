import { describe, expect, it } from "vitest";
import { buildAnalysisModel } from "../analysisModel";
import { buildAnalysisLoads, LC_STRUCTURAL, LC_DECK, COMBO_1 } from "../loadModel";
import type { AnalysisSourceReferences } from "../analysisDocumentTypes";
import { TEST_GEOMETRY_SNAPSHOT, TEST_SUPERSTRUCTURE_DOCUMENT } from "./superstructureFixtures";
import { TEST_SUBSTRUCTURE_DOCUMENT } from "./substructureFixtures";

function refs(): AnalysisSourceReferences {
  return {
    bridgeLayout: { bridgeId: "B-1", documentVersion: "1", layoutFingerprint: "f-layout" },
    superstructure: {
      superstructureDocumentId: "11111111-1111-4111-8111-111111111111",
      documentVersion: "1",
      dataFingerprint: "f-super",
      geometrySnapshotFingerprint: "f-snap",
    },
    substructure: {
      substructureDocumentId: "22222222-2222-4222-8222-222222222222",
      documentVersion: "1",
      dataFingerprint: "f-sub",
    },
    loadFingerprint: "f-load",
    solverSettingsFingerprint: "f-solver",
  };
}

function model() {
  const result = buildAnalysisModel({
    projectId: "p-1",
    createdBy: "test",
    superstructure: TEST_SUPERSTRUCTURE_DOCUMENT,
    substructure: TEST_SUBSTRUCTURE_DOCUMENT,
    snapshot: TEST_GEOMETRY_SNAPSHOT,
    sourceReferences: refs(),
  });
  return result.document;
}

describe("loadModel (Phase 7-01 C FROZEN / WP-F)", () => {
  it("distributes dead loads as member distributed loads (q = total / sum length)", () => {
    const document = model();
    const result = buildAnalysisLoads(TEST_SUPERSTRUCTURE_DOCUMENT, document);
    expect(result.issues).toHaveLength(0);

    const structuralTotal = result.loadCases.find((c) => c.caseId === LC_STRUCTURAL)!.totalKN!;
    const deckTotal = result.loadCases.find((c) => c.caseId === LC_DECK)!.totalKN!;

    // 4 main girder members x 10 m = 40 m total loaded length.
    const structural = result.memberLoads.filter((l) => l.loadCaseId === LC_STRUCTURAL);
    expect(structural).toHaveLength(4);
    const qStructural = structuralTotal / 40;
    for (const load of structural) {
      expect(load.type).toBe("distributed");
      expect(load.direction).toBe("z");
      expect(load.coordinateSystem).toBe("global");
      expect(load.magnitude).toBeCloseTo(-qStructural, 12);
    }

    const deck = result.memberLoads.filter((l) => l.loadCaseId === LC_DECK);
    expect(deck).toHaveLength(4);
    const qDeck = deckTotal / 40;
    for (const load of deck) {
      expect(load.magnitude).toBeCloseTo(-qDeck, 12);
    }
  });

  it("total force equilibrium: sum(q * length) == case total", () => {
    const document = model();
    const result = buildAnalysisLoads(TEST_SUPERSTRUCTURE_DOCUMENT, document);
    const nodeMap = new Map<string, { x: number; y: number; z: number }>();
    for (const node of document.nodes) {
      nodeMap.set(node.entityId, { x: node.x, y: node.y, z: node.z });
    }
    for (const caseId of [LC_STRUCTURAL, LC_DECK]) {
      const loads = result.memberLoads.filter((l) => l.loadCaseId === caseId);
      const memberById = new Map(document.members.map((m) => [m.entityId, m]));
      let total = 0;
      for (const load of loads) {
        const member = memberById.get(load.memberId)!;
        const a = nodeMap.get(member.nodeIId)!;
        const b = nodeMap.get(member.nodeJId)!;
        const length = Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z);
        total += load.magnitude * length;
      }
      const caseEntry = result.loadCases.find((c) => c.caseId === caseId)!;
      expect(total).toBeCloseTo(-(caseEntry.totalKN ?? 0), 9);
    }
  });

  it("never loads support nodes only; no nodal loads are produced", () => {
    const document = model();
    const result = buildAnalysisLoads(TEST_SUPERSTRUCTURE_DOCUMENT, document);
    expect(document.nodalLoads).toHaveLength(0);
    expect(result.memberLoads.length).toBeGreaterThan(0);
  });

  it("declares COMBO-1 as executable", () => {
    const document = model();
    const result = buildAnalysisLoads(TEST_SUPERSTRUCTURE_DOCUMENT, document);
    const combo = result.loadCombinations.find((c) => c.combinationId === COMBO_1);
    expect(combo).toBeDefined();
    expect(combo!.executable).toBe(true);
    expect(combo!.factors).toEqual([
      { caseId: LC_STRUCTURAL, factor: 1.0 },
      { caseId: LC_DECK, factor: 1.0 },
    ]);
  });

  it("declares input-boundary cases as MISSING (never fabricated)", () => {
    const document = model();
    const result = buildAnalysisLoads(TEST_SUPERSTRUCTURE_DOCUMENT, document);
    for (const caseId of ["DL-PAVEMENT", "DL-APPURTENANCE", "LL"]) {
      const entry = result.loadCases.find((c) => c.caseId === caseId);
      expect(entry!.state).toBe("MISSING");
      expect(entry!.totalKN).toBeNull();
    }
  });

  it("leaves loads empty when the girder section is unavailable (derivation fails)", () => {
    const document = model();
    const doc = {
      ...TEST_SUPERSTRUCTURE_DOCUMENT,
      girderConfiguration: {
        ...TEST_SUPERSTRUCTURE_DOCUMENT.girderConfiguration,
        girderSectionModel: {
          depthM: null,
          webThicknessM: null,
          topFlange: null,
          bottomFlange: null,
          areaM2: null,
          unitWeightPerM: null,
        },
      },
    };
    const result = buildAnalysisLoads(doc, document);
    expect(result.memberLoads.filter((l) => l.loadCaseId === LC_STRUCTURAL)).toHaveLength(0);
    const structural = result.loadCases.find((c) => c.caseId === LC_STRUCTURAL);
    expect(structural!.state).toBe("MISSING");
  });
});
