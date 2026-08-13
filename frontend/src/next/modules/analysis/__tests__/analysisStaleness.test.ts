import { describe, expect, it } from "vitest";
import { createEmptyAnalysisDocument } from "../analysisDocument";
import {
  analysisDocumentStatus,
  evaluateAnalysisResultStaleness,
  type CurrentUpstreamContext,
} from "../analysisStaleness";
import type { AnalysisDocument, AnalysisSourceReferences } from "../analysisDocumentTypes";

function refs(loadFingerprint = "f-load"): AnalysisSourceReferences {
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
    loadFingerprint,
    solverSettingsFingerprint: "f-solver",
  };
}

function makeDoc(): AnalysisDocument {
  return createEmptyAnalysisDocument({
    projectId: "p-1",
    createdBy: "test",
    sourceReferences: refs(),
  });
}

describe("analysisStaleness (Phase 7-01 D FROZEN / WP-I)", () => {
  it("returns VALID when all three gates pass", () => {
    const doc = makeDoc();
    const context: CurrentUpstreamContext = {
      sourceReferences: refs(),
      analysisDocument: doc,
      resultBindingChecksum: doc.modelChecksum,
      if3Status: "VALID",
    };
    const result = evaluateAnalysisResultStaleness(context);
    expect(result.status).toBe("VALID");
    expect(result.gate1).toBe("PASS");
    expect(result.gate2).toBe("PASS");
    expect(result.gate3).toBe("PASS");
  });

  it("Gate1: upstream fingerprint change -> STALE", () => {
    const doc = makeDoc();
    const context: CurrentUpstreamContext = {
      sourceReferences: refs("f-load-changed"),
      analysisDocument: doc,
      resultBindingChecksum: doc.modelChecksum,
      if3Status: "VALID",
    };
    const result = evaluateAnalysisResultStaleness(context);
    expect(result.status).toBe("STALE");
    expect(result.gate1).toBe("STALE");
  });

  it("Gate2: result binding checksum mismatch -> STALE", () => {
    const doc = makeDoc();
    const context: CurrentUpstreamContext = {
      sourceReferences: refs(),
      analysisDocument: doc,
      resultBindingChecksum: "b".repeat(64),
      if3Status: "VALID",
    };
    const result = evaluateAnalysisResultStaleness(context);
    expect(result.status).toBe("STALE");
    expect(result.gate2).toBe("STALE");
  });

  it("Gate3: IF3 STALE -> STALE; INVALID -> INVALID", () => {
    const doc = makeDoc();
    const stale = evaluateAnalysisResultStaleness({
      sourceReferences: refs(),
      analysisDocument: doc,
      resultBindingChecksum: doc.modelChecksum,
      if3Status: "STALE",
    });
    expect(stale.status).toBe("STALE");
    const invalid = evaluateAnalysisResultStaleness({
      sourceReferences: refs(),
      analysisDocument: doc,
      resultBindingChecksum: doc.modelChecksum,
      if3Status: "INVALID",
    });
    expect(invalid.status).toBe("INVALID");
  });

  it("returns NOT_AVAILABLE when no result binding exists", () => {
    const doc = makeDoc();
    const result = evaluateAnalysisResultStaleness({
      sourceReferences: refs(),
      analysisDocument: doc,
      resultBindingChecksum: null,
      if3Status: null,
    });
    expect(result.status).toBe("NOT_AVAILABLE");
  });

  it("analysisDocumentStatus detects regeneration need", () => {
    const doc = makeDoc();
    expect(analysisDocumentStatus(doc, refs())).toBe("VALIDATED");
    expect(analysisDocumentStatus(doc, refs("changed"))).toBe("STALE");
  });
});

describe("analysisModuleData (WP-I autosave integration)", () => {
  it("round-trips module data through persistence", async () => {
    const { buildAnalysisModuleData, serializeAnalysisModuleDataForPersistence, deserializeAnalysisModuleDataFromPersistence } = await import("../analysisModuleData");
    const doc = makeDoc();
    const data = buildAnalysisModuleData(doc);
    const serialized = serializeAnalysisModuleDataForPersistence(data);
    const restored = deserializeAnalysisModuleDataFromPersistence(serialized);
    expect(restored.ok).toBe(true);
    if (restored.ok) {
      expect(restored.data.analysisDocument!.modelChecksum).toBe(doc.modelChecksum);
    }
  });

  it("returns empty data for null document", async () => {
    const { buildAnalysisModuleData } = await import("../analysisModuleData");
    expect(buildAnalysisModuleData(null)).toEqual({});
  });
});
