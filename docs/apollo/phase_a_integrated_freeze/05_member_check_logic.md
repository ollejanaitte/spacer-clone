# Phase A — 05 部材照査ロジック 凍結

**Authority:** Phase A integrated freeze (A5 / A6)
**Date:** 2026-08-02
**Step:** A5 — 主桁・たわみ・疲労 / A6 — RC床版・床組・補剛材・添接
**Integration base:** DS-05 (`docs/apollo/design-standards/05_verification/`), DS-03/04/06（参照）, phase1_design_expansion_refreeze（MT-050..053, 070..072, 080..082, 090..091, 100..103, 110..112, 120..121, 130..132）
**Adoption vocabulary:** DS-00 `adoption_status_model.md` と同一語彙を使用する。

本ファイルは Phase A 統合の一部として、**部材別照査ロジック**の統合状態を再凍結する。A5（主桁・たわみ・疲労）と A6（RC床版・床組・補剛材・添接）を本ファイルで扱う。既存 DS-05 の決定を書き換えず、レジスタへ参照整合を保持する。

**Phase A の方針:** 照査式の形・係数配置・許容値・抵抗値・疲労等級は、正式条文の目視確認が揃うまで `BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT`。**R7 の照査式は 0 件目視確認済み**。疲労は Phase 1 で `OUT_OF_SCOPE`（データ境界のみ定義）。数値実装許可は `NOT_AUTHORIZED`。

---

## 1. 性能要求・限界状態の分類（DS-05）

### 1.1 主桁（steel_superstructure / main_girder）

| 要求 | 限界状態 | 照査式 | 状態 |
|------|----------|--------|------|
| PR-DS05-001 曲げ抵抗 | LS-DS05-001 | VER-DS05-001 | `BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT` |
| PR-DS05-002 せん断抵抗 | LS-DS05-002 | VER-DS05-002 | `BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT` |
| PR-DS05-003 軸力抵抗 | LS-DS05-003 | VER-DS05-003 | `BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT` |
| PR-DS05-004 曲げ+軸力 | LS-DS05-004 | VER-DS05-004 | `BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT` |
| PR-DS05-005 局部座屈 | LS-DS05-005 | VER-DS05-005 | `BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT` |
| PR-DS05-006 全体座屈 | LS-DS05-006 | VER-DS05-006 | `BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT` |
| PR-DS05-007 横倒れ座屈 | LS-DS05-007 | VER-DS05-007 | `BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT` |
| PR-DS05-008 たわみ（供用性） | LS-DS05-008 | VER-DS05-008 | `BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT` |

- 全行 `design_situation_unspecified`。限界状態・照査式の同一性は**候補**であり Phase 1B 承認ではない。
- 応答量（design_section_moment_pending_DS06 等）は DS-06 の応答抽出が必要。**解析の利用可否が照査を承認しない**（fail-closed）。
- RBS / ハンドオフ PNG は位置メモのみ。式・係数・限界の権威ではない。
- SPACER PRINT・鋼便覧の許容応力度方式で部分係数法を代替しない。

### 1.2 たわみ（供用性）の状態

- LV-DS05-008（deflection_serviceability_limit）: `BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT`。limit_value / unit / comparison_rule は空。
- 許容たわみ値・比較式は R7 条文の目視確認が必要（PKG-R7-V; PKG-DS06; PKG-SCOPE-P1B）。
- MT-090（たわみ・剛比）: `NOT_AUTHORIZED` — 許容値の採択が必要。
- MT-091（キャンバー集計・DXF）: `NOT_AUTHORIZED` — Drawing Semantic Model へ出力。

### 1.3 疲労の状態

- PR-DS05-024（fatigue_resistance）: **`OUT_OF_SCOPE`**（Phase 1 アーキタイプ明示除外）。DS-05 に照査式行なし。
- MT-130（疲労用荷重・解析）: `NOT_AUTHORIZED` — 疲労荷重と交通量の採択が必要。
- MT-131（主桁疲労照査）: `NOT_AUTHORIZED` — detail category と応力範囲抽出が必要。
- MT-132（横桁疲労照査）: `NOT_AUTHORIZED` — Phase 1 後半の独立ゲート。

