# 05 — U-03 Investigation: spanLength gate in CH-SECTION

> **Authority:** Phase 2.5-E (investigation) → verdict A/B/C/D.
> **Carried from:** Phase 1 `08_gap_analysis.md` U-03; Phase 2 `03_report_chapter_structure.md` §5; `08_report_data_contract_boundary.md` §4 (CP-13); `11_phase3_handoff.md` §6/§9.
> **Judge:** Apollo architecture (recorded).

## 1. Item

**U-03**: `buildReportModel` (reportModel.ts) gates `computeGirderSectionProperties` on `draft.spanLength !== null && … && draft.crossBeamSpacing !== null` (reportModel.ts:119-148). For `BridgeSystem.CONTINUOUS`, `draft.spanLength` is `null` (continuous derives per-span from `spans[].length`, layoutValidation.ts:256-278), so `section = null` and CH-SECTION → `NOT_AVAILABLE` ("断面入力不完全", reportModel.ts:216). Should this gate be fixed before Phase 3, or absorbed in the Phase 3 spec?

## 2. Evidence

| # | Source | Statement |
|---|--------|-----------|
| E-01 | `reportModel.ts:119-148` | `section = (draft.spanLength !== null && draft.bridgeLength !== null && … draft.crossBeamSpacing !== null) ? computeGirderSectionProperties({spanLength, bridgeLength, …}) : null` — 13-field null gate. |
| E-02 | `reportModel.ts:206-216` | CH-SECTION rows: `section ? [7 rows UNVERIFIED] : [row("sectionProperties", null, "", "NOT_AVAILABLE", "断面入力不完全")]`. |
| E-03 | `reportModel.ts:85-93` | `row()` helper: `null/undefined/"" → "NOT_AVAILABLE"`; zero-fill forbidden (reportModel.ts:357 comment). |
| E-04 | `sectionProperties.ts:48-108` | `computeGirderSectionProperties(input: ResolvedBridgeStructureInput)` — input type declares `spanLength` (line 8) but the computation uses it for **nothing**. The only length-dependent quantity is `steelVolumePerGirder: totalArea * input.bridgeLength` (line 107). `spanLength` is **consumed by the gate, not by the computation**. |
| E-05 | `layoutValidation.ts:256-278` | `resolveEffectiveLayout`: SIMPLE_SINGLE requires `spanLength`; CONTINUOUS derives spans/supports from `input.spans` (spanLength NOT required). |
| E-06 | Phase 2 `chapter_matrix.csv` CP-13 | `data_source = computeGirderSectionProperties(spanLength etc)`; `empty_data_behavior = section props NOT_AVAILABLE if incomplete inputs`; `future_expansion = fix spanLength gate so CONTINUOUS computes`; basis `reportModel.ts:119-148/206-216`. |
| E-07 | Phase 2 `03_report_chapter_structure.md` §5 | "CP-13 (断面): reportModel.ts:119-148 の spanLength !== null ゲートにより CONTINUOUS は NOT_AVAILABLE (U-03)。" |
| E-08 | Phase 2 `08_report_data_contract_boundary.md` §4 | CP-13 → R-06 cross-section props (`NOT_AVAILABLE for CONTINUOUS`). |
| E-09 | Phase 2 `11_phase3_handoff.md` §9 GO | "U-03 (spanLength gate) リファクタリング方針が決定" — **direction** decided, code not executed. §3 R-06 = continuous segments. |
| E-10 | Phase 2 `11_phase3_handoff.md` §4 (非対象) | Report Model implementation (incl. gate refactor) is Phase 3 work; §5 §2 `row()` display convention must be maintained in Phase 3. |
| E-11 | `reportModel.test.ts` (existing) | SIMPLE_SINGLE path assertions (section computed); no CONTINUOUS section assertions (CONTINUOUS not yet wired to report in Step 9 scope). |

## 3. Analysis

**Nature of the gate:** `computeGirderSectionProperties` is pure cross-section geometry (webHeight, totalArea, I, S, centroid). All are independent of span length. Only `steelVolumePerGirder` involves a length, and it uses `bridgeLength` (line 107), **not** `spanLength`. The `spanLength !== null` requirement in the reportModel gate (E-01) is therefore **over-narrow**: it is a "are inputs complete" check that incidentally requires a field the computation does not use, which is why CONTINUOUS (where `spanLength` is legitimately null) is blocked.

