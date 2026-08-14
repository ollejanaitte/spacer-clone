/**
 * Contract fixture: a real FrameAnalysisResultResource produced by
 * backend/engine/if3_normalizer.py (from a linear-static AnalysisDocument run).
 * This is the canonical row shape: {rowId, entityKind, entityId(UUID),
 * quantity, unit, values(flat), loadContextId}.
 */

export const REAL_LC1_LOAD_CONTEXT_ID = "79a0e842-7de4-5bfd-999f-1fe8038084e3";

/** Raw fixture (contract-shaped). Consumers cast to the typed contract. */
export const REAL_IF3_RESULT_RAW = {
  schemaId: "spacer.contracts.frame-analysis-result-resource",
  schemaVersion: "0.1.0",
  resultId: "99999999-9999-4999-8999-999999999999",
  analysisRunId: "88888888-8888-4888-8888-888888888888",
  sourceDocumentId: "11111111-1111-4111-8111-111111111111",
  sourceDocumentVersion: 1,
  sourceContentChecksum: { algorithm: "sha256", hexDigest: "a".repeat(64) },
  status: "SUCCEEDED",
  generatedAt: "2026-08-14T00:00:00.000Z",
  solverName: "scipy_sparse",
  solverVersion: "0.3.0",
  analysisSettingsChecksum: { algorithm: "sha256", hexDigest: "c".repeat(64) },
  loadContext: {
    entries: [
      { kind: "loadCase", id: REAL_LC1_LOAD_CONTEXT_ID, label: "LC1" },
    ],
  },
  provenance: {
    createdAt: "2026-08-14T00:00:00.000Z",
    createdBy: { actorId: "backend-engine", actorType: "system" },
    producer: { toolId: "spacer-backend", toolVersion: "1.0.0" },
  },
  diagnostics: [],
  resultKinds: ["nodeDisplacement", "supportReaction", "memberForce"],
  payload: {
    nodeDisplacement: {
      schemaVersion: "0.1.0",
      rows: [
        { rowId: "35dfeea1-b57c-5e43-90ee-17f2e21f381e", entityKind: "node", entityId: "0011bfd9-b117-503b-8c62-6e3a3a69086f", quantity: "displacement", unit: "m/rad", values: { ux: 0.0, uy: 0.0, uz: 0.0, rx: 0.0, ry: 0.0, rz: 0.0 }, loadContextId: REAL_LC1_LOAD_CONTEXT_ID },
        { rowId: "aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa", entityKind: "node", entityId: "22222222-2222-4222-8222-222222222222", quantity: "displacement", unit: "m/rad", values: { ux: 0.0, uy: 0.0, uz: -0.5, rx: 0.0, ry: 0.0, rz: 0.0 }, loadContextId: REAL_LC1_LOAD_CONTEXT_ID },
      ],
    },
    supportReaction: {
      schemaVersion: "0.1.0",
      rows: [
        { rowId: "5cf86acd-b80e-580e-af8f-55ccd0fe033e", entityKind: "support", entityId: "6a27c03d-ec97-5476-a605-f5b61b64809b", quantity: "reaction", unit: "kN/kN_m", values: { fx: 0.0, fy: 0.0, fz: 125.0, mx: 0.0, my: -40.0, mz: 0.0 }, loadContextId: REAL_LC1_LOAD_CONTEXT_ID },
      ],
    },
    memberForce: {
      schemaVersion: "0.1.0",
      rows: [
        { rowId: "e27db942-70b1-5c73-8e8f-02a22622bcdb", entityKind: "member", entityId: "d059b760-59aa-5442-98f2-dc81d5bd486a", quantity: "memberEndForce", unit: "kN/kN_m", values: { "i.fx": -125.0, "i.fy": 0.0, "i.fz": 10.0, "i.mx": 0.0, "i.my": -40.0, "i.mz": 0.0, "j.fx": 125.0, "j.fy": 0.0, "j.fz": -10.0, "j.mx": 0.0, "j.my": 0.0, "j.mz": 0.0 }, loadContextId: REAL_LC1_LOAD_CONTEXT_ID },
      ],
    },
  },
  resultChecksum: { algorithm: "sha256", hexDigest: "b".repeat(64) },
};
