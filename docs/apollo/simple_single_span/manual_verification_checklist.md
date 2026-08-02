# 単径間単純桁 — 手動確認チェックリスト（Manual Verification Checklist）

**Authority:** Step S0
**Date:** 2026-08-02

Step S1/S2 で実施する手動 GUI 確認項目を列挙する。

## 1. 用語表示

| # | 確認項目 | 期待値 | 状態 |
|---|----------|--------|------|
| MV-S0-01 | 「径間長」→「支間長」表示 | パネルに「支間長」表示 | PENDING |
| MV-S0-02 | 「橋長」→「構造モデル長」表示 | パネルに「構造モデル長」表示 | PENDING |
| MV-S0-03 | 「単径間単純桁（現在対応）」表示 | 対応形式が明示される | PENDING |

## 2. サンプル入力

| # | 確認項目 | 期待値 | 状態 |
|---|----------|--------|------|
| MV-S0-04 | 「動作確認用サンプル値を入力」 | 全フィールドへサンプル値反映 | PENDING |
| MV-S0-05 | サンプル入力で自動生成されない | 「構造を生成」を押すまで SDM 生成されない | PENDING |
| MV-S0-06 | disclaimer 表示 | 「動作確認用サンプル値です。…」表示 | PENDING |
| MV-S0-07 | 単位重量が USER_PROVIDED_UNVERIFIED | ADOPTED にならない・採用ボタンは fail-closed | PENDING |
| MV-S0-08 | 入力をクリア | 全フィールド null、STALE | PENDING |

## 3. 構造生成・STALE

| # | 確認項目 | 期待値 | 状態 |
|---|----------|--------|------|
| MV-S0-09 | 「構造を生成」 | SDM 生成、全エンティティ NOT_AUTHORIZED | PENDING |
| MV-S0-10 | 4主桁×3.0m 配置幅 9.0m ≦ 幅員 10.5m | 主桁配置エラーなし | PENDING |
| MV-S0-11 | 支間 30.0m の単径間 | spanCount=1、支点 A1/A2 | PENDING |
| MV-S0-12 | 入力変更時 STALE | generatedAt null、STALE メッセージ表示 | PENDING |

## 4. 保存・再読込・3D

| # | 確認項目 | 期待値 | 状態 |
|---|----------|--------|------|
| MV-S0-13 | save/reload | bridgeStructureInput・BSDD 復元 | PENDING |
| MV-S0-14 | viewer/STL 回帰 | 単径間 3D・STL 出力が壊れない | PENDING |
| MV-S0-15 | VVS01/VVS02 互換 | 既存フローが壊れない | PENDING |

> 手動 GUI を実行できない場合は `MANUAL_GUI_VERDICT: PENDING_USER_CONFIRMATION` とし、
> PASS を捏造しない（Step S2 完了報告に反映）。
