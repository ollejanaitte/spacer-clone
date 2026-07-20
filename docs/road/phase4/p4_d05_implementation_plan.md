# P4-D05 Implementation Plan — Review Diagrams and Utilities UI

**Date:** 2026-07-21
**Status:** AUTHORITATIVE — PLAN APPROVED by supervisor (2026-07-21)
**Authoritative scope:** [p4_d05_scope.md](p4_d05_scope.md)
**Extraction:** [p4_d05_official_spec_extraction.md](p4_d05_official_spec_extraction.md) (APPROVED)
**Baseline:** `77173c4a` (P4-D04 COMPLETE)
**Branch:** `feat/phase4-p4-d05-review-diagrams`

---

## 1. Purpose

P4-D05 の確認図強化と UI 導線を、既存 Phase 3 `formalBuilders` 経路を拡張して完遂する。新規 `DrawingDocument` 永続化・review tab キャンバス・地盤合成・拡幅数値は **禁止**。

**In scope:** formal builder enhancements（既存拡張の P4 ゲート整備）、Preview → Formal Drawing 二次導線、i18n stale 文言修正、D05-C01..C06 テスト、E2E smoke（feasible 時）。

**Out of scope:** D05-C07 overlays、schema bump、`domainDraft` write、CSV/HTML download UI (D06)、D08 final E2E gate。

---

## 2. Architecture summary

```text
LinerEditPage (review tab → BridgeLayoutEditor ONLY)
LinerEditPage / Preview → openDrawings → LinerFormalDrawingWorkspacePage
  ↔ buildFormalDrawingWorkspaceDocuments(draft)
  ↔ buildIntermediateResult (active alignment)
  ↔ formalBuilders (plan / profile / cross_section / band)
  ↔ drawingSettings RDD round-trip (geometry extension)
  ↔ preview / print / DXF share one DrawingDocument build (Phase 3 parity)
```

---

## 3. File inventory

### 3.1 Existing（Phase 3/5 — extend / gate only）

| Path | Role |
| --- | --- |
| `drawing/builders/formalBuilders.ts` | Plan IP/BC/EC, profile VCL, band crossfall/widening unavailable |
| `drawing/dimensions/alignmentSegmentDimensions.ts` | Straight segment dimensions |
| `drawing/tables/planCoordinateTable.ts` | Plan coordinate table |
| `drawing/formalDrawingWorkspaceDocuments.ts` | Runtime document bundle |
| `pages/LinerFormalDrawingWorkspacePage.tsx` | Primary `/pro/liner/drawings/*` |
| `drawing/__tests__/formalBuilders.test.ts` | Builder regression |
| `drawing/__tests__/drawingSettingsPersistence.test.ts` | D05-C03 pattern |

### 3.2 Modified（P4-D05 delta）

| Path | Change |
| --- | --- |
| `pages/LinerPreviewPage.tsx` | Formal Drawing notice banner (D05-C06) |
| `pages/LinerPreviewPage.test.tsx` | Banner + openDrawings test |
| `pages/LinerEditPage.test.tsx` | D05-C01: no confirmation canvas on review |
| `drawing/__tests__/formalBuilders.test.ts` | D05-C05 widening; crossfall/VCL assertions |
| `i18n/ja.ts` | Stale Phase 4.0-2 cleanup; preview notice strings |
| `styles.css` | Preview notice styles |
| `tests/e2e/p4-d05-review-diagrams.spec.ts` | Review tab + preview banner smoke |

### 3.3 New docs

| Path | Role |
| --- | --- |
| `docs/road/phase4/p4_d05_scope.md` | AUTHORITATIVE scope |
| `docs/road/phase4/p4_d05_official_spec_extraction.md` | §8 adoption / D05-C07 N/A |
| `docs/road/phase4/p4_d05_implementation_plan.md` | This file |

---

## 4. Gate mapping

| Criterion | Implementation | Test |
| --- | --- | --- |
| D05-C01 | Review tab = `BridgeLayoutEditor` only | `LinerEditPage.test.tsx` |
| D05-C02 | Routes + `formalBuilders` | `formalBuilders.test.ts`, E2E drawings |
| D05-C03 | No `drawingDocument` in JSON | `drawingSettingsPersistence.test.ts` |
| D05-C04 | `groundLineUnavailable` | `formalBuilders.test.ts`, E2E profile |
| D05-C05 | `widening` row `—` | `formalBuilders.test.ts` |
| D05-C06 | Preview banner + openDrawings | `LinerPreviewPage.test.tsx`, E2E |
| D05-C07 | — | **N/A** |

---

## 5. Verification commands

```bash
cd frontend && npm run typecheck && npm run lint && npm run build
cd frontend && npm run test -- src/liner/drawing src/liner/pages
cd frontend && npm run test:regression
git diff --check
# E2E (when dev server available):
# cd frontend && npx playwright test tests/e2e/p4-d05-review-diagrams.spec.ts
```

---

## 6. PR plan

| Item | Value |
| --- | --- |
| Branch | `feat/phase4-p4-d05-review-diagrams` |
| Title | `feat(liner): implement P4-D05 review diagrams and utilities UI` |

Commit/push: supervisor COMPLETE 後に別指示。
