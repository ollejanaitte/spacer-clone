# 09 — Human Decision Register (Phase 2.5)

> **Authority:** Phase 2.5-I (consolidated architect decisions)
> **Base:** `blocker_matrix.csv`, `decision_register.csv`, H-01..H-03 & U-03 decision docs.
> **Judge:** Apollo architecture (recorded).

## 1. Purpose

Consolidate the Phase 2.5 architect decisions into a machine-readable decision register and blocker matrix, and formally transition the `human_confirmation_status` of H-01/H-02/H-03 from `UNRESOLVED` (Phase 2) to `RESOLVED` (Phase 2.5).

## 2. Human-confirmation status transition

Phase 2 (`09_traceability_and_evidence_spec.md` §2/§4, `08_report_data_contract_boundary.md` §R-11) recorded H-01..H-03 as `UNRESOLVED` and emitted state code `NA-HCR / HUMAN_CONFIRMATION_REQUIRED` (CP-23). Phase 2.5 resolves them on behalf of the architecture team (no implementation).

| item | Phase 2 | Phase 2.5 |
|------|--------|-----------|
| H-01 | UNRESOLVED | RESOLVED/ADOPTED |
| H-02 | UNRESOLVED | RESOLVED/ADOPTED |
| H-03 | UNRESOLVED | RESOLVED/ADOPTED |
| U-03 | open investigation | VERDICT=B (absorbable in Phase 3 spec) |

**Effect on CP-23 (未実装項目):** H-01/H-02/H-03 move from "HUMAN_CONFIRMATION_REQUIRED" to "RESOLVED — architect decided (see DEC-PHA-0001..0003)". CP-23 still ALWAYS emits the list (reportModel.ts:259-261 pattern retained), now including the resolved entries with their decision refs. State code `NA-HCR` is no longer active for these three; `NA-CONFLICT` not triggered (no conflicting evidence remains).

## 3. Decision registry (summary)

| ID | Topic | Decision | Status |
|----|-------|----------|--------|
| DEC-PHA-0001 | H-01 naming conflict | ADOPTED — BridgeSystem.CONTINUOUS canonical; Phase1SpanSystem.CONTINUOUS legacy/test-only | RESOLVED |
| DEC-PHA-0002 | H-02 migration | ADOPTED — AP-02 lifecycle Rejected; sidecar shim retained (out of AP-02 scope) | RESOLVED |
| DEC-PHA-0003 | H-03 unsupportedScope | ADOPTED — continuous design drawings PROHIBITED until Phase 6 | RESOLVED |
| DEC-PHA-0004 | U-03 spanLength gate | VERDICT=B — CP-13 NOT_AVAILABLE-for-CONTINUOUS absorbed in spec; refactor deferred to Phase 3 | RESOLVED |
| DEC-PHA-0005 | CH/CP canonicalization | CP-* canonical report IDs; CH-* dev scaffold | RESOLVED |
| DEC-PHA-0006 | PROHIBITED reconfirmation | O-19..O-30 PROHIBITED; CP-08/15/16/30-34 FORBIDDEN; invariants reaffirmed | RESOLVED |

Full machine-readable forms: `decision_register.csv`, `blocker_matrix.csv`.

## 4. Phase 3 handoff of decisions

- All six DEC-PHA decisions are **RESOLVED**; none is HUMAN_DECISION_REQUIRED (the apparent conflicts were layer/scope distinctions, resolved by investigation).
- Phase 3 implementation must honor DEC-PHA-0001..0006 (refs in `10_phase3_handoff.md` §5).
- No decision opens a numeric-authorization path; all preserve `NOT_AUTHORIZED`/`NOT_GRANTED`/`PROHIBITED`/`NOT_AVAILABLE`.

## 5. Status

- Decision register: COMPLETE (6 decisions).
- Blocker matrix: COMPLETE (4 blockers: H-01/H-02/H-03, U-03).
- HEAD: d97a35b → (next) (no code change).