**Phase A の扱い:** 疲労は照査ロジックを採択せず、**データ境界（疲労用荷重・応力範囲・detail category の入力枠）のみ定義**する。DS-00 の OUT_OF_SCOPE 判定（A1 §4.2 と一致）。

---

## 2. 照査式・限界値の状態（DS-05 レジスタ）

| レジスタ | 内容 | 数値採択 |
|----------|------|----------|
| verification_equation_register.csv | VER-DS05-001..023（23行） | **0**（equation_summary 全て空） |
| limit_state_register.csv | LS-DS05-001..023（23行） | **0** |
| limit_value_register.csv | LV-DS05-005..021（11行） | **0**（limit_value / unit 空） |
| performance_requirement_register.csv | PR-DS05-001..028（28行） | 候補分類のみ |
| deemed_to_satisfy_register.csv | DTS-DS05-001..002 | **0**（全フィールド空） |

- 全レジスタ行 `BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT`。
- R7 の照査式・限界・deemed-to-satisfy ルール・条文/表ロケータは**目視確認 0 件**。
- 抵抗側部分係数は DS-05 で別途ゲート。A2 §3.3 と一致。

---

## 3. 主桁の照査項目インターフェース（phase1 再凍結 §6.1）

主桁のデータ・インターフェース対象（数値式は別途採択）:

- 桁高、上下フランジ幅・厚さ、腹板厚、材質
- 断面変化位置、添接位置、断面候補、断面諸量
- 作用力割当
- 曲げ、せん断、組合せ、座屈関連の照査インターフェース

| MT | 旧Apollo 章 | 対象 | 状態 |
|----|------------|------|------|
| MT-070 | Grider_I_07 §7 | 断面変化位置 → 主桁断面セグメント | `NOT_APPLICABLE`（PLANNED、位置編集を照査より先行） |
| MT-071 | Grider_I_07 §7 | 断面計算・断面推定 → 主桁照査と候補比較 | `NOT_AUTHORIZED`（推定と正式判定を区別） |
| MT-072 | Grider_I_07 §7 | 断面チェック・計算書 → check result/report | `NOT_AUTHORIZED`（入力・中間値・判定根拠を保存） |

### 3.1 鋼重

| MT | 旧Apollo 章 | 対象 | 状態 |
|----|------------|------|------|
| MT-120 | Grider_I_12 §12 | 概算鋼重 → SteelWeightModel | `NOT_AUTHORIZED`（割増係数は根拠なしで既定化しない） |
| MT-121 | Grider_I_12 §12 | 実鋼重の解析反映 → 再解析ループ | `NOT_AUTHORIZED`（差分と再解析要求を保存） |

---

## 4. Phase 1B 承認への条件（PKG-SCOPE-P1B）

DS-05 は「ユーザー正式 DS-05 主構造」と「Step1 FROZEN_NARROW 実装境界」の**スコープ衝突を未解決のまま**候補として記録している。Phase 1B 承認には supervisor 決定（DEC-DS05-xxxx / DEC-S1-xxxx）による照査対象範囲の確定が必須。

- この決定が揃うまで、主桁・横桁・対傾構・横構は **candidate のみ**。
- Phase 1A 解析完了が Phase 1B 照査を自動有効化してはならない（fail-closed）。

---

## 5. 数値・式・条項の状態まとめ

| 分類 | Adoption status |
|------|-----------------|
| 主桁 7 限界状態の候補分類（曲げ〜横倒れ） | `BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT` |
| たわみ供用性限界 | `BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT` |
| 照査式の形・係数配置 | `BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT` |
| 許容値・抵抗値・細長比限界 | `BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT` |
| 疲労照査・疲労荷重・detail category | `OUT_OF_SCOPE`（データ境界のみ） |
| 概算鋼重割増係数 | `NOT_AUTHORIZED` |
| 数値実装許可 | `NOT_AUTHORIZED`（A7） |

---

## 6. A5 検証（Self-check）

| Check | Result |
|-------|--------|
| 既存 DS-05 の決定を書き換えていない | PASS |
| VER/LS/LV/PR/DTS の行数・状態が DS-05 と一致（23/23/11/28/2） | PASS |
| R7 照査式・限界値を捏造していない（全て BLOCKED） | PASS |
| 疲労を OUT_OF_SCOPE で扱い、データ境界のみ定義 | PASS |
| fail-closed（解析完了≠照査承認）を維持 | PASS |
| 変更範囲は `docs/apollo/phase_a_integrated_freeze/` + `final_report.txt` のみ | PASS |
| 長文の基準本文転載なし | PASS |
| 採択語彙が DS-00 と一致 | PASS |
| 未完の TODO / TBD / 未採択数値なし | PASS |

