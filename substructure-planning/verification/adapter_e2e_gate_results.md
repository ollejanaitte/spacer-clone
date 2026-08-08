# Design Calculation Adapter 実動検証 Gate（A-08 Closeout）

実施日時: 2026-08-08
対象: 橋脚モデル → Adapter入力 → Test Engine → Result → UI → Save/Load → 同一再表示 の一連データ往復
方法: vitest 全スイート + Playwright E2E（正常系/異常系）+ typecheck + production build + 視覚証跡

## 1. 総括

| カテゴリ | 結果 |
|---|---|
| 全体リグレッション | 389ファイル / 3001テスト PASS |
| 正常系 E2E | adapter-normal-path 2 PASS |
| 異常系 E2E | adapter-failure-path 7 PASS |
| Save/Load E2E | substructure-persistence 1 PASS |
| substructure 系 E2E 計 | 31 PASS |
| typecheck / build | PASS |
| CI | N/A_WITH_REASON（repo に workflow 未設定） |

## 2. Gate 検証結果

| gate | 結果 | 根拠 |
|---|---|---|
| PIER_MODEL_GENERATION | PASS | 実 Pier モデル（sampleGenerator / LINER handoff） |
| PIER_MODEL_TO_ADAPTER | PASS | adapterMapper（A-02） |
| ADAPTER_INPUT_VALIDATION | PASS | validateAdapterInput / mapper fail-closed（A-01/A-02） |
| ADAPTER_TO_TEST_ENGINE | PASS | calculateTest（A-03） |
| TEST_ENGINE_DETERMINISTIC | PASS | same input → same result（A-03 unit） |
| RESULT_TO_UI | PASS | AdapterResultPanel（A-04） |
| TEST_RESULT_CLEARLY_LABELED | PASS | engineLabel=TEST / isFormalDesign=false / 正式判定ではない明示 |
| SAVE_LOAD_ROUNDTRIP | PASS | adapterPersistence envelope（A-05）+ E2E |
| RELOAD_RESULT_REDISPLAY | PASS | A-06 E2E（supportId/calculationId 一致・2D/3D 維持） |
| SUPPORT_ID_ROUNDTRIP | PASS | A-06 E2E 検証 |
| CALCULATION_ID_ROUNDTRIP | PASS | A-06 E2E 検証（同一 calcId 再表示） |
| FAIL_CLOSED | PASS | A-07 E2E（不完全/不可/不正/mismatch/version/欠落/stale） |
| E2E | PASS | 正常系 2 + 異常系 7 |
| REGRESSION | PASS | 389ファイル / 3001テスト |
| BUILD | PASS | typecheck + vite build |
| VISUAL_VERIFICATION | PASS | evidence/a-04..a-07 各PNG |
| CI | N/A_WITH_REASON | workflow 未設定（ローカルで全チェック実施） |

## 3. 判定

- 全必須 Gate PASS
- **SUBSTRUCTURE_CALCULATION_ADAPTER_E2E_VERIFIED: YES**

ただし、これは「正式な下部工設計計算が完成した」という意味ではない:

- **FORMAL_NUMERIC_DESIGN_STATUS: HOLD / NOT_IMPLEMENTED**
  （正式な道路橋示方書ベース数値照査・安定/部材/杭/耐震/配筋の正式式は未実装）
- **CALCULATION_ADAPTER_STATUS: VERIFIED**
  （Adapter 境界・データ往復は実動検証済み）
- **SUBSTRUCTURE_MODELING_PHASE_CLOSEOUT: READY**

## 4. 将来の正式 Engine 差し込み

- CalculationAdapterInput/Result 契約（A-01）が境界。
- 正式 Engine は engineType を正式識別子に変更し、status を正式判定形式へ拡張すれば差し込み可能。
- Test/Mock 結果は今後も正式判定として表示しない。
