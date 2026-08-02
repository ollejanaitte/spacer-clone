# Phase A — 02 材料・単位・係数 凍結

**Authority:** Phase A integrated freeze (A2)
**Date:** 2026-08-02
**Step:** A2 — 材料・単位・係数
**Integration base:** DS-03 (`docs/apollo/design-standards/03_materials/`), DS-02 (`02_jis/`), DS-04 (`04_loads/` の load_factor_register 一部), DS-05 (`05_verification/` 参照), DS-00 `adoption_status_model.md`
**Adoption vocabulary:** DS-00 `adoption_status_model.md` と同一語彙を使用する。

本ファイルは Phase A 統合の一部として、**材料・単位系・係数**の統合状態を再凍結する。既存 DS-02/DS-03/DS-04/DS-05 の決定を書き換えず、レジスタへ参照整合を保持する。

**Phase A の方針:** 材料物性・係数の**数値は採択しない**。数値は正式条文 + 目視確認 + 決定ID の証跡鎖が揃うまで `BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT` を維持する。数値実装許可は `NOT_AUTHORIZED`（A7 ゲートで部材・照査単位に管理）。

---

## 1. 単位系（Dimensional units policy）

### 1.1 文書固有単位（document-native units）

採用時に各レジスタ行は、証跡化した道示・JIS 表に記載されたままの**文書固有単位**を `unit` 列に記録する。DS-03 時点では SI / kN-m / N-mm の**いずれも事前選択しない**。

### 1.2 変換・丸め・保存の規則（DS-03 凍結）

| Quantity kind | 保存規則 |
|---------------|----------|
| **応力 (E, G, 強度)** | 固有値 + 固有単位 + `quantity_kind` を保存。解析器の正準単位系への変換はエクスポート時のみ、変換係数をログ記録して実施 |
| **単位体積重量 γ (force/volume)** | γ と ρ（mass/volume）を区別。ρ 行は重力/単位変換ポリシーと DS-06 の要否確認まで `conversion_pending_g_policy` |
| **線膨張係数 α** | 出典の温度基準（/°C または /K）をそのまま保存 |
| **無次元量 (ν)** | 比率として単位なしで保存 |

- **無言の丸め禁止** — 採用時は出典表の完全精度で保存。丸め規則は supervisor 決定後に記録。
- **float センチネル禁止** — 未採択プロパティはスキーマ束縛で null/absent。`0.0` で埋めない。
- **厚さ・径の帯** — JIS 表行ラベルを lookup key として保存。証跡なき帯内補間をしない。

### 1.3 禁止される既定値

| 禁止事項 | 理由 |
|----------|------|
| `schema_draft.json` の `yieldStrength` / `elasticModulus` 例示を本番昇格 | スキーマは `REFERENCE_ONLY` |
| SPACER / 旧Apollo 組込材料ライブラリ | 未証跡 |
| null を `0` / `1` で埋める | fail-closed（numeric_value_governance） |
| 証跡PNG の OCR で強度表を採用 | 位置メモのみ |
| 道示を JIS 一次資料の代用にする | jis_version_policy |
| 最新 JIS を自動採用 | 等価性決定なしに禁止 |

---

## 2. 材料カテゴリと採択状態

### 2.1 概要（DS-03 レジスタ集計）

| 指標 | 値 |
|------|-----|
| material_properties_register.csv 総行数 | 44 |
| `BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT` | 39 |
| `OUT_OF_SCOPE` | 2（疲労カテゴリ MAT-DS03-040、合成コネクタ MAT-DS03-041） |
| `REFERENCE_ONLY` | 3（支持資料・スキーマシェル） |
| 非空 `value` の行 | **0** |
| **採択済み数値** | **0** |
| material_applicability_matrix.csv グループ数 | 18 |

### 2.2 カテゴリ別状態

| カテゴリ | レジスタ行 | 数値採択 | Phase 1A/1B 位置づけ |
|----------|------------|----------|---------------------|
| 構造用鋼 (structural_steel) | MAT-DS03-001..010, 040 | 0 | 1A: E–G–ν・γ は DS-06 I/O 確認次第（条件付き）／1B: 強度・等級は BLOCKED |
| RC床版コンクリート (rc_deck_concrete) | MAT-DS03-011..019 | 0 | 1A: Ec・νc・γc は DS-06 が床版シェルを確認すれば条件付き／1B: Fc・材齢 BLOCKED |
| 鉄筋 (reinforcing_steel) | MAT-DS03-020..025 | 0 | 1A: Es・γs 条件付き／1B: 等級・径別強度 BLOCKED |
| 高力ボルト (high_strength_bolt) | MAT-DS03-026..030 | 0 | 1B 添接・接合境界 BLOCKED |
| 溶接 (welding) | MAT-DS03-031..033 | 0 | 1B 溶接整合 BLOCKED（母材等級未採択） |
| 支承境界 (bearing_boundary) | MAT-DS03-034..036 | 0 | 1B 境界 BLOCKED（V巻クラス地図未確定） |
| 防食・塗装 (corrosion_protection) | MAT-DS03-037..039 | 0 | 1B BLOCKED |
| 疲労材料カテゴリ | MAT-DS03-040 | 0 | `OUT_OF_SCOPE`（Phase 1 疲労照査 OUT） |
| 合成コネクタ | MAT-DS03-041 | 0 | `OUT_OF_SCOPE`（非合成） |
| 支持資料・スキーマ | MAT-DS03-042..044 | 0 | `REFERENCE_ONLY` |

### 2.3 E–G–ν 整合ポリシー（数値なし）