---

## 7. A5 決定（decision_log 反映）

| DEC-ID | Date | Decision |
|--------|------|----------|
| DEC-PHA-0013 | 2026-08-02 | Phase A の主桁・たわみ照査ロジックは DS-05 レジスタ（PR/LS/VER/LV/DTS、全 BLOCKED、R7 目視確認 0 件）をそのまま採用する。照査式・係数・許容値は BLOCKED を維持し、捏造しない。 |
| DEC-PHA-0014 | 2026-08-02 | 疲労は Phase 1 で OUT_OF_SCOPE を維持し、照査ロジックは採択しない。Phase A ではデータ境界（疲労用荷重・応力範囲・detail category の入力枠）のみ定義する。概算鋼重の割増係数は根拠なき既定化を禁止する。 |

---

# Part 2 — A6: RC床版・床組・補剛材・添接

## 8. RC床版（rc_deck）の照査分類

| 要求 | 限界状態 | 照査式 | phase1_status | 状態 |
|------|----------|--------|---------------|------|
| PR-DS05-016 曲げ抵抗 | LS-DS05-016 | VER-DS05-016 | `PHASE1_REQUIRED` | `BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT` |
| PR-DS05-017 せん断抵抗 | LS-DS05-017 | VER-DS05-017 | `PHASE1_REQUIRED` | `BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT` |
| PR-DS05-018 供用性 | LS-DS05-018 | VER-DS05-018 | `PHASE1_REQUIRED` | `BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT` |
| PR-DS05-019 最小鉄筋（配筋細部） | LS-DS05-019 | VER-DS05-019 | `PHASE1_REQUIRED` | `BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT` |

- RC床版の曲げ・せん断・供用性・最小鉄筋は Phase 1 で**必須**の候補だが、照査式・限界値・配筋細部は未証跡。
- LV-DS05-018（rc_deck_serviceability_limit）・LV-DS05-019（minimum_reinforcement_limit）: 全 `BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT`（limit_value / unit 空）。
- 非合成床版: 床版を主桁剛性へ加算しない（A1 §4.2 と一致）。合成作用の照査（PR-DS05-026）は `OUT_OF_SCOPE`。

### 8.1 RC床版のデータ・インターフェース（phase1 再凍結 §6.2 / MT-050..053）

| MT | 旧Apollo 章 | 対象 | 状態 |
|----|------------|------|------|
| MT-050 | Grider_I_05 §5 | RC床版・照査位置 → RcDeck check locations | `NOT_AUTHORIZED`（照査横断を stable ID で保存） |
| MT-051 | Grider_I_05 §5 | かぶり・フランジ厚・ハンチ内鉄筋 → 床版詳細入力 | `NOT_AUTHORIZED`（非合成属性を固定） |
| MT-052 | Grider_I_05 §5 | 床版荷重・主鉄筋・配力鉄筋 → 床版照査 | `NOT_AUTHORIZED`（採用基準と正解例が必要） |
| MT-053 | Grider_I_05 §5 | 支点補強筋 → 支点上床版補強 | `NOT_AUTHORIZED`（設計方式の選定が必要） |

床版厚・舗装厚・かぶり・主鉄筋/配力鉄筋・片持床版・ハンチ・支点上補強筋・照査横断位置・荷重入力・計算書セクションがデータ対象（数値式は別途採択）。

---

## 9. 床組（横桁・対傾構・横構・斜材）の照査分類

