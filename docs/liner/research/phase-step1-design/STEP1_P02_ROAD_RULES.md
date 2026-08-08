# STEP-1 P02 — Road Design Rules Design（凍結）

Status: FROZEN（Step2実装の正本）

## 1. Purpose
道路構造令・JIP-LINER 系の設計 Rule を Geometry から分離した Rule Engine として
確定し、Step2 で widening（拡幅）・crossfall すり付け・curve length（曲線長）・
建築限界（clearance）を production rule として実装できる契約を固定する。

## 2. Geometry と Design Rule の責務境界（確定）

| 層 | 責務 | 例 |
|----|------|-----|
| Geometry (X4-A/B/C/D) | 与えられた値の幾何評価 | R=160mのXY・曲率、幅員3.0mのedge座標 |
| Design Rule (Rule Engine) | 設計値の決定・照査 | 設計速度40km/h→R=160mの片勾配/拡幅量/すり付け長を決定・照査 |
| Vertical Geometry | station→Z（P01） | 縦断勾配・縦断曲線からの標高 |

原則:
- Rule Engine は Geometry の数値計算を再実装しない（X4-Xへ委譲）
- Geometry は Rule の設計値決定をしない
- Rule の出力（片勾配・拡幅量・曲線長・縦断曲線長）は Geometry の explicit 入力へ流れる

## 3. Scope
- widening（曲線部拡幅量）Rule
- crossfall / 片勾配すり付け（superelevation transition）Rule
- curve length（最小曲線長・縦断曲線長 VCL）Rule
- 建築限界（clearance）Rule
- Rule Registry 登録方針（X2-R 系に追加、X4B-R-001 と同型）
- Rule Matrix（対象・入力・出力・根拠条文・UNKNOWN明示）

## 4. Non-scope（Step2でも凍結しない/後続）
- 交差点形状 / ランプ IC-JCT 全自動設計（RULE-17/18 → DEFERRED）
- 交通量・積雪地域・出入制限（RULE-20/22/21 → DEFERRED）
- 設計基準の自動決定連鎖（道路種級→設計速度→全Rule の自動配線）は
  Step2 では「設計速度等を入力として個別Rule評価」に限定

## 5. Rule Matrix（Step2 実装対象）

| Rule ID | 名称 | 入力 | 出力 | 根拠 | 現状 |
|---------|------|------|------|------|------|
| X2-R-020 (新) | widening 曲線部拡幅 | R, 設計車両, 車線数, 設計速度 | 拡幅量(m) | 道路構造令 第17条(令3) 曲線部の拡幅 / RULE-09 | NEEDS_RESEARCH（算定式確定必要） |
| X2-R-021 (新) | curve-length 最小曲線長 | 設計速度, R | 最小曲線長(m) | 道路構造令 第15条 / RULE-07 / X2 CAND-08 | NEEDS_RESEARCH（数値表要取得） |
| X2-R-022 (新) | superelevation transition 片勾配すり付け | 片勾配, すり付け長, R | すり付け区間・横断勾配遷移 | 道路構造令 第16条+すり付け / RULE-08,10 | 一部既存(X2-R-009 superelevation) の拡張 |
| X2-R-023 (新) | clearance 建築限界 | 道路種級, 車道構成, 設計速度 | 建築限界(高さ・幅) | 道示/道路構造令 建築限界 / RULE-16 | BLOCKED→ Step2で対象化（道示条文要確定） |

※ 既存 X2-R-009 superelevation（片勾配設定）を保持し、すり付け遷移を X2-R-022 として分離。
※ 既存 X2-R-008 transition_curve（緩和区間）・X2-R-011 longitudinal_grade・X2-R-012 vertical_curve は現行のまま維持。

## 6. Rule 契約（X2 系 rule の共通形を踏襲）
```
backend/rule_engine/rules/widening.py, curve_length.py,
superelevation_transition.py, clearance.py
- rule_id / rule_version / category / title / source_evidence_ids
- applicability / execution_order / error_code / validation_severity
- formula_id / liner_module / test_case_ids
- evaluate(inputs, context) -> RuleResult
- global RuleRegistry へ load_all_rules() で登録
```
- 入力の不足・矛盾は CONTRACT_ERROR / WARNING を返す（既存 rule と同様）
- 数値は TableLookup ベース（道路構造令表）+ 必要なら計算式（拡幅算定式等）

## 7. 根拠データ整備（Step2前段で必要）
- widening: 道路構造令 解説PDF 第17条 拡幅量算定式の OCR/数値化（NEEDS_RESEARCH）
- curve length: 最小曲線長 数値表の取得（2秒走行距離）
- clearance: 道示（道路橋示方書）建築限界 条文の OCR/数値化
- ※ OCR 不明瞭項目は RULE_ENGINE_CANDIDATES.csv の通り needs_body_review=YES を維持し、
  確定できない数値は UNKNOWN / DEFERRED として明示

## 8. Geometry / Rule データフロー
```
RoadGeometryRequest
  ├─ alignment / station / widths / crossfall (explicit)
  └─ verticalProfile (P01)
        ↓
  RoadGeometryAPI (X4-D)  ←  Rule Engine が設計値を explicit 入力として供給
        ↓
  RoadGeometryResult
```
Step2 では Rule Engine → RoadGeometryAPI の呼び出し接続（adapter）を新設する。
Rule 出力を Geometry 入力へ変換する adapter は `backend/rule_engine/road_geometry/adapters.py` を想定。

## 9. Rule Engine 登録方針
- load_all_rules() に X2-R-020〜023 を追加
- 既存 18 + X4B-R-001 + 新規4 = 23 rule を目安
- 各PRは rule 1件ずつ（+ 対応 rule テスト）
- registry の既存テスト（size >= 18）は後方互換

## 10. Test strategy
- widening: 道路構造令表の手計算オラクル（確定後に fixture 化）
- transition: すり付け区間の横断勾配遷移を station 列で検証
- curve-length / clearance: 表 lookup の境界値テスト
- 全 rule: CONTRACT_ERROR / WARNING / PASS の3状態検証
- Rule→Geometry adapter: X4-D へ設計値を流して退行なし確認

## 11. Traceability
- SRC-001 JIP-LINERマニュアル（拡幅・すり付け・曲線長）
- SRC-007 道路構造令の解説と運用（令3）
- SRC-012 road-structure-ordinance 目次解析（RULE-07/08/09/16）
- phase-x2-rule-engine-specification（X2_RULE_REGISTRY.csv / X2_TARGET_RULES.csv）
- 既存 backend/rule_engine/rules/*.py

## 12. Acceptance criteria（Step2用）
- [ ] X2-R-020〜023 が global RuleRegistry に登録され evaluate 可能
- [ ] 各 rule の根拠条文・数値表が trace 付き
- [ ] Rule 出力を X4-D explicit 入力へ変換する adapter が動作
- [ ] 既存 19 rule に退行なし
- [ ] UNKNOWN/DEFERRED は理由付きで ledger 管理
