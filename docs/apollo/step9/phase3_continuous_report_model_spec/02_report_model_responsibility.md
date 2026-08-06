# 02 — Report Model Responsibility

> **Authority:** Phase 3-B (specification freeze)
> **Base:** Phase 2 `08_report_data_contract_boundary.md` §1 (12 principles), §2 (R-01..R-12); `reportModel.ts` scaffold; Phase 2.5 H/U decisions.
> **Judge:** Apollo architecture (recorded). **No TypeScript / implementation in this phase.**

## 1. Purpose

Freeze the **responsibility boundary** of the continuous-girder Report Model so that Phase 4 implementation cannot expand it into an analyzer, renderer, or design engine.

## 2. Role: middle layer

`ProjectModel` → `ReportModel` → render (HTML/CSV/PDF).

- The Report Model **receives** the resolved domain model (`ProjectModel` + `apolloBridgeStructureInput`/`.apolloBsdd`/visualization/STL/legacy data) and **projects** it into a report-ready, authorization-tagged, stale-tagged structure.
- Templates/renderers **must not** read `ProjectModel` directly; they read `ReportModel` only (principle 1, `08_report_data_contract_boundary.md` §1).

## 3. Responsibilities (DO)

| # | responsibility | basis |
|---|----------------|-------|
| R-01 | Carry `schemaVersion`, `reportId`, `projectId`, `generatedAt` | Phase 2 `08` R-01; reportModel.ts:61-69 |
| R-02 | Project summary (id/name; designerName → NOT_IMPLEMENTED, O-18) | Phase 2 `08` R-02 |
| R-03 | Bridge summary (bridgeSystem/spanSystem/bridgeLength/width/girderCount/girderDepth/spanCount/supportCount) | Phase 2 `08` R-03; reportModel.ts:175,184-188 |
| R-04/05 | Per-span / per-support arrays (id/length/station/stationStart/stationEnd; role/fixity) | Phase 2 `08` R-04/R-05; layoutValidation.ts:234-251 |
| R-06 | Girder summary incl. continuous segments (offset/count/depth/spacing) | Phase 2 `08` R-06; generateBsdd.ts:467 |
| R-07 | Cross-member summary (count/spacing/station; sway/lateral/stiffener counts) | Phase 2 `08` R-07 |
| R-08 | Geometry summary (solids kind/count/dimensionsM/assumptions; STL manifest) | Phase 2 `08` R-08; bridgeStructureSolids.ts; exportApolloBinaryStl |
| R-09 | Validation summary (complete + issues{code/message/path}; persistence issues) | Phase 2 `08` R-09; validateBridgeStructureInputDraft + layoutValidation.ts |
| R-10 | Authorization summary (NOT_GRANTED; DS-09 cells NOT_AUTHORIZED; gate BLOCKED/PASS) | Phase 2 `08` R-10; reportModel.ts:175-177 |
| R-11 | Warning summary (mandatory watermark; 10 state codes; H-01..H-03 now RESOLVED) | Phase 2 `08` R-11; Phase 2 `07_warning_and_status_message_spec.md` |
| R-12 | Evidence summary (inputRevision/checksum/resultChecksum/quantityChecksum/date/commitSha/refIds) | Phase 2 `08` R-12; reportModel.ts:301-306,344 |
| R-13 | Raw/display separation: `value: number \| null` + `display: string` per field | principle 2; reportModel.ts:85-93 `row()` (`null → "NOT_AVAILABLE"`, no zero-fill) |
| R-14 | Unit mandatory per numeric field (`m`, `kN`, `kN·m`, `kN/m3`, `count`, …) | principle 3 |
| R-15 | Source mandatory for numeric/boolean: `source.path/symbol/schemaVersion` | principle 4 |
| R-16 | Authorization status per value: `NOT_AUTHORIZED \| UNVERIFIED \| ADOPTED` (ADOPTED fail-closed, never newly ADOPTED) | principle 5; BridgeStructureInputPanel.tsx:256 |
| R-17 | Stale mandatory: `stale: boolean` + `staleReason` | principle 6; reportModel.ts:114,304; isBridgeStructureGenerationCurrent |
| R-18 | Missing reason mandatory: `NOT_AVAILABLE` + `missingReason` (no zero-fill / no blank) | principle 7; reportModel.ts:238,243,248,253 |
| R-19 | Summary/detail projection from the **same** Report Model (hierarchy, not field-subset) | principle 8 |
| R-20 | No render coupling: Report Model is HTML/CSS/print/PDF/印刷 unaware | principle 9; `renderReportModelHtml`/`reportModelToJson`/`reportModelToCalculationCsv` are external adapters |
| R-21 | Locale: `ja-JP`/`en` (future); number formatting locale-aware | principle 11 |
| R-22 | Legacy v1.0.0 projects: `schemaVersion` missing → `UNKNOWN`/`LEGACY_DATA` | principle 12 |

## 4. Non-responsibilities (DO NOT)

| # | never the Report Model's job |
|---|------------------------------|
| N-01 | Execute structural analysis (FEM/solver) |
| N-02 | Execute design checks / section-force computation / OK-NG |
| N-03 | Interpolate/derive numeric values not present in inputs (no guessing) |
| N-04 | Issue formal design 成立判定 (design が立った判定) |
| N-05 | Draw/render pages/PDF (page layout, pagination) |
| N-06 | Render HTML/CSS (renderers are external; only carry display strings) |
| N-07 | Generate drawings (CAD/general arrangement / continuous design drawings) |
| N-08 | Generate STL / 3D meshes (only carry STL manifest from visualization layer) |
| N-09 | Generate 3D solids (only carry solids summary + assumptions) |
| N-10 | Mutate `ProjectModel` / bridge design data |
| N-11 | Grant/assert ADOPTED/AUTHORIZED numerics (fail-closed under NOT_SELECTED) |
| N-12 | Resolve STALE (only report it) |
| N-13 | Resolve NOT_AUTHORIZED (only report it) |

## 5. Pseudo-structure (illustrative only — no TS)

```
ReportModel {
  schemaVersion: "x.x.x-development"
  reportId, projectId, locale: "ja-JP" | "en"
  developmentStatus: "UNVERIFIED_DEVELOPMENT_ONLY"
  designOrConstructionUse: "PROHIBITED"
  authorizationStatus: "NOT_GRANTED"
  stale: bool, staleReason?: string
  generatedAt: iso8601, inputRevision, inputChecksum, resultChecksum, quantityChecksum
  warnings[]              // §07 5-line mandatory + 10 state codes
  chapters[]: ReportChapter   // CP-* ids from chapter_payload_matrix
  audit { appCommitSha?, schemaVersions[], calculationReferenceIds[], formalOkNgEmitted: false }
  // R-01..R-22 fields, each with value|display|unit|status|source|authorizationStatus|stale|missingReason
}
```

## 6. Phase 3 implications

- Phase 4 implements `ReportModel` per R-01..R-22 (DO) and explicitly must **not** implement N-01..N-13.
- Any feature that looks like N-01..N-13 is out of Phase 4 Report Model scope (re-scope or defer).
- This responsibility doc is the authoritative gate for `13_phase4_acceptance_criteria.md` §N-responsibility checks.

## 7. Status

- Report Model responsibility: FROZEN.
- HEAD: 47078b8 (no code change).
