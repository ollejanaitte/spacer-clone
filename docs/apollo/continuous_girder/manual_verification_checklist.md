# 連続桁 — 手動確認チェックリスト

**Authority:** Step C0（文書凍結。実行は C4）
**Date:** 2026-08-02
**MANUAL_GUI_VERDICT:** `PENDING_USER_CONFIRMATION`

> C0 は文書のみ。以下は C1〜C4 実装後の手動確認項目として凍結する。本環境では GUI 操作不可のため、現時点ですべて PENDING。

## 1. 構造形式・入力

| # | 確認項目 | 期待値 | 状態 |
|---|----------|--------|------|
| MV-CG-01 | 構造形式選択 | 単径間 / 連続桁を切替可能 | PENDING |
| MV-CG-02 | 径間数入力 | 2〜5 のみ受理 | PENDING |
| MV-CG-03 | 支間長・構造モデル長 | `bridgeLength = spanLength × spanCount` | PENDING |
| MV-CG-04 | 非整数倍拒否 | 割り切れない組合せで生成拒否 | PENDING |
| MV-CG-05 | SIMPLE_SINGLE 回帰 | 単径間フローが S2 同等 | PENDING |

## 2. 生成・STALE

| # | 確認項目 | 期待値 | 状態 |
|---|----------|--------|------|
| MV-CG-06 | 構造生成 | 主桁・支点・床版・3D 更新 | PENDING |
| MV-CG-07 | 入力変更 STALE | `generatedAt` null、STALE 表示 | PENDING |
| MV-CG-08 | 再生成 | STALE 解除、3D 復帰 | PENDING |
| MV-CG-09 | NOT_AUTHORIZED | 設計ステータスが正式採用にならない | PENDING |

## 3. 下部構造・3D

| # | 確認項目 | 期待値 | 状態 |
|---|----------|--------|------|
| MV-CG-10 | 橋台表示 | 端部 2 箇所 | PENDING |
| MV-CG-11 | 橋脚表示 | 中間 `spanCount - 1` 箇所 | PENDING |
| MV-CG-12 | 主桁連続 | 径間継ぎ目なしの貫通表示 | PENDING |
| MV-CG-13 | STL 出力 | 三角面 > 0 | PENDING |

## 4. 保存・互換

| # | 確認項目 | 期待値 | 状態 |
|---|----------|--------|------|
| MV-CG-14 | save/reload | 入力・SDM・generation current 復元 | PENDING |
| MV-CG-15 | レガシー SIMPLE | `bridgeSystem` 欠落で単径間として開く | PENDING |
| MV-CG-16 | VVS01/S2 互換 | 既存プロジェクト破綻なし | PENDING |

## 5. 禁止境界（負の確認）

| # | 確認項目 | 期待値 | 状態 |
|---|----------|--------|------|
| MV-CG-17 | 断面力・利用率 | 表示されない | PENDING |
| MV-CG-18 | 負曲げ・活荷重 UI | 存在しない | PENDING |
| MV-CG-19 | 正式照査 OK | 出力されない | PENDING |

## 6. 数値ゲート（全 Step 共通）

```
NUMERIC_RELEASE_READINESS_VERDICT: BLOCKED
PHASE_B_IMPLEMENTATION_START_VERDICT: NO_GO_PENDING_HUMAN_EVIDENCE
NUMERIC_DESIGN_AUTHORIZATION: NOT_GRANTED
```

ユーザー確認後、該当行を PASS に更新し `MANUAL_GUI_VERDICT: PASS` へ変更すること。