| 要求 | 部材 | 照査式 | phase1_status | 状態 |
|------|------|--------|---------------|------|
| PR-DS05-009 曲げ抵抗 | cross_girder | VER-DS05-009 | `PHASE1_REQUIRED` | `BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT` |
| PR-DS05-010 せん断抵抗 | cross_girder | VER-DS05-010 | `PHASE1_REQUIRED` | `BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT` |
| PR-DS05-011 安定抵抗 | cross_girder | VER-DS05-011 | `PHASE1_REQUIRED` | `BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT` |
| PR-DS05-012 圧縮安定 | sway_bracing | VER-DS05-012 | `PHASE1_REQUIRED` | `BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT` |
| PR-DS05-013 連結抵抗 | sway_bracing | VER-DS05-013 | `PHASE1_REQUIRED` | `BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT` |
| PR-DS05-014 引張抵抗 | lateral_bracing | VER-DS05-014 | `PHASE1_REQUIRED` | `BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT` |
| PR-DS05-015 安定抵抗 | lateral_bracing | VER-DS05-015 | `PHASE1_REQUIRED` | `BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT` |

- LV-DS05-011（cross_girder stability_slenderness）: `BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT`。
- 有効長・細長比・連結形式・溶接方向の照査インターフェースはデータ対象（数値式は別途採択）。

### 9.1 床組のデータ・インターフェース（phase1 再凍結 §6.3 / MT-100..103）

| MT | 旧Apollo 章 | 対象 | 状態 |
|----|------------|------|------|
| MT-100 | Grider_I_10 §10 | 横桁断面力 → 床組作用力割当 | `NOT_AUTHORIZED`（主桁解析結果との関係を明示） |
| MT-101 | Grider_I_10 §10 | 横桁断面・添接・補剛材 → 床組設計 | `NOT_AUTHORIZED`（断面・連結・補剛材を分割） |
| MT-102 | Grider_I_10 §10 | 対傾構・横構・斜材 → bracing system | `NOT_AUTHORIZED`（配置・有効長・溶接方向を構造化） |
| MT-103 | Grider_I_10 §10 | 横構配置図 → bracing drawing | `NOT_APPLICABLE`（3Dと図面を共通IDで追跡） |

---

## 10. 主桁補剛材の照査分類

補剛材は DS-05 で個別照査式行を持たない（candidate 分類は phase1 再凍結 §6.4 のデータ・インターフェース）。データ対象は支点上補剛材・中間垂直補剛材・水平補剛材・格点補剛材・補強リブ・水平補剛材ラップ範囲・溶接条件。

| MT | 旧Apollo 章 | 対象 | 状態 |
|----|------------|------|------|
| MT-110 | Grider_I_11 §11 | 支点上補剛材 → Bearing stiffener | `NOT_AUTHORIZED`（支点反力・溶接条件が必要） |
| MT-111 | Grider_I_11 §11 | 中間補剛材 → Intermediate stiffener | `NOT_AUTHORIZED`（パネル寸法・せん断力と連携） |
| MT-112 | Grider_I_11 §11 | 水平補剛材ラップ → Horizontal stiffener lap | `NOT_AUTHORIZED`（照査方式の採択が必要） |

補剛材の照査式・必要断面・溶接条件は `BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT`（R7 目視確認未達）。

---

## 11. 添接（splice）の照査分類

| 要求 | 部材 | 照査式 | phase1_status | 状態 |
|------|------|--------|---------------|------|
| PR-DS05-022 連結抵抗 | member_connection | VER-DS05-022 | `PHASE1_REFERENCE` | `BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT` |
| PR-DS05-023 力伝達 | member_connection | VER-DS05-023 | `PHASE1_REFERENCE` | `BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT` |

- 添接は Phase 1 で `PHASE1_REFERENCE`（境界・参照扱い）。照査式・ボルト条件・摩擦・母材条件は未証跡。
- 高力ボルト物性（MAT-DS03-026..030）・滑り係数（μs）・ボルト孔支圧強度は全て `BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT`（A2 §2.2 と一致）。
- 摩擦接合の滑り係数は表面処理クラスを含む道示表の目視確認が必要。旧Apollo 既定値不使用。

### 11.1 添接のデータ・インターフェース（phase1 再凍結 §6.5 / MT-080..082）

| MT | 旧Apollo 章 | 対象 | 状態 |
|----|------------|------|------|
| MT-080 | Grider_I_08 §8 | フランジ・腹板ボルト配置 → Splice geometry | `NOT_AUTHORIZED`（配置成立性を先に検証） |
| MT-081 | Grider_I_08 §8 | 添接計算 → Splice check | `NOT_AUTHORIZED`（ボルト・摩擦・母材条件の採択が必要） |
| MT-082 | Grider_I_08 §8 | 詳細計算書 → Splice report chapter | `NOT_AUTHORIZED`（正式照査が許可された項目のみ出力） |

