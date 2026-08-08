# Phase C1 Milestone 3 設計仕様 Freeze（M3-00）

区分: FREEZE
日付: 2026-08-08
正本: substructure-planning/docs/phase-c1/（P00〜P04 + M2 closeout）
監査: origin/main=f8a99ef 時点、Read-Only で実施

## 1. 目的

M1/M2 で成立した下部工 3D モデリング・配置・UI の上に、
「設計結果・接続・成果物」の枠組みを追加する。
数値設計（道示系の照査式・許容値・安全率）は
repo ガバナンス（DS-00..09 / numeric_value_governance）により
現時点 **ADOPTED ではない**ため、本 M3 は **設計フレームワーク + HOLD 登録** を凍結する。

## 2. 監査結果（根拠）

| 項目 | 根拠 | 判定 |
|---|---|---|
| M1/M2 COMPLETE | m1/m2_gate_results.md、PR #553..#621 | VERIFIED |
| 設計数値（荷重係数・許容値・限界値） | docs/apollo/design-standards/00_governance/decision_ledger.md | `BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT` |
| 数値自動決定禁止 | step1/02_standards_baseline/numeric_value_governance.md | AUTO-DETERMINATION BANNED |
| Stage 5B 数値認証 | design-standards/research/…/README.md | `NUMERIC_RELEASE_READINESS: BLOCKED` |
| 計算ルール表 認証 | step1/STEP1_P05_CALCULATION_RULE_MATRIX.md | 全数値 `NOT_AUTHORIZED` |
| Reference Bridge 001 反力 | reaction_candidate.csv | `EXCLUDED_ANALYSIS_RESULT`（入力参照データのみ） |
| 下部工詳細設計 | docs/handoffs/next_phase_handoff.md | `NOT_GRANTED`（Phase D 将来） |
| 上部工⇔下部工交換契約 | schemas/substructure/support-interface.schema.json v0.1.0 | ADOPTED（bearingSeats / reactionCases） |
| 座標系・単位系 | P02 Freeze / support-interface | ADOPTED（x-longitudinal-y-transverse-z-up, SI） |
| 概算数量（幾何計算） | prototype/src/quantity.ts | ADOPTED（純幾何・実務数量ではない） |

## 3. M3 対象範囲（FREEZE）

### 3.1 構造形式（M3対象）
- 橋台: 逆T式 / ラーメン式
- 橋脚: 単柱矩形 / 壁式 / 門型
- フーチング: 直接基礎 / 杭基礎（場所打ち杭 / 鋼管杭）

### 3.2 実装する項目（ADOPTED / データ・幾何・枠組み）
| 項目 | 内容 |
|---|---|
| M3-01 Project 永続化 | 下部工プロジェクト JSON Save/Load / schema / migration / round-trip / fail-closed |
| M3-02 上部工+下部工接続 | support-interface 読込（bearingSeats + reactionCases を入力データとして保持）|
| M3-02 3D統合 | 上部工簡易外形（支承線・桁下高・床版高を基にした幾何）と下部工を同一シーン表示 |
| M3-03 設計フレームワーク | 入力→反力/荷重（入力データ）→照査→結果 のフロー骨格 |
| M3-03 概算数量 | コンクリート体積・杭延長（純幾何） |
| M3-03 DesignResult モデル | OK / NG / HOLD 状態 + trace 記録 + NaN/Infinity 禁止 |
| M3-04 耐震/配筋フレームワーク | 入力・荷重ケース・配筋データモデル（数値照査は HOLD） |
| M3-05 結果UI | OK/NG/HOLD サマリ + 計算 trace + 計算書出力（JSON/CSV/表示） |
| M3-06 E2E / Closeout | 統合シナリオ A-H（HOLD 判定を含む） |

### 3.3 HOLD とする項目（NOT_AVAILABLE、根拠不足）
| 照査 | 理由 |
|---|---|
| 安定照査（転倒・滑動・支持力・浮上） | 部分係数・許容値が未 ADOPTED（DS-04/05） |
| 部材照査（曲げ・せん断・軸力） | 照査式・材料強度・係数が未 ADOPTED（DS-05） |
| 基礎照査（地盤支持力・沈下） | 地盤定数・許容値が未 ADOPTED |
| 杭基礎照査（杭体・地盤） | 同上 |
| 耐震照査（L1/L2） | 耐震設計法・応答スペクトル・係数が未 ADOPTED |
| 配筋設計（必要鉄筋量・間隔・かぶり） | 配筋ルール・限界値が未 ADOPTED |