| カテゴリ | 登録トリプレット | 備考 |
|----------|------------------|------|
| structural_steel | MAT-DS03-004 (E) / 005 (G) / 006 (ν) | 全3物性が必要な場合、同一証跡セットから。G は E と ν から導出する旨の証跡がある場合のみ `constant_or_derived` |
| rc_deck_concrete | Ec (012) / νc (013) のみ | **コンクリート G 行は DS-03 に存在しない**。DS-06 が要求すれば後の統制改訂で BLOCKED 行を追加 |
| reinforcing_steel | Es (021) のみ | G/ν トリプレット未登録 |

- `0` / `1` / `0.3` などの未記載既定値は解析器・スキーマ・テストのいずれでも**禁止**。
- 材料カテゴリごとに独立して評価。鋼の ν をコンクリートへ流用しない。

---

## 3. 係数（Factors）

### 3.1 部分係数法（method）— `ADOPTED`

部分係数法は検証形式として `ADOPTED`（DEC-DS01-0001 / DEC-DS00-0001）。**係数の数値は未採択**。

### 3.2 荷重側部分係数（DS-04 load_factor_register）

- 10 ファクタシェル（LF-DS04-001..010）が登録済み。**全て `BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT`**。
- `factor_value` / `source_clause` / `source_table` は空。design_situation / limit_state / favorable_unfavorable も未指定。
- 動的影響係数は LF-DS04-010 が唯一のオーナー。二重適用禁止（LM-DS04-007 を組み合わせに入れない）。
- 荷重モデルの詳細は A3（03_loads_and_combinations.md）で統合。

| factor_id | 対象荷重 | adoption_status |
|-----------|----------|-----------------|
| LF-DS04-001 | 構造自重回帰 | `BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT` |
| LF-DS04-002 | RC床版自重 | `BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT` |
| LF-DS04-003 | 舗装（上載死荷重） | `BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT` |
| LF-DS04-004 | 地覆・高欄（上載死荷重） | `BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT` |
| LF-DS04-005 | その他上載死荷重 | `BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT` |
| LF-DS04-006 | 活荷重 | `BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT` |
| LF-DS04-007 | 温度 | `BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT` |
| LF-DS04-008 | 支承移動 | `BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT` |
| LF-DS04-009 | 風 | `BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT` |
| LF-DS04-010 | 動的影響（活荷重への係数） | `BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT` |

### 3.3 抵抗側係数（DS-05）

抵抗側部分係数は DS-05（`05_verification/`）で別途ゲート。DS-03 時点では数値なし、`BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT`。A2 では採択しない。

### 3.4 数値実装許可

材料物性・係数の実装許可は **`NOT_AUTHORIZED`**。A7（08_numeric_authorization_gate.md）で部材・照査単位の GRANTED を管理する。一部が揃っても一括 GRANTED にしない。

---

## 4. JIS 連鎖（DS-02）

| 指標 | 値 |
|------|-----|
| JIS ギャップ行 | JIS-001..JIS-034（34行） |
| 確定 JIS 番号 | **0** |
| adoption_status | 全行 `BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT` |

- JIS ギャップは合成プレースホルダ。道示が引用する実際の JIS を特定する新インベントリへ置換されるまで、番号を推定しない。
- 道示の材料選定条文を JIS 一次資料の代用にしない。
- 材料プロパティの採用には「解決済み JIS 識別 → 製品等級 → 道示引用条文（目視確認）→ supervisor 決定」の証跡鎖が必要（BLK-S1-005）。

---

## 5. 数値・式・条項の状態まとめ

| 分類 | Adoption status | 確定 |
|------|-----------------|------|
| 単位系ポリシー（文書固有単位・変換規則） | `ADOPTED`（governance） | A2 |
| ρ 変換ポリシー | `BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT` | g ポリシー + DS-06 |
| 部分係数法（method） | `ADOPTED` | — |
| 材料物性（E/G/ν/γ/Fy/Fu/Fc/fy/ft 等）の数値 | `BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT` | JIS + 道示条文 + 目視 + 決定 |
| 荷重側部分係数 | `BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT` | A3 で荷重モデル統合後 |
| 抵抗側係数 | `BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT` | A5/A6 照査式統合後 |
| JIS 番号 | `BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT` | JIS 一次資料 |
| 数値実装許可 | `NOT_AUTHORIZED` | A7 |

---

## 6. A2 検証（Self-check）

| Check | Result |
|-------|--------|
| 既存 DS-02/03/04/05 の決定を書き換えていない | PASS |
| レジスタ行数・状態（44行 / 39 BLOCKED / 0 数値）が DS-03 と一致 | PASS |
| 数値を捏造していない（全て BLOCKED / NOT_AUTHORIZED） | PASS |
| 変更範囲は `docs/apollo/phase_a_integrated_freeze/` + `final_report.txt` のみ | PASS |
| 長文の基準本文転載なし | PASS |
| 採択語彙が DS-00 と一致 | PASS |
| 未完の TODO / TBD / 未採択数値なし | PASS |

---

## 7. A2 決定（decision_log 反映）

| DEC-ID | Date | Decision |
|--------|------|----------|
| DEC-PHA-0007 | 2026-08-02 | Phase A の材料物性・単位系・係数の統合は DS-03 のレジスタ/ポリシー（44行、数値 0 採択、文書固有単位保存）をそのまま採用する。数値は BLOCKED を維持し、捏造しない。 |
| DEC-PHA-0008 | 2026-08-02 | 荷重側部分係数は DS-04 レジスタ（LF-DS04-001..010、全 BLOCKED）、抵抗側係数は DS-05 を参照する。数値実装許可は A7 の NOT_AUTHORIZED ゲートで部材・照査単位に管理する。 |