**Is it a blocker to Phase 3 (spec freeze)?** No.
- Phase 3 = "Report Model 仕様凍結" (spec freeze of type/transformation/validation contract) — **not** implementation.
- Phase 2 has **already frozen CP-13 = NOT_AVAILABLE for CONTINUOUS** as the current dev-only non-numeric behavior (E-06, E-07, E-08). This is a defensible, intentional spec state for a `UNVERIFIED_DEVELOPMENT_ONLY` / `NOT_AUTHORIZED` report.
- The frozen spec also **records the future direction** (E-06 `future_expansion = fix spanLength gate so CONTINUOUS computes`), so Phase 3 has the decision anchor already.
- Phase 3 GO condition (E-09) requires only that the **refactoring direction** be decided — which the spec already captures. It does **not** require the code fix to precede spec freeze.

**Verdict options:**
- **A (no code fix needed, spec absorbs)** — partially true: the NOT_AVAILABLE behavior is acceptable as-is.
- **B (absorbable in Phase 3 spec)** — strongest: the spec already specifies current behavior + future direction; the gate refactor is a Phase 3 *implementation* task under a `DEC-PHA` gate, not a pre-spec-freeze blocker.
- **C (minimal guard fix mandatory before Phase 3)** — NOT met: the gate is not a pre-spec-freeze blocker; Phase 3 can spec-freeze CP-13 (NOT_AVAILABLE-for-CONTINUOUS) and defer the refactor to Phase 3 implementation.
- **D (insufficient evidence)** — not applicable; evidence is complete.

## 4. Verdict

**VERDICT: B — Phase 3仕様で吸召可能 (absorbable in Phase 3 spec)**

- The current `CP-13 = NOT_AVAILABLE for CONTINUOUS` is a frozen, defensible non-numeric dev-report state.
- No code change is required in Phase 2.5.
- The gate refactor (`spanLength`-independent cross-section props; `steelVolumePerGirder` from `bridgeLength`/`Σspans`) is deferred to **Phase 3 implementation** under `DEC-PHA-0004`, consistent with §8 permit being gated on verdict=C (which is not satisfied).
- Phase 2.5-F (minimal code change): **NOT_APPLICABLE** (no production code change in Phase 2.5).

## 5. Phase 3 implementation plan (deferred; not executed in 2.5)

For Phase 3 Report Model implementation only (under `DEC-PHA-0004`):
1. Make `computeGirderSectionProperties` accept an effective length for volume: `steelVolumePerGirder = totalArea * effectiveSpanLength`, where `effectiveSpanLength = Σ spans[].length` (CONTINUOUS) or `spanLength` (SIMPLE_SINGLE). This removes the `spanLength` hard dependency from the section-props path.
2. Revise the reportModel gate (reportModel.ts:119-148) to require only the **section dimensions** (girderDepth/thicknesses/width/etc.) + an effective length for volume; remove the `draft.spanLength !== null` term that wrongly blocks CONTINUOUS.
3. Add a CONTINUOUS path to `reportModel.test.ts` (G-07: assert CH-SECTION emits section rows with `effectiveSpanLength` and `NOT_AVAILABLE` only when section dims are incomplete — never zero-fill).
4. **Invariants preserved:** `authorizationStatus: NOT_GRANTED`; row status `UNVERIFIED` (not ADOPTED); zero-fill forbidden; `NOT_AVAILABLE` when dims incomplete; formal PDF rejected.

This plan keeps the numeric authorization state unchanged (`NOT_AUTHORIZED`/`NOT_GRANTED`/`PROHIBITED`/`NOT_AVAILABLE`).

## 6. Phase 3 impact

- Satisfies Phase 3 GO condition "U-03 (spanLength gate) リファクタリング方針が決定" (direction = §5 plan, `DEC-PHA-0004`).
- **Does not** change any numeric authorization state.
- Phase 3 implementation may execute §5, gated by `DEC-PHA-0004` and the §8-style invariance checks.

## 7. Status

- U-03: VERDICT = B; Phase 2.5-F = NOT_APPLICABLE (no code change).
- HEAD: ed4032a (no code change).
