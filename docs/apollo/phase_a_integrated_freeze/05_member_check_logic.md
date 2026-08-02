# Phase A — 05 主桁・たわみ・疲労 照査ロジック 凍結

**Authority:** Phase A integrated freeze (A5)
**Date:** 2026-08-02
**Step:** A5 — 主桁・たわみ・疲労
**Integration base:** DS-05 (`docs/apollo/design-standards/05_verification/`), DS-03/04/06（参照）, phase1_design_expansion_refreeze（MT-070..072, 090..091, 120..121, 130..132）
**Adoption vocabulary:** DS-00 `adoption_status_model.md` と同一語彙を使用する。

本ファイルは Phase A 統合の一部として、**主桁・たわみ・疲労の照査ロジック**の統合状態を再凍結する。既存 DS-05 の決定を書き換えず、レジスタへ参照整合を保持する。

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
