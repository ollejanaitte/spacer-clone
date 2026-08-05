# 02 — H-01 Architect Decision: phase1ScopeGuard (Phase1SpanSystem.CONTINUOUS) vs BridgeSystem.CONTINUOUS

> **Authority:** Phase 2.5-B (architect decision)
> **Carried from:** Phase 1 `08_gap_analysis.md` G-12 → `03_report_chapter_structure.md` IMPL-01/02; Phase 2 `01_phase1_input_review.md` §10.
> **Judge:** Apollo architecture (recorded).

## 1. Item

**H-01**: `phase1ScopeGuard` (AP-00 `Phase1SpanSystem.CONTINUOUS`) vs implemented `BridgeSystem.CONTINUOUS` — naming/duplicate-concept conflict threatening Phase 3 chapter CP-06 (橋梁形式) and CP-07 (径間構成).

## 2. Evidence

| # | Source | Statement |
|---|--------|-----------|
| E-01 | `phase1ScopeGuard.ts:60-61` | `input.spanSystem === Phase1SpanSystem.CONTINUOUS` → issue `AP00_SCOPE_CONTINUOUS` → contributes to `OUT_OF_SCOPE`. |
| E-02 | `phase1ScopeGuard.ts:98-121` | `classifyPhase1Scope`/`validatePhase1Scope` operate on `Phase1BridgeScopeInput`; test-only scope classifier (never called in `ApolloPhase1Shell`). |
| E-03 | grep `Phase1SpanSystem` across `frontend/src/apollo` | References only in `phase1ScopeGuard.ts`, `types.ts:67-92`, `__tests__/phase1ScopeGuard.test.ts`, `testing/phase1Fixtures.ts:53`, `__tests__/testingHelpers.test.ts:32`. **No runtime caller.** |
| E-04 | `continuous_girder/README.md` §7 | "phase1ScopeGuard の CONTINUOUS は C1 まで OUT_OF_SCOPE のまま維持" — explicit scope statement. |
| E-05 | `layoutValidation.ts:234-251` | `input.bridgeSystem === BridgeSystem.CONTINUOUS` → 2–5 span count gate + pier/support validation. **Runtime** continuous gate. |
| E-06 | `layoutValidation.ts:256-278` | `resolveEffectiveLayout` CONTINUOUS branch derives spans/supports (spanLength NOT required for continuous). |
| E-07 | `generateBsdd.ts:467` | `spanSystem: input.bridgeSystem === BridgeSystem.CONTINUOUS ? "continuous" : "simple"` — production BSDD emits continuous only via `BridgeSystem`. |
| E-08 | `reportModel.ts:175` | CH-DESIGN-COND row `bridgeSystem` sourced from `draft.bridgeSystem` (`BridgeSystem`). |
| E-09 | Phase 2 `03_report_chapter_structure.md` §3/§5 | `Phase1SpanSystem` not modeled in report; `BridgeSystem` is the report source. |

## 3. Analysis

- `Phase1SpanSystem.CONTINUOUS` is the **AP-00 scope-classification enum** for the Phase-1-narrow-archetype gate (simple, single, straight, non-composite, equal-depth, 4–6 girders, skew=90). Under AP-00 it is `OUT_OF_SCOPE` until continuous is implemented (C1). It is **test-only** and never reached on the production runtime path.
- `BridgeSystem.CONTINUOUS` is the **production bridge-system enum** (2–5 spans, pier/roller supports), gated by `layoutValidation.ts` and emitted through `generateBsdd.ts` into BSDD `phase1ScopeAssertion.spanSystem`. This is the **implemented continuous girder**.
- These describe the **same concept** (continuous multi-span girder) at **different layers**: legacy scope classifier vs. production layout/system enum. The naming overlap is cosmetic.
- CP-06 (橋梁形式) and CP-07 (径間構成) source is `draft.bridgeSystem + BridgeLayoutSpan/Support` — i.e. the **production** enum, not the AP-00 classifier. No data-model conflict.
- The continuous girder vertical slice (`docs/apollo/continuous_girder/`) implements CONTINUOUS at the production layer while keeping `phase1ScopeGuard`'s CONTINUOUS `OUT_OF_SCOPE` — exactly as AP-00 intends (Phase 1 = narrow archetype only). They are not contradictory.

## 4. Decision

**VERDICT: RESOLVED — ADOPTED**

- `BridgeSystem.CONTINUOUS` is the canonical runtime/Report-Model gate. `Phase1SpanSystem.CONTINUOUS` remains the legacy AP-00 scope classifier (test-only; OUT_OF_SCOPE for Phase 1 narrow flow).
- No code change required. No runtime conflict. Report Model uses `BridgeSystem` (R-03 `bridgeSystem: "CONTINUOUS"`; CP-06 basis `reportModel.ts:175` + `generateBsdd.ts:467`).
- **Follow-up (Phase 3, cosmetic):** unify vocabulary in Phase 3 Report Model implementation — treat `Phase1SpanSystem.CONTINUOUS` as legacy/compat only; Phase 3 must not depend on it. Tracked as `DEC-PHA-0001` in `decision_register.csv`.

## 5. Phase 3 impact

- Satisfies Phase 3 GO condition "H-01/H-02/H-03 architect 解決済み" for H-01.
- Does **not** unblock numeric authorization; CP-06/CP-07 remain `NOT_AUTHORIZED`/non-numeric. Numeric gate unchanged (`NOT_GRANTED`/`PROHIBITED`).

## 6. Status

- H-01: RESOLVED/ADOPTED.
- HEAD: 96ea018 → 10e9ab7 (no code change).