各 HOLD 項目は `PHASE_C1_M3_DESIGN_BASIS_REGISTER.csv` に
必要根拠（source_doc_id / locator / decision_id）を登録する。
decision_id が付与されるまで本実装しない。

## 4. 入力データ（FREEZE）

- 下部工: Support（station / offset / skew / 部材寸法）
- 上部工接続: support-interface.json（bearingSeats, reactionCases）
- reactionCases.caseKind: permanent / liveLoad / braking / wind / seismicLevel1 / seismicLevel2
- 反力値は「入力データ」として保持・表示し、設計照査値とはしない

## 5. 荷重ケース（FREEZE）

- 入力データ境界として reactionCases を保持（値の導出は上部工側の責務）
- 下部工側で新規に荷重値を生成しない（AUTO-DETERMINATION BANNED）

## 6. 設計計算フロー（FREEZE 骨格）

```
入力（下部工寸法 + 上部工反力/支承）
  → 概算数量（幾何）…… ADOPTED 計算
  → 照査一覧（各 check を列挙）
  → 各 check:
      - 根拠あり（decision_id）→ OK / NG 判定
      - 根拠なし          → HOLD_NOT_AVAILABLE（理由・必要根拠を trace）
  → DesignResult（全 check の状態 + trace + サマリ）
```

## 7. OK / NG / HOLD 判定（FREEZE）

| 状態 | 意味 |
|---|---|
| OK | 全 check PASS（decision_id 保有 check のみが判定可能） |
| NG | いずれかの check FAIL |
| HOLD | 根拠未 ADOPTED の check が存在（判定不能） |

設計結果を UI で「OK に見せる」ことはしない。
HOLD は HOLD として明示する。

## 8. traceability（FREEZE）

各 DesignResult は以下を持つ:
- inputSnapshot（寸法・反力）
- checkId / 名称 / 状態 / 理由 / 必要根拠（source_doc_id, locator）
- 中間値（計算済み項目のみ）
- 判定値（ADOPTED check のみ）
- NaN/Infinity 禁止（guard）

## 9. 出力・成果物（FREEZE）

- DesignResult JSON（trace 含む）
- 計算書テキスト/CSV（入力・基準・計算項目・中間値・判定・結果）
- UI: Result panel（OK/NG/HOLD サマリ + 詳細 + 2D/3D 連動）

## 10. 保存データ（FREEZE）

- 下部工プロジェクト JSON（SubstructureProject v0.2.0 互換 + design 拡張）
- schemaVersion 維持、migration ゲート、fail-closed（不正は reject）

## 11. E2E 受入条件（FREEZE）

- シナリオ A-H が成立（HOLD 判定は HOLD として表示・記録）
- Save → Reload → Load → 同一結果/2D/3D 復元
- 上部工+下部工同一 3D に supportId / bearing 整合

## 12. Completion Gate（FREEZE）

| gate | 期待 |
|---|---|
| M3_SPEC_FREEZE | PASS（本ドキュメント） |
| M3_PROJECT_SAVE / LOAD / SCHEMA_ROUNDTRIP | PASS |
| M3_BEARING_SUPPORT_CONNECTOR | PASS |
| M3_SUPERSTRUCTURE_SUBSTRUCTURE_3D | PASS |
| M3_DESIGN_ENGINE（フレームワーク） | PASS |
| M3_PIER / ABUTMENT / FOUNDATION / PILE / SEISMIC / REBAR DESIGN | HOLD_NOT_AVAILABLE（数値根拠未 ADOPTED） |
| M3_RESULT_TRACEABILITY / RESULT_UI / CALCULATION_OUTPUT | PASS（HOLD 表示込み） |
| M3_E2E / REGRESSION / BUILD / VISUAL | PASS |
| M3_REFERENCE_VALIDATION | PASS（support-interface 読込 + Reference Bridge 反力データ入力検証） |
| M3_CI | N/A_WITH_REASON（workflow 未設定） |

数値設計 gate が HOLD のため:
PHASE_C1_MILESTONE3_COMPLETE: NO（スーパーバイザ決定に従い正直に報告）

## 13. 再開条件（設計数値の ADOPTED 化）

1. スーパーバイザが採用基準（例: 道示 下部構造編 の特定条項）を指定
2. source_doc_id / locator / edition / applicability を登録
3. decision_id 発行（DS ガバナンス準拠）
4. 対応 check を HOLD → 実判定に切替え、Gate を再実行
