# 07 — PROHIBITED Output Reconfirmation

> **Authority:** Phase 2.5-H (spec reconciliation)
> **Base:** Phase 2 `06_output_permission_matrix.md`, `output_permission_matrix.csv`, `03_report_chapter_structure.md` §4 (FORBIDDEN/D-class), `reportModel.ts:206-254` (NOT_AVAILABLE rows), `08_report_data_contract_boundary.md` §R-10.
> **Judge:** Apollo architecture (recorded).

## 1. Purpose

Reconfirm the exhaustive set of PROHIBITED / FORBIDDEN outputs that the Phase 3 Report Model must **never emit**, to guarantee the non-numeric dev-only boundary is preserved across H-01/H-02/H-03 resolution and U-03 verdict B.

## 2. PROHIBITED output items (O-19..O-30)

From `output_permission_matrix.md` §1/§2 (classification `PROHIBITED` = "出力禁止 — do not emit"):

| item | 項目 | basis |
|------|------|-------|
| O-19 | 解析結果 (reactions/shear/moment/deflection) | CP-30..34 NOT_AVAILABLE; U-01 |
| O-20 | 断面力 | DS-09 cells |
| O-21 | 反力 | CP-30 NOT_AVAILABLE; reportModel.ts:238 |
| O-22 | 応力度 | DS-09 |
| O-23 | 許容値 | DS-09 |
| O-24 | 照査比 | DS-09 |
| O-25 | 合否判定 | DS-09 |
| O-26 | 疲労照査 | DS-09 fatigue OUT_OF_SCOPE |
| O-27 | たわみ | CP-33 NOT_AVAILABLE; reportModel.ts:253 |
| O-30 | 設計成立判定 | DS-09 (no check engine); reportModel.ts:259-261 CH-DEMAND |

**O-28** (キャンバー camber) is NOT_IMPLEMENTED (not modeled) — distinct from PROHIBITED; emit as NOT_IMPLEMENTED per CP-23.

## 3. FORBIDDEN chapters (chapter_matrix.csv)

| chapter | classification | behavior | basis |
|---------|----------------|----------|-------|
| CP-08 | FORBIDDEN (A) | NOT_IMPLEMENTED / always NOT_AVAILABLE | curve/skew `unsupportedScope` (artifactBundle.ts:235) — H-03 |
| CP-15 | FORBIDDEN (D-future) | NOT_IMPLEMENTED | load combos; reportModel.ts:222-223 count-only |
| CP-16 | FORBIDDEN (D-future) | DEV_NOTE only | simple-span idealization (appurtenanceHaunchAnalysisAdapter.ts:385) |
| CP-30..34 | FORBIDDEN (D-future) | NOT_AVAILABLE / NOT_AUTHORIZED | reportModel.ts:238/243/248/253/259-261 CH-REACTIONS..DEMAND |

## 4. ReportModel invariants (code-level reconfirmation)

`reportModel.ts` already enforces (no change):
- `reportModel.ts:71-72` — `authorizationStatus = "NOT_GRANTED"`, `designOrConstructionUse = "PROHIBITED"`.
- `reportModel.ts:73` — `developmentLabel = "UNVERIFIED_DEVELOPMENT_ONLY"`.
- `reportModel.ts:175-177` — `CH-DESIGN-COND`: `numericAuthorization = "NOT_GRANTED"` (NOT_AUTHORIZED).
- `reportModel.ts:238,243,248,253` — CP-30..33 (reactions/shear/moment/deflection) = `NOT_AVAILABLE` ("0埋めしない").
- `reportModel.ts:259-261` — CH-DEMAND: `formalOkNg = "NOT_EMITTED"` (NOT_AUTHORIZED).
- `reportModel.ts:354-372` — `reportModelToCalculationCsv`: NOT_AVAILABLE placeholders, no zero-fill (reportModel.ts:357).
- `reportModel.ts:95-107` — `assertDevelopmentReportExportable` (dev-only, stale-reject); `assertFormalReportRejected` (formal PDF always rejected, fail-closed).

## 5. Authorization/status codes reconfirmed (not to be emitted as ADOPTED/AUTHORIZED)

- `NOT_AUTHORIZED` — numeric design checks (DS-09 cells) never granted; reportModel.ts:175-177.
- `NOT_GRANTED` — formal numeric design authorization never granted (final_report.txt invariant).
- `PROHIBITED` — design/construction use; continuous design drawings (H-03).
- `NOT_AVAILABLE` / `NOT_IMPLEMENTED` — missing/phase-not-yet gates.
- `UNVERIFIED` / `UNADOPTED` / `UNKNOWN` / `STALE` — input/dev states.
- `ADOPTED` / `AUTHORIZED` — **must never be newly emitted** for continuous numerics (Phase 2 README §6; BridgeStructureInputPanel.tsx:256 fail-closed under NOT_SELECTED).

## 6. Cross-check against H/U resolutions

| gate | resolution | PROHIBITED impact |
|------|-----------|-------------------|
| H-01 (BridgeSystem.CONTINUOUS canonical) | ADOPTED | CP-06 emits `bridgeSystem` non-numeric; no numerics introduced. |
| H-02 (AP-02 Rejected; sidecar shim retained) | ADOPTED | schemaVersion forward-fill is non-numeric; no ADOPTED numerics. |
| H-03 (continuous design drawings PROHIBITED) | ADOPTED | CP-14 = STANDARD_SECTION dev ref only; no design drawings. |
| U-03 (spanLength gate, verdict B) | B | CP-13 stays NOT_AVAILABLE for CONTINUOUS; refactor deferred; no numerics emitted. |

**Reconciliation: all four resolutions preserve or tighten the PROHIBITED boundary. No PROHIBITED item becomes emit-able.**

## 7. Phase 3 obligations

- Phase 3 Report Model must assert: no O-19..O-30 value ever appears in output; no CP-15/CP-16/CP-30..34 data emitted (NOT_AVAILABLE/NOT_IMPLEMENTED/DEV_NOTE only); `assertFormalReportRejected` / `assertDevelopmentReportExportable` retained; zero-fill forbidden; `ADOPTED` never newly emitted.
- Regression: add CONTINUOUS-path test (G-07) asserting CH-SECTION/CP-13 = NOT_AVAILABLE and CP-30..34 = NOT_AVAILABLE under U-03 verdict B.

## 8. Status

- PROHIBITED / FORBIDDEN reconfirmed: O-19..O-30 + CP-08/CP-15/CP-16/CP-30..34.
- HEAD: febec8b → (next) (no code change).
