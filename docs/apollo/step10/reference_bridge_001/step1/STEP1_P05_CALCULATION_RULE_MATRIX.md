# STEP 1-P05 — CALCULATION_RULE_MATRIX

> **Authority:** Reference Bridge 001 (RB-S10-001) — 上部工一気通貫
> **Status:** STEP 1 設計
> **重要:** 式そのものは本マトリクスで新規作成しない。規準 source と実装先・検証を確定する。
> 式の正本は `docs/apollo/design-standards/`（DS-00..09）・`phase_a_integrated_freeze/`・
> 道路橋示方書 R7（H29 基準）。数値認証は現状 `NOT_AUTHORIZED`（認証ゲート後 `GRANTED`）。

凡例: 実装先 = FE(frontend)/BE(backend)/both。検証 = Phase A 資料 ID。

## 荷重（LM / LF）

| calc | 入力 | 式・規準 source | 出力 | 実装先 | 検証 | 認証 |
|------|------|-----------------|------|--------|------|------|
| 死荷重（主桁・床版・舗装・付属物・ハンチ） | 断面寸法・単位体積重量 | Phase A LM-001..014, DS-03 | 線荷重/分布荷重 | FE（`apollo/loads`） | 07_validation_cases | NOT_AUTHORIZED |
| 活荷載（B 活等） | 設計条件 | LM-001..014 | 車線荷重/集中荷重 | BE（solver moving-load） | 07 | NOT_AUTHORIZED |
| 衝撃係数 | 支間・橋種 | LM, DS | 衝撃係数 | FE/BE | 07 | NOT_AUTHORIZED |
| その他荷重（風・温度・地震） | 設計条件 | LM（データ境界） | 荷重 | FE | 07 | NOT_AUTHORIZED |

## 荷重組合せ（LF）

| calc | 入力 | 式・規準 source | 出力 | 実装先 | 検証 | 認証 |
|------|------|-----------------|------|--------|------|------|
| 組合せ係数・係数 | 荷重ケース | Phase A LF-001..010, SX 規則 | 組合せ荷重ケース | FE/BE | 07 | NOT_AUTHORIZED |
| 組合せ生成 | ケース群 | LF | 照査用組合せ | BE | 07 | NOT_AUTHORIZED |

## 格子モデル・解析

| calc | 入力 | 式・規準 source | 出力 | 実装先 | 検証 | 認証 |
|------|------|-----------------|------|--------|------|------|
| 格子モデル生成 | GeometrySnapshot + 設計格子（縦桁/横桁/横構） | DS-04（解析モデル規則） | 設計格子 | BE（`bridge_fem_generator` 拡張） | 07 | NOT_AUTHORIZED |
| 格子解析（反力・断面力） | 格子モデル + 組合せ | 現行フレーム solver（PROJECT_SPECIFIC, AN-ID-001） | 反力/断面力 | BE（solver） | 07 | NOT_AUTHORIZED |
| 外割（影響線/極値） | 解析結果 | DS-04 | 設計用断面力 | BE（influence/moving-load 拡張） | 07 | NOT_AUTHORIZED |

## 照査

| calc | 入力 | 式・規準 source | 出力 | 実装先 | 検証 | 認証 |
|------|------|-----------------|------|--------|------|------|
| 主桁（曲げ・せん断・合成度・局部座屈・ねじり等 7 状態） | 断面力 + 断面 + 材料 | DS-05（7 limit states） | 応力度比/判定 | FE（`apollo/design`） | 07 | NOT_AUTHORIZED |
| 変位（たわみ） | 解析変位 | DS-05 | たわみ判定 | BE | 07 | NOT_AUTHORIZED |
| RC 床版（4 状態） | 床版設計荷重 + 床版断面 | DS-05 | 床版照査判定 | FE | 07 | NOT_AUTHORIZED |
| 床組（横桁・横構 7 状態） | 断面力 + 断面 | DS-05 | 判定 | FE | 07 | NOT_AUTHORIZED |
| 支承（4 状態） | 反力 + 支承種別 | DS-05 | 判定 | FE | 07 | NOT_AUTHORIZED |
| 補剛材 | 断面力 | DS-05 | 判定 | FE | 07 | NOT_AUTHORIZED |
| 継手 | 断面力 | DS-05 | 判定 | FE | 07 | NOT_AUTHORIZED |
| 疲労 | 疲労荷重（データ境界のみ） | DS-05（OUT_OF_SCOPE） | 疲労データ境界 | — | 07 | NOT_AUTHORIZED |

## 断面自動決定（Phase 8）

| calc | 入力 | 式・規準 source | 出力 | 実装先 | 検証 | 認証 |
|------|------|-----------------|------|--------|------|------|
| 断面初期値 | 設計条件・支間 | 既定値 | 初期断面 | FE | — | NOT_AUTHORIZED |
| 照査 NG→再設計 | 照査結果 | 収束判定 | 更新断面 | FE | — | NOT_AUTHORIZED |
| 収束判定 | iteration 上限 | 規約 | 最終断面 | FE | — | NOT_AUTHORIZED |

## 横断

- 全数値は認証ゲートを透過しない（`NUMERIC_DESIGN_AUTHORIZATION: NOT_GRANTED` が初期値）。
- 計算書数値の丸めは表示層のみ（計算値は高精度保持）。tolerance は `GOLDEN_REPLAY_SPEC` で定義。
- 同じ計算の frontend/backend 二重実装禁止（幾何=FE Geometry、解析=BE solver、照査=FE Design）。
- 各照査は式 source（DS-xx / R7 条文）を traceability に記録。
