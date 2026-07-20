# P4-D08 Scope — E2E and Final Verification

**Date:** 2026-07-21
**Status:** AUTHORITATIVE — `P4_D08_SCOPE_VERDICT: APPROVED` (2026-07-21, supervisor message)

**Authoritative parents:** [phase4_planning_freeze.md](phase4_planning_freeze.md), [phase4_design_document.md](phase4_design_document.md), [phase4_completion_gate.md](phase4_completion_gate.md)
**Execution plan:** [phase4_d03_to_final_execution_plan.md](phase4_d03_to_final_execution_plan.md)
**Pattern reference:** [p4_d07_scope.md](p4_d07_scope.md)
**P4-D07 baseline:** `0fb30fb` — Persistence / Legacy / Migration COMPLETE (P4-D07 #163)

---

## 1. D-step ID と正式名称

| 項目 | 値 |
| --- | --- |
| **D-step ID** | **P4-D08** |
| **正式名称** | **E2E and Final Verification** |

Phase 4 正式名称 **Road Advanced Calculation & Utilities** の第 8（最終）実装ステップ。Playwright E2E、グローバル品質ゲート、`phase4_final_verification.md` により Phase 4 実装 COMPLETE を宣言する。

| 正本ラベル | 意味 |
| --- | --- |
| P4-D01..D07 | Feature + persistence complete |
| **P4-D08** | **E2E and Final Verification（本スコープ・最終 D-step）** |

---

## 2. 目的

P4-E2E-01..05 を **0 skip** で通過させ、グローバル品質コマンドの exit code 0 を記録し、監督 sign-off 付き最終検証文書を提出する。

成功基準（正本 completion gate D08-C01..C05 + G-P4-01..06）:

| ID | 要点 |
| --- | --- |
| D08-C01 | P4-E2E-01..05 pass, 0 skip |
| D08-C02 | typecheck / lint / test / regression / build exit 0 |
| D08-C03 | `phase4_final_verification.md` verdict **COMPLETE** |
| D08-C04 | Regression includes P4 golden cases |
| D08-C05 | Extraction sign-off links for LDIST / HAUNCH / HOSO |

---

## 3. 対象（In scope）

### 3.1 E2E scenarios（minimum）

| ID | Scenario | Spec |
| --- | --- | --- |
| P4-E2E-01 | Multi-alignment create/save/reload/active switch | `p4-d01-multi-alignment.spec.ts` |
| P4-E2E-02 | LDIST job → results → CSV download | `p4-d02-ldist.spec.ts` |
| P4-E2E-03 | HAUNCH/HOSO save/reload round-trip | `p4-d08-roundtrip.spec.ts` |
| P4-E2E-04 | Formal drawing confirmation after reload | `p4-d08-roundtrip.spec.ts` |
| P4-E2E-05 | Review tab = Bridge Layout only | `p4-d05-review-diagrams.spec.ts` |

既存 P1–P3 E2E も同一 Playwright 実行に含め回帰を確認する。

### 3.2 Global quality commands

```bash
cd frontend && npm run typecheck
cd frontend && npm run lint
cd frontend && npm run test -- src/liner src/contracts/persistence src/contracts/legacy src/contracts/migration
cd frontend && npm run test:regression
cd frontend && npm run build
npx playwright test tests/e2e/p4-d*.spec.ts tests/e2e/p1-d05-*.spec.ts tests/e2e/p2-d06-*.spec.ts tests/e2e/p3-*.spec.ts
```

### 3.3 Artifacts

| Path | Role |
| --- | --- |
| `docs/history/road/phase4_final_verification.md` | Verdict COMPLETE, G-P4-01..06, D01–D08 ledger |
| `docs/road/phase4/phase4_completion_record.md` | Supervisor closeout record |
| `docs/road/phase4/p4_d08_scope.md` | This file |
| `docs/road/phase4/p4_d08_implementation_plan.md` | Implementation plan |

---

## 4. 対象外（Out of scope）

- 新機能・schema bump
- Phase 4.5 / BMV2 deliverables
- `frontend/.tmp/parity-cli/**` の stage / commit（既知 dirty — 触らない）
- GitHub Actions 設定（未設定 — local validation only と明記）

---

## 5. BLOCKER

（実装完了時に空であること）

---

## 6. 下流

Phase 5 formal-drawing completion、Phase 4.5 semantic parity は別プログラム。
