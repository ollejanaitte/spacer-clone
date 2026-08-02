# 単径間単純桁サンプル入力 — Step S2 完了報告

**Authority:** Step S2
**Date:** 2026-08-02
**Branch:** `test/apollo-simple-single-verification`
**Commit message:** `test(apollo): verify simple single-span sample workflow`

## 1. 目的

S1 で実装した単径間単純桁の動作確認用サンプル入力ワークフローを、自動テスト・ビルド・既存 viewer/STL 回帰で検証し、手動 GUI ゲートを明示する。

## 2. 検証範囲

| 項目 | 結果 |
|------|------|
| sample fill（自動生成なし） | PASS（unit） |
| generate / quantities / SDM | PASS（unit） |
| STALE（sample 後・clear 後） | PASS（unit） |
| save/reload round-trip | PASS（unit） |
| spanSystem source of truth | PASS（`phase1ScopeAssertion.spanSystem`、SDM 非重複） |
| 単位重量 USER_PROVIDED_UNVERIFIED / NOT_AUTHORIZED | PASS（unit） |
| typecheck | PASS |
| `npm test -- src/apollo` | PASS（35 files / 262+ tests） |
| lint | PASS（既存日本語文字列警告のみ） |
| build | PASS |
| viewer / STL 関連テスト | PASS（apolloStlExport / visualization / ApolloPhase1Shell） |
| 手動 GUI | `MANUAL_GUI_VERDICT: PENDING_USER_CONFIRMATION` |

## 3. 修正内容

- `simpleSingleSpanWorkflow.test.ts` 新規（S2 workflow 検証）
- 失敗原因: テストが `sdm.spanSystem` を期待していたが、production contract では `spanSystem` は BSDD `phase1ScopeAssertion` にある
- 対応: production code は変更せず、テスト参照先を `apolloBsdd.phase1ScopeAssertion.spanSystem` に修正
- `apolloSuite.test.ts` にモジュール名を追加（discoverability）

## 4. 数値設計ゲート（維持）

- `NUMERIC_RELEASE_READINESS_VERDICT: BLOCKED`
- `PHASE_B_IMPLEMENTATION_START_VERDICT: NO_GO_PENDING_HUMAN_EVIDENCE`
- `NUMERIC_DESIGN_AUTHORIZATION: NOT_GRANTED`

## 5. 非対象

- 正式解析・照査
- 単位重量の ADOPTED 化
- 連続桁（C0 以降）
- dependency / lockfile / backend / IF3 変更

## 6. 次 Step

S2 を main マージ後、`docs/apollo-continuous-girder-scope` で C0（連続桁 scope freeze）を開始する。
