# 連続桁 — UI 仕様

**Authority:** Step C0（設計文書。実装は C2）
**Date:** 2026-08-02

---

## 1. 目的

連続桁（2〜5 径間）の構造入力 UI を定義する。SIMPLE_SINGLE の既存パネルを拡張し、破壊的変更を避ける。

## 2. 構造形式選択（C2 実装）

| UI 要素 | 仕様 |
|---------|------|
| ラベル | 「構造形式」 |
| 選択肢 | 「単径間単純桁（現在対応）」/ 「連続桁（2〜5 径間）」 |
| 内部値 | `SIMPLE_SINGLE` / `CONTINUOUS` |
| デフォルト | `SIMPLE_SINGLE`（レガシー互換） |

選択変更時:

- CONTINUOUS へ切替 → `spanCount` 入力を表示（初期値 2）
- SIMPLE_SINGLE へ切替 → `spanCount` 非表示、単径間導出規則を適用

## 3. 寸法入力

### 3.1 共通フィールド

S1 適用済み表示名を維持: 支間長・構造モデル長・幅員・主桁本数・主桁間隔・断面寸法・床版厚・横桁間隔 等。

### 3.2 CONTINUOUS 固有

| フィールド | 表示名 | 制約 |
|------------|--------|------|
| `spanCount` | 径間数 | 整数 2〜5、セレクトまたはスピナー |
| `spanLength` | 支間長 | > 0 |
| `bridgeLength` | 構造モデル長 | `spanLength × spanCount` と一致必須（自動計算表示可、手入力時は検証） |

### 3.3 バリデーション文言（fail-closed）

- 径間数が 2〜5 外: 「径間数は 2〜5 の整数で入力してください。」
- 構造モデル長不一致: 「構造モデル長は支間長 × 径間数と一致する必要があります。」
- 主桁配置幅超過: 既存文言を継承

## 4. 生成フロー

| 操作 | 挙動 |
|------|------|
| サンプル値入力（任意） | C2 で連続桁用サンプルセット追加（設計採用値ではない） |
| 構造を生成 | SDM + BSDD 生成、`generatedAt` 設定 |
| 入力変更 | `generatedAt = null`、STALE アラート表示 |
| 入力クリア | 全フィールドクリア + STALE |
| 再生成 | STALE 解除、3D・数量更新 |

## 5. 表示・ステータス

| 表示 | 条件 |
|------|------|
| STALE バナー | `generatedAt === null` かつ過去に生成済み |
| SDM サマリ | 生成 current のみ |
| designStatus | 常に「NOT_AUTHORIZED（正式設計未許可）」 |
| 径間・支点ラベル | プレビューに A1, P1, P2, A2 等（C2） |

## 6. 対象外 UI（実装禁止）

- 負曲げ区間マーカー・活荷重パターン選択
- 径間別断面編集・変桁高プロファイル
- 曲線・斜角入力
- 正式照査結果・利用率ゲージ

## 7. 後方互換

- SIMPLE_SINGLE 選択時は S2 完了時点の UI 挙動と同一
- レガシープロジェクトは SIMPLE_SINGLE として開く
- `bridgeSystem` 欠落データは黙示的 CONTINUOUS 化しない

## 8. 数値ゲート

```
NUMERIC_RELEASE_READINESS_VERDICT: BLOCKED
PHASE_B_IMPLEMENTATION_START_VERDICT: NO_GO_PENDING_HUMAN_EVIDENCE
NUMERIC_DESIGN_AUTHORIZATION: NOT_GRANTED
```
