import { describe, expect, it } from "vitest";
import { createEmptyAnalysisDocument } from "../analysisDocument";
import {
  deserializeAnalysisDocumentFromPersistence,
  serializeAnalysisDocumentForPersistence,
} from "../analysisPersistence";

describe("analysisPersistence (Phase 7-01 D FROZEN / WP-A)", () => {
  it("round-trips a valid document", () => {
    const doc = createEmptyAnalysisDocument({
      projectId: "p-1",
      createdBy: "test",
      sourceReferences: {
        bridgeLayout: { bridgeId: "B-1", documentVersion: "1", layoutFingerprint: "f" },
        superstructure: null,
        substructure: null,
        loadFingerprint: null,
        solverSettingsFingerprint: null,
      },
    });
    const serialized = serializeAnalysisDocumentForPersistence(doc);
    const result = deserializeAnalysisDocumentFromPersistence(serialized);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.document.documentId).toBe(doc.documentId);
      expect(result.document.modelChecksum).toBe(doc.modelChecksum);
    }
  });

  it("rejects malformed / unsupported data (fail-closed)", () => {
    expect(deserializeAnalysisDocumentFromPersistence(null).ok).toBe(false);
    expect(deserializeAnalysisDocumentFromPersistence("x").ok).toBe(false);
    expect(deserializeAnalysisDocumentFromPersistence({ schemaVersion: "9.9.9" }).ok).toBe(false);
    expect(
      deserializeAnalysisDocumentFromPersistence({ schemaVersion: "1.0.0", schemaId: "wrong" }).ok,
    ).toBe(false);
  });
});
