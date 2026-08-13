import { describe, expect, it } from "vitest";
import { createEmptyAnalysisDocument, finalizeAnalysisDocument, regenerateAnalysisDocument, analysisNeedsRegeneration } from "../analysisDocument";
import { computeAnalysisContentChecksum, computeAnalysisModelChecksum } from "../analysisChecksum";
import type { AnalysisDocument, AnalysisSourceReferences, UuidString } from "../analysisDocumentTypes";
import { deriveAnalysisEntityId } from "../analysisId";

function emptyRefs(): AnalysisSourceReferences {
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

function makeDoc(): AnalysisDocument {
  return createEmptyAnalysisDocument({
    projectId: "p-1",
    createdBy: "test",
    sourceReferences: emptyRefs(),
  });
}

describe("analysisDocument (Phase 7-01 A FROZEN)", () => {
  it("creates a valid empty envelope", () => {
    const doc = makeDoc();
    expect(doc.schemaId).toBe("spacer.contracts.analysis-document");
    expect(doc.schemaVersion).toBe("1.0.0");
    expect(doc.documentKind).toBe("analysis-document");
    expect(doc.revisionId).toBe(1);
    expect(doc.validation.ok).toBe(true);
    expect(doc.modelChecksum).toMatch(/^[0-9a-f]{64}$/);
    expect(doc.contentChecksum).toMatch(/^[0-9a-f]{64}$/);
    expect(doc.coordinateContext.axisConvention).toBe("x-along/y-transverse/z-up");
  });

  it("modelChecksum and contentChecksum are equal in scope (binding source of truth)", () => {
    const doc = makeDoc();
    expect(doc.modelChecksum).toBe(doc.contentChecksum);
    expect(computeAnalysisModelChecksum(doc)).toBe(computeAnalysisContentChecksum(doc));
  });

  it("checksum excludes documentId / timestamps / status / revision (Sol review #1/#2)", () => {
    const doc = makeDoc();
    const checksumBase = computeAnalysisModelChecksum(doc);
    const withOtherId = finalizeAnalysisDocument({
      ...doc,
      documentId: "99999999-9999-4999-8999-999999999999" as UuidString,
      timestamps: { updatedAt: "2099-01-01T00:00:00.000Z", derivedAt: null },
      status: "VALIDATED",
      revisionId: 99,
    });
    expect(computeAnalysisModelChecksum(withOtherId)).toBe(checksumBase);
  });

  it("checksum changes when the model content changes", () => {
    const doc = makeDoc();
    const base = computeAnalysisModelChecksum(doc);
    const nodeId = deriveAnalysisEntityId("node", "supportPoint:AR2:AG1");
    const withNode = finalizeAnalysisDocument({
      ...doc,
      nodes: [
        {
          entityId: nodeId,
          sourceEntityId: "supportPoint:AR2:AG1",
          sourceKind: "supportPoint",
          x: 0,
          y: 0,
          z: 0,
          stationM: 0,
          offsetM: 0,
        },
      ],
    });
    expect(computeAnalysisModelChecksum(withNode)).not.toBe(base);
  });

  it("regeneration bumps revision and marks result stale", () => {
    const doc = makeDoc();
    const regen = regenerateAnalysisDocument(doc, "upstream changed");
    expect(regen.revisionId).toBe(2);
    expect(regen.analysisStatus).toBe("STALE");
    expect(regen.resultReferences).toHaveLength(0);
    expect(regen.resultDigest).toBeNull();
    expect(regen.validation.ok).toBe(true);
  });

  it("deterministic scope: same upstream -> same model checksum", () => {
    const docA = makeDoc();
    const docB = makeDoc();
    expect(computeAnalysisModelChecksum(docA)).toBe(computeAnalysisModelChecksum(docB));
  });

  it("analysisNeedsRegeneration detects upstream fingerprint changes", () => {
    const doc = makeDoc();
    expect(analysisNeedsRegeneration(doc, emptyRefs())).toBe(false);
    const changed = { ...emptyRefs(), loadFingerprint: "f-load-changed" };
    expect(analysisNeedsRegeneration(doc, changed)).toBe(true);
  });
});
