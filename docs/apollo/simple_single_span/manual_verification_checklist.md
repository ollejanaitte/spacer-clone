# 単径間単純桁 — Step S2 手動確認チェックリスト

**Authority:** Step S2
**Date:** 2026-08-02
**MANUAL_GUI_VERDICT:** `PENDING_USER_CONFIRMATION`

> 本環境では対話的 GUI 操作を実行できないため、手動項目はすべて PENDING とする。PASS を捏造しない。

## 1. 用語・表示

| # | 確認項目 | 期待値 | 状態 |
|---|----------|--------|------|
| MV-S2-01 | 「支間長」表示 | 「径間長」ではなく「支間長」 | PENDING |
| MV-S2-02 | 「構造モデル長」表示 | 「橋長」ではなく「構造モデル長」 | PENDING |
| MV-S2-03 | 現在対応形式 | 「単径間単純桁（現在対応）」 | PENDING |
| MV-S2-04 | disclaimer | 動作確認用サンプルである旨 | PENDING |

## 2. サンプル入力・生成

| # | 確認項目 | 期待値 | 状態 |
|---|----------|--------|------|
| MV-S2-05 | サンプル値入力 | 全フィールドへサンプル反映 | PENDING |
| MV-S2-06 | 自動生成なし | 「構造を生成」まで SDM なし / STALE | PENDING |
| MV-S2-07 | 構造生成 | 主桁・支点・数量・3D 更新 | PENDING |
| MV-S2-08 | 入力クリア | 全クリア + STALE | PENDING |
| MV-S2-09 | 入力変更 STALE | generatedAt null、STALE 表示 | PENDING |

## 3. 保存・3D・互換

| # | 確認項目 | 期待値 | 状態 |
|---|----------|--------|------|
| MV-S2-10 | save/reload | 入力・BSDD 復元、generation current | PENDING |
| MV-S2-11 | viewer | 単径間ソリッド表示 | PENDING |
| MV-S2-12 | STL | 出力成功・三角面 > 0 | PENDING |
| MV-S2-13 | VVS01/VVS02 互換 | 既存フロー破綻なし | PENDING |
| MV-S2-14 | NOT_AUTHORIZED 維持 | 設計ステータスが正式採用にならない | PENDING |

## 4. 自動検証メモ（参考・GUI代替ではない）

- `simpleSingleSpanWorkflow.test.ts`: 5/5 PASS
- `npm test -- src/apollo`: PASS
- `apolloStlExport` / visualization / shell: PASS
- typecheck / lint / build: PASS

ユーザー確認後、該当行を PASS に更新し `MANUAL_GUI_VERDICT: PASS` へ変更すること。