上/下フランジ・腹板・ボルト径/等級/本数・ピッチ/ゲージ/端距離・添接板・作用力分担・配置成立性・詳細計算書データがデータ対象（数値式は別途採択）。

---

## 12. 支承境界（bearing_boundary）

| 要求 | 限界状態 | 照査式 | phase1_status | 状態 |
|------|----------|--------|---------------|------|
| PR-DS05-020 支承圧抵抗 | LS-DS05-020 | VER-DS05-020 | `PHASE1_REFERENCE` | `BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT` |
| PR-DS05-021 支承移動回転 | LS-DS05-021 | VER-DS05-021 | `PHASE1_REFERENCE` | `BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT` |

- LV-DS05-020（bearing_pressure）・LV-DS05-021（bearing_movement_rotation）: `BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT`。
- 支承材料クラス・エラストマー物性・支承板鋼材（MAT-DS03-034..036）は BLOCKED。H31 支承便覧は `REFERENCE_ONLY`。
- 支承は Phase 1 で `PHASE1_REFERENCE`（境界・参照扱い）。

---

## 13. A6 数値・式・条項の状態まとめ

| 分類 | Adoption status |
|------|-----------------|
| RC床版 4 限界状態（曲げ/せん断/供用性/最小鉄筋） | `BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT`（PHASE1_REQUIRED 候補） |
| 床組 7 照査（横桁3 / 対傾構2 / 横構2） | `BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT`（PHASE1_REQUIRED 候補） |
| 補剛材 照査式・溶接条件 | `BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT` |
| 添接・接合照査（ボルト/摩擦/母材） | `BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT`（PHASE1_REFERENCE） |
| 支承境界照査 | `BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT`（PHASE1_REFERENCE） |
| 床版厚・鉄筋径・ボルト径などの例示値 | 正式値にしない（MT-030 等と一致） |
| 数値実装許可 | `NOT_AUTHORIZED`（A7） |

---

## 14. A6 検証（Self-check）

| Check | Result |
|-------|--------|
| 既存 DS-05 の決定を書き換えていない | PASS |
| PR/LS/VER の部材対応（床版016-019 / 床組009-015 / 接合022-023 / 支承020-021）が DS-05 と一致 | PASS |
| R7 照査式・限界値を捏造していない（全て BLOCKED） | PASS |
| MT-050..053 / 080..082 / 100..103 / 110..112 が manual_traceability.csv と一致 | PASS |
| 画面例・サンプル値を正式値にしていない | PASS |
| 変更範囲は `docs/apollo/phase_a_integrated_freeze/` + `final_report.txt` のみ | PASS |
| 長文の基準本文転載なし | PASS |
| 採択語彙が DS-00 と一致 | PASS |
| 未完の TODO / TBD / 未採択数値なし | PASS |

---

## 15. A6 決定（decision_log 反映）

| DEC-ID | Date | Decision |
|--------|------|----------|
| DEC-PHA-0015 | 2026-08-02 | Phase A の RC床版・床組・補剛材・添接の照査ロジックは DS-05 レジスタの候補分類をそのまま採用する。照査式・許容値・配筋・ボルト条件は BLOCKED を維持し、画面例を正式値にしない。 |
| DEC-PHA-0016 | 2026-08-02 | 添接・支承境界は PHASE1_REFERENCE を維持し、正式照査は PKG-SCOPE-P1B 等の決定後とする。非合成床版の合成作用照査（PR-DS05-026）は OUT_OF_SCOPE を維持する。 |

| DEC-ID | Date | Decision |
|--------|------|----------|
| DEC-PHA-0013 | 2026-08-02 | Phase A の主桁・たわみ照査ロジックは DS-05 レジスタ（PR/LS/VER/LV/DTS、全 BLOCKED、R7 目視確認 0 件）をそのまま採用する。照査式・係数・許容値は BLOCKED を維持し、捏造しない。 |
| DEC-PHA-0014 | 2026-08-02 | 疲労は Phase 1 で OUT_OF_SCOPE を維持し、照査ロジックは採択しない。Phase A ではデータ境界（疲労用荷重・応力範囲・detail category の入力枠）のみ定義する。概算鋼重の割増係数は根拠なき既定化を禁止する。 |
