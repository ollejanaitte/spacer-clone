# Phase A — 03 荷重・荷重係数・荷重組合せ 凍結

**Authority:** Phase A integrated freeze (A3)
**Date:** 2026-08-02
**Step:** A3 — 荷重・組合せ
**Integration base:** DS-04 (`docs/apollo/design-standards/04_loads/`), DS-03（単位重量連鎖）, DS-01（巻別役割）
**Adoption vocabulary:** DS-00 `adoption_status_model.md` と同一語彙を使用する。

本ファイルは Phase A 統合の一部として、**荷重モデル・荷重係数・荷重組合せ**の統合状態を再凍結する。既存 DS-04 の決定を書き換えず、レジスタへ参照整合を保持する。

**Phase A の方針:** 荷重モデルの**同一性・分布・数値**は正式条文の目視確認が揃うまで `BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT`。一部の荷重が `PHASE1_REQUIRED` でも、その数値採択を意味しない。組合せ・同時性・係数は全て未採択。

---

## 1. 荷重モデル（DS-04 load_model_register）

| load_id | 荷重 | phase1_status | adoption_status |
|---------|------|---------------|-----------------|
| LM-DS04-001 | 構造自重回帰 | `PHASE1_REQUIRED` | `BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT` |
| LM-DS04-002 | RC床版自重 | `PHASE1_REQUIRED` | `BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT` |
| LM-DS04-003 | 舗装（上載死荷重） | `PHASE1_OPTIONAL` | `BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT` |
| LM-DS04-004 | 地覆・高欄（上載死荷重） | `PHASE1_OPTIONAL` | `BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT` |
| LM-DS04-005 | その他上載死荷重 | `BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT` | `BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT` |
| LM-DS04-006 | 活荷重（モデル未特定） | `PHASE1_REQUIRED` | `BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT` |
| LM-DS04-007 | 動的影響（ポインタ） | `REFERENCE_ONLY` | `BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT` |
| LM-DS04-008 | 温度作用 | `PHASE1_OPTIONAL` | `BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT` |
| LM-DS04-009 | 支承移動作用 | `PHASE1_OPTIONAL` | `BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT` |
| LM-DS04-010 | 風作用 | `PHASE1_OPTIONAL` | `BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT` |
| LM-DS04-011 | 施工時荷重 | `FUTURE_PHASE` | `NOT_APPLICABLE` |
| LM-DS04-012 | 地震作用 | `OUT_OF_SCOPE` | `OUT_OF_SCOPE` |
| LM-DS04-013 | 疲労荷重作用 | `OUT_OF_SCOPE` | `OUT_OF_SCOPE` |
| LM-DS04-014 | 架設段階解析荷重 | `OUT_OF_SCOPE` | `OUT_OF_SCOPE` |

### 1.1 注意点

- 構造自重回帰・RC床版自重・活荷重は Phase 1 アーキタイプで**必須**だが、モデル同一性・分布・数値は未証跡。
- 活荷重は「標準荷重区分・大きさ・分布・車線規則」が未証跡。ハンドオフの位置メモから L-load / T-load / TL-25 等を**捏造しない**。
- 動的影響は LF-DS04-010 が唯一の数値オーナー。LM-DS04-007 は組み合わせ成分にできない。**二重適用禁止**。
- 地震・疲労・架設段階は Phase 1 で `OUT_OF_SCOPE`（Phase 1 アーキタイプ外）。
- 施工時荷重は `FUTURE_PHASE`（現 Phase 1 では不適用）。

---

## 2. 荷重係数（DS-04 load_factor_register）

- 10 ファクタシェル（LF-DS04-001..010）。**全て `BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT`**。
- `factor_value` / `source_clause` / `source_table` は空。design_situation / limit_state / favorable_unfavorable も未指定。
- 材料単位重量（MAT-DS03-008/015 等）は**荷重係数ではない**。LM-DS04-001/002 は単位重量 × 体積の重力作用。
- 動的影響係数 LF-DS04-010 は LM-DS04-006（活荷重）に**1回だけ**適用。LM-DS04-007 を組み合わせに含めない。

詳細は A2（02_materials_units_factors.md §3.2）に同じ。

---

## 3. 荷重組合せ（DS-04 load_combination_register）

