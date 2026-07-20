# P4-D08 Implementation Plan — E2E and Final Verification

**Date:** 2026-07-21
**Status:** AUTHORITATIVE — PLAN APPROVED by supervisor (2026-07-21)
**Authoritative scope:** [p4_d08_scope.md](p4_d08_scope.md)
**Baseline:** `0fb30fb` (P4-D07 COMPLETE #163)
**Branch:** `feat/phase4-p4-d08-e2e-final-verification`

---

## 1. Purpose

P4-D01..D07 の成果を Playwright E2E とグローバル品質ゲートで統合検証し、`phase4_final_verification.md` で Phase 4 実装 **COMPLETE** を宣言する。

**In scope:** E2E 拡張、最終検証文書、completion record、D08-C01..C05 証跡。

**Out of scope:** 新機能、schema bump、parity-cli `.tmp` 操作、GitHub CI 設定。

---

## 2. E2E implementation

| ID | Change | File |
| --- | --- | --- |
| P4-E2E-01 | Existing — label traceability | `p4-d01-multi-alignment.spec.ts` |
| P4-E2E-02 | Add CSV download assertion after LDIST results | `p4-d02-ldist.spec.ts` |
| P4-E2E-03 | HAUNCH + HOSO save/reload | `p4-d08-roundtrip.spec.ts` (new) |
| P4-E2E-04 | Formal drawing after reload | `p4-d08-roundtrip.spec.ts` (new) |
| P4-E2E-05 | Existing — label traceability | `p4-d05-review-diagrams.spec.ts` |

Supporting smoke specs retained: `p4-d03-haunch.spec.ts`, `p4-d04-hoso.spec.ts`, `p4-d06-reports-csv.spec.ts`.

---

## 3. Documentation

| Path | Role |
| --- | --- |
| `docs/history/road/phase4_final_verification.md` | G-P4-01..06, quality log, E2E results, extraction sign-off |
| `docs/road/phase4/phase4_completion_record.md` | D-step / PR ledger for supervisor |
| `docs/road/phase4/p4_d08_scope.md` | Scope |
| `docs/road/phase4/p4_d08_implementation_plan.md` | This file |

---

## 4. Gate mapping

| Criterion | Evidence |
| --- | --- |
| D08-C01 | Playwright P4 subset + P1–P3 E2E, 0 skip |
| D08-C02 | Command log in final verification |
| D08-C03 | `phase4_final_verification.md` verdict COMPLETE |
| D08-C04 | `vitest.regression.config.ts` + `regression.golden.test.ts` |
| D08-C05 | Extraction doc paths in final verification |

---

## 5. Quality commands (record exit codes)

```bash
cd frontend && npm run typecheck
cd frontend && npm run lint
cd frontend && npm run test -- src/liner src/contracts/persistence src/contracts/legacy src/contracts/migration
cd frontend && npm run test:regression
cd frontend && npm run build
cd frontend && npx playwright test tests/e2e/p4-d*.spec.ts tests/e2e/p1-d05-liner-ui-save-load.spec.ts tests/e2e/p2-d06-viewer-vertical-z.spec.ts tests/e2e/p3-d07-print-dxf-parity.spec.ts tests/e2e/p3-f03-rdd-bridge-drawing-persistence.spec.ts
```

---

## 6. Risks

| Risk | Mitigation |
| --- | --- |
| E2E flakiness | Phase 3 reload patterns; extended timeouts |
| parityCli `.tmp` dirty | Document only; do not stage |
| GitHub checks absent | Local validation only — no false CI PASS |
