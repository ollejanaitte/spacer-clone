# STEP 1-P07 — GOLDEN_MASTER_REPLAY_SPEC

> **Authority:** Reference Bridge 001 (RB-S10-001) — 上部工一気通貫
> **Status:** STEP 1 設計（Phase 6-4 実装対象）
> **正本:** `phase5/fixtures/reference_bridge_001_common_model.json`・Phase 4 Golden（model/design/report/drawing）・`phase6_0/mapping/*.csv`

## 1. Golden Master 構成

| 要素 | 内容 | 正本 |
|------|------|------|
| 入力 fixture | Common Bridge Data Model（RB-001） | `phase5/fixtures/reference_bridge_001_common_model.json` |
| Geometry Golden | 支点/主桁/格点/床版/断面フレームの Golden 値 | Phase 4 model golden（G-GEO-*, G-SM-*） |
| 設計計算書 Golden | CH1..CH2 の数値（支間・断面力・照査等、抽出済みのもの） | Phase 4 design/report golden |
| 図面 Golden | 図面寸法・枚数（S001..S141） | Phase 4 drawing golden（G-DWG-*） |
| provenance | 各値の goldenId / sourceRefs / traceabilityId | mapping + traceability |
| tolerance | 位置: 1e-6 m、力: 1e-6 kN、比率: 1e-6、表示: 計算書規約 | `unit_tolerance_precision_contract` |

## 2. Replay 順序

```
1. fixture 読込（Common Model）→ 検証（schema + semantic, fail-closed）
2. Geometry Input Adapter → GeometryEngineInput
3. Geometry Engine（LINER 接続）→ GeometrySnapshot
4. Snapshot Parity: 支点 station / 主桁 offset / 格点 / 床版 / 断面フレーム を Golden と照合
5. Structural Model Connector → 解析モデル → Analyzer（backend）
6. 解析 Parity: 反力 / 断面力を設計計算書 Golden と照合（tolerance 付き）
7. Design Engine → 照査 → 設計結果
8. 出力（Report / Drawing / Quantity / CSV / DXF / STL）→ 出力 Artifact 検証（checksum）
9. screenshot / visual evidence（3D・図面・画面）保存
10. Replay レポート生成（各 step の PASS/FAIL + discrepancy 分類）
```

## 3. discrepancy 分類

| 分類 | 意味 | 扱い |
|------|------|------|
| FAIL_ID | エンティティ ID 不一致 | 即 FAIL |
| FAIL_NUMERIC | 数値が tolerance 超過 | 即 FAIL |
| FAIL_UNIT | 単位不一致 | 即 FAIL |
| FAIL_COORD | 座標/軸不一致 | 即 FAIL |
| FAIL_UNRESOLVED | unresolved 値が捏造された | 即 FAIL |
| WARN_PROVENANCE | provenance 欠落 | warning |
| WARN_HOLD | HOLD 値を出力に使用 | warning（blocking ではない） |
| PASS | 一致 | — |

## 4. 判定

- 全 step で `FAIL_*` = 0 → `REPLAY: PASS`。
- `WARN_*` のみ → `REPLAY: PASS_WITH_WARNINGS`（HOLD/HCR は明示）。
- いずれか FAIL → `REPLAY: FAIL`（blocking）。

## 5. Golden 自己生成の禁止

- expected は既存 Golden / 設計計算書 / 図面から導出。実装値で Golden を作らない。
- tolerance 未設定の照合は行わない（tolerance 欠落 = 検証対象）。

## 6. acceptance criteria（Replay 基準）

- RB-001 Geometry Parity: PASS（36 tests 拡張）
- 解析 Parity: 抽出済み計算書数値と一致（認証後）または NOT_AUTHORIZED 明示
- 出力 Artifact: checksum 一致・manifest 有効
- E2E: Playwright で Replay フロー実行成功
