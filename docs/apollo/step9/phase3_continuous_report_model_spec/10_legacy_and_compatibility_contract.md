# 10 — Legacy & Compatibility Contract

> **Authority:** Phase 3-J (specification freeze)
> **Base:** Phase 2 `08_report_data_contract_boundary.md` §Principle 12 (legacy compat), `05_detailed_report_spec.md` D7 (CP-21 persistence), `chapter_matrix.csv` (schemaVersion column), `generateBsdd.ts:548-556` (sidecar migration), Phase 2.5 `03_h02_architect_decision.md` (DEC-PHA-0002); Phase 2 `01_phase1_input_review.md` (simple-single regression).
> **Judge:** Apollo architecture. No implementation.

## 1. Purpose

Define how the Report Model detects, surfaces, and (minimally) normalizes **legacy** bridge-structure data without mislabeling it as current, while preserving original data integrity and the straight simple-span regression baseline.

## 2. Legacy sources (surveyed)

| legacy source | detector | current behavior | report-model role |
|---------------|----------|------------------|-------------------|
| v1.0.0 input (no schemaVersion) | `apolloBridgeStructureInput.schemaVersion === null/undefined` | `generateBsdd.ts:553` forward-fills to 1.1.0-development defaults | carry `schemaVersion=UNKNOWN/LEGACY_DATA` + tag; do not claim current |
| partial/old sidecar shape | `parseBridgeStructureInputDraft` returns `null` or partial | fallback `createEmptyBridgeStructureInputDraft()` | emit STALE_OR_UNGENERATED + LEGACY_DATA |
| old viewer/STL manifest fields | STL manifest schema version | carry `stl.sourceUnit`/`exportUnit`/legacy flags | tag `legacyStatus`; do not reinterpret |
| legacy CH-* references in code | `REPORT_CHAPTER_REGISTRY` (reportModel.ts:25-42) | dev scaffold | Report Model emits **CP-***, CH-* = deprecated alias only |
| old loadCases shape | `project.loadCases?.length` | count only (CP-14) | emit count + NOT_IMPLEMENTED placeholder |
| old save/reload (no generatedAt) | `draft.generatedAt === null` | `isBridgeStructureGenerationCurrent` false | STALE + `STALE_OR_UNGENERATED` |

## 3. Legacy detection & transformation responsibility

- **Detection lives in the data layer** (`generateBsdd.ts:548-556`, `parseBridgeStructureInputDraft`), NOT in the Report Model. The Report Model receives an already-normalized `ApolloBridgeStructureInputDraft` and only **tags** legacy provenance.
- **Transformation (forward-fill) is the minimal sidecar shim** (DEC-PHA-0002): fills nullable input fields to 1.1.0-development defaults. It does **not** constitute the rejected AP-02 lifecycle migration framework.
- The Report Model must **never** re-run migration logic or reinterpret old numeric values as new.

## 4. Report Model legacy display contract

| legacy condition | Report Model emits | code | basis |
|------------------|--------------------|------|-------|
| schemaVersion missing | `schemaVersion: "UNKNOWN"` + `legacyStatus: "LEGACY_DATA"` | LEGACY_DATA | `08` Principle 12; generateBsdd.ts:553 |
| generatedAt missing | `sourceRevision: "STALE_OR_UNGENERATED"` + `stale: true` | STALE + MISSING | reportModel.ts:116; generateBsdd.ts:558-561 |
| partial sidecar | fallback empty draft + warnings | NOT_AVAILABLE + LEGACY_DATA | createEmptyBridgeStructureInputDraft |
| unknown source field | persistenceIssues row | INVALID | validateBridgeStructureInputDraft (unknown-field rejection) |
| old CH-* id in source | (not carried to output) | CP-* canonical | `05_chapter_payload_contract.md` §2 |

## 5. CH-* deprecated alias policy (Phase 4)

- **Canonical chapter IDs = CP-*** (`chapter_matrix.csv`: CP-01..25 + CP-30..34). The Report Model must emit `chapter_id` ∈ CP-*.
- **CH-*** (`reportModel.ts:25-42` `REPORT_CHAPTER_REGISTRY`, 16 entries) is the **deprecated dev scaffold**. Phase 4 migrates the scaffold to CP-*; CH-* must NOT appear in report output (only as an internal backward-trace alias).
- CH→CP split table is frozen in `05_chapter_payload_contract.md` §2. Any mismatch found during Phase 4 implementation → `CONFLICTING_EVIDENCE` recorded in Phase 3 side, not silently rewritten.

## 6. Original-data non-destruction & round-trip

- Report Model generation reads `ProjectModel` **read-only**; produces a derived `ReportModel` (R-019 in `02_report_model_responsibility.md`: "Mutate ProjectModel/design data" is a non-responsibility).
- Re-saving the report must **not** mutate `ProjectModel.apolloBridgeStructureInput` / `apolloBsdd`.
- Round-trip: report output is regenerated from current `ProjectModel` + checksums; report JSON is an **audit artifact**, not a reloaded input.

## 7. Fail-closed & regression principles

| principle | rule |
|-----------|------|
| P-01 | Legacy must not be labeled current/UNVERIFIED-as-fresh. |
| P-02 | No undocumented implicit conversion (every legacy transform has evidence + tag). |
| P-03 | Conversion failure → INVALID / HUMAN_CONFIRMATION_REQUIRED (reportModel.ts R-09), not AVAILABLE. |
| P-04 | Original straight simple-span (SIMPLE_SINGLE) regression preserved (Phase 1 `01_phase1_input_review.md`; continuous_girder/README.md §6 backward compat). |
| P-05 | CP-13 CONTINUOUS remains NOT_AVAILABLE (U-03 verdict B); legacy must not turn it into an emitted numeric. |

## 8. Phase 4 obligations

- Emit `schemaVersion` + `legacyStatus` per R-22; tag UNKNOWN/LEGACY_DATA.
- Emit CP-* chapter IDs only; CH-* as optional deprecated alias map (not in output).
- Carry `stale`/`persistenceIssues` for legacy/partial inputs without mutating originals.
- Retain straight simple-span regression tests; add continuous save/reload regression (G-07 scope per Phase 2 `11_phase3_handoff.md` §7).

## 9. Status

- Legacy & compatibility contract: FROZEN.
- HEAD: 702ea2d (no code change).
