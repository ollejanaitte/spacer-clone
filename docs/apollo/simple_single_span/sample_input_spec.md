# 単径間単純桁 — 動作確認用サンプル入力仕様（Sample Input Specification）

**Authority:** Step S0
**Date:** 2026-08-02

動作確認用サンプル入力の仕様を定義する。

> ⚠️ **動作確認用サンプル値です。設計基準に基づく採用値・照査済み断面ではありません。正式設計には使用しないでください。**

---

## 1. サンプル入力値

| フィールド | 値 | 単位 |
|------------|-----|------|
| 構造形式 | SIMPLE_SINGLE（単径間単純桁） | — |
| 支間長（spanLength） | 30.0 | m |
| 構造モデル長（bridgeLength） | 30.0 | m |
| 全幅員（width） | 10.5 | m |
| 主桁本数（girderCount） | 4 | 本 |
| 主桁間隔（girderSpacing） | 3.0 | m |
| 主桁高（girderDepth） | 2.0 | m |
| 上フランジ幅（topFlangeWidth） | 0.45 | m |
| 上フランジ厚（topFlangeThickness） | 0.025 | m |
| 下フランジ幅（bottomFlangeWidth） | 0.55 | m |
| 下フランジ厚（bottomFlangeThickness） | 0.030 | m |
| ウェブ厚（webThickness） | 0.012 | m |
| 床版厚（deckThickness） | 0.22 | m |
| 横桁間隔（crossBeamSpacing） | 5.0 | m |
| 補剛材間隔（stiffenerSpacing） | 2.5 | m |
| 対傾構間隔（swayBracingInterval） | 横桁 1 本ごと（=1） | 本 |
| 横構（lateralBracingEnabled） | OFF（false） | — |
| 鋼単位体積重量（steelUnitWeight） | 77.0 | kN/m³ |
| RC床版単位体積重量（rcUnitWeight） | 24.5 | kN/m³ |

## 2. 表示文言

```
動作確認用サンプル値です。設計基準に基づく採用値・照査済み断面ではありません。正式設計には使用しないでください。
```

## 3. サンプル値の扱い（厳守）

- 動作確認用のみ
- 標準値・推奨値・照査済み断面ではない
- 単位重量（steelUnitWeight / rcUnitWeight）は **USER_PROVIDED_UNVERIFIED**
  - **ADOPTED にしない**
  - 出典を道示と断定しない
  - 数値設計権限（NOT_GRANTED）下で fail-closed は維持される（既存 adoption.ts の仕組み）

## 4. サンプル入力ボタンの動作（Step S1 で実装）

- ボタン名: 「動作確認用サンプル値を入力」
- 動作: 上記サンプル値を全フィールドへ反映し、`generatedAt: null`（STALE）にする
- **自動で構造生成しない**（「構造を生成」ボタン操作を待つ）
- サンプル入力も既存バリデーションを経由する（迂回しない）
- クリア用ボタン: 「入力をクリア」（全フィールド null、generatedAt: null）

## 5. 期待される生成結果（SIMPLE_SINGLE）

- 支間 30.0m の単径間
- 4 主桁 × 3.0m 間隔 = 配置幅 9.0m ≦ 幅員 10.5m
- 支点 2（A1 / A2）、spanSystem = simple
- 横桁: floor(30.0 / 5.0) + 1 = 7 本
- 補剛材: 各主桁 floor(30.0 / 2.5) + 1 = 13 本/桁
- 対傾構: 横桁 1 本ごと（内側横桁 5 箇所）
- すべて designStatus: NOT_AUTHORIZED

## 6. サンプル入力の用途

- 手動 GUI 確認（VVS01 / VVS02 互換確認）
- 自動テストの入力基準（S2）
- 連続桁 UI（Step C2）との並置確認