| レジスタ | 状態 |
|----------|------|
| load_combination_register.csv | 汎用シェル COMB-DS04-001 のみ。component_load_id / coefficient 空。全 BLOCKED |
| simultaneity_and_exclusivity_rules.csv | 5 ルールクラスシェル（SX-DS04-001..005）。全 BLOCKED |

### 3.1 汎用組合せシェル

- 組合せ成分行 COMB-ROW-DS04-001（grouping key: COMB-DS04-001）のみ存在。**成分荷重・係数を埋めない**。
- ULS / SLS の組合せ所属・成分荷重・係数の**捏造禁止**。
- 正式条文（道示 I の組合せ式・係数表）の目視確認で証跡化された行に置換されるまで、汎用シェルのまま。

### 3.2 同時性・排他性ルールクラス

| rule_id | ルールクラス | adoption_status |
|---------|--------------|-----------------|
| SX-DS04-001 | 同時性（ψ/concurrent-action） | `BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT` |
| SX-DS04-002 | 排他性（互いに排他的な荷重ケース） | `BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT` |
| SX-DS04-003 | 有利/不利（永久作用） | `BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT` |
| SX-DS04-004 | max/min 包絡抽出 | `BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT` |
| SX-DS04-005 | ゼロ成分の扱い | `BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT` |

---

## 4. Phase 1A / Phase 1B / 将来の位置づけ

| レーン | 荷重の扱い |
|--------|------------|
| **Phase 1A**（静的線形解析器） | `PHASE1_REQUIRED` モデル（構造自重・RC床版自重・活荷重）は同一性 BLOCKED。`PHASE1_OPTIONAL`（舗装・地覆高欄・温度・風・支承移動）は証跡ゲートで採用 |
| **Phase 1B**（係数付き設計照査） | 組合せ・係数は全て BLOCKED。道示 I 証跡 + DS-05 抵抗側の揃ったものから採用 |
| **FUTURE_PHASE** | 施工時荷重（LM-DS04-011）は supervisor 決定まで不適用 |
| **OUT_OF_SCOPE** | 地震（012）・疲労（013）・架設段階解析（014） |

---

## 5. 数値・式・条項の状態まとめ

| 分類 | Adoption status |
|------|-----------------|
| 荷重モデル同一性・分布・数値 | `BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT` |
| 荷重部分係数 | `BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT` |
| 動的影響係数（LF-DS04-010） | `BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT` |
| 組合せ成分・組合せ係数 | `BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT` |
| 同時性・排他性・有利不利・max/min・ゼロ包含 | `BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT` |
| 施工時荷重 | `NOT_APPLICABLE`（FUTURE_PHASE） |
| 地震・疲労・架設段階 | `OUT_OF_SCOPE` |
| 数値実装許可 | `NOT_AUTHORIZED`（A7） |

---

## 6. A3 検証（Self-check）

| Check | Result |
|-------|--------|
| 既存 DS-04 の決定を書き換えていない | PASS |
| レジスタ行数・状態（LM 14行 / LF 10行 / 組合せ 1シェル / SX 5行）が DS-04 と一致 | PASS |
| 活荷重等のモデル同一性を捏造していない | PASS |
| 数値を捏造していない（全て BLOCKED / NOT_AUTHORIZED） | PASS |
| 動的影響の単一オーナー規則を維持 | PASS |
| 変更範囲は `docs/apollo/phase_a_integrated_freeze/` + `final_report.txt` のみ | PASS |
| 長文の基準本文転載なし | PASS |
| 採択語彙が DS-00 と一致 | PASS |
| 未完の TODO / TBD / 未採択数値なし | PASS |

---

## 7. A3 決定（decision_log 反映）

| DEC-ID | Date | Decision |
|--------|------|----------|
| DEC-PHA-0009 | 2026-08-02 | Phase A の荷重・組合せ統合は DS-04 レジスタ（LM-DS04-001..014 / LF-DS04-001..010 / 汎用組合せシェル / SX-DS04-001..005）をそのまま採用する。荷重同一性・分布・数値・係数は BLOCKED を維持し、捏造しない。 |
| DEC-PHA-0010 | 2026-08-02 | 動的影響は LF-DS04-010 が唯一の数値オーナー、LM-DS04-007 はポインタのみ。組み合わせ成分に含めず二重適用しない。地震・疲労・架設段階は OUT_OF_SCOPE、施工時荷重は FUTURE_PHASE を維持する。 |
