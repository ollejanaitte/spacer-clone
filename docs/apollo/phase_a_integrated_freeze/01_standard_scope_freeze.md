# Phase A — 01 基準・版・適用範囲 凍結

**Authority:** Phase A integrated freeze (A1)
**Date:** 2026-08-02
**Step:** A1 — 基準・版・適用範囲
**Integration base:** DS-01 (`docs/apollo/design-standards/01_target_standard/`), DS-00 (`00_governance/`), phase1_design_expansion_refreeze (`scope_and_architecture_freeze.md`)
**Adoption vocabulary:** DS-00 `adoption_status_model.md` と同一語彙を使用する。

本ファイルは Phase A 統合の一部として、**対象設計基準・版・正誤表・適用範囲**を再凍結する。既存 DS-01/DS-00 の決定を書き換えず、参照整合を保持する。

---

## 1. 対象設計基準（Target Standard）

| Field | Value | Adoption status | Source |
|-------|-------|-----------------|--------|
| **Family label** | 道路橋示方書・同解説 令和7年改訂版 | `ADOPTED` | SRC-R7-1..5, [DS-01 target_standard_freeze](../design-standards/01_target_standard/target_standard_freeze.md) |
| **MLIT official press release** | 「橋、高架の道路等の技術基準」（道路橋示方書）の改定について (2025-08-22) | `ADOPTED` | SRC-MLIT-20250822, DS-01 `EVD-DS01-001` |
| **Application start (new designs)** | 2026-04-01 | `ADOPTED` | SRC-MLIT-20250822, DS-01 `EVD-DS01-001` |
| **Publisher / distributor** | 公益社団法人 日本道路協会 (JRA) | `ADOPTED` | SRC-R7-1..5, DS-01 |
| **Design philosophy** | 性能規定型設計 (performance-based design) | `ADOPTED` | DS-01 `performance_based_design_philosophy.md`, DEC-DS00-0001 |
| **Verification format** | 部分係数法 (partial-factor method) | `ADOPTED` | DS-01 `partial_factor_method_framework.md`, DEC-DS00-0001 |

---

## 2. 版・正誤表（Edition / Errata）

### 2.1 採用基準

| Baseline element | Value | Adoption status | Source |
|------------------|-------|-----------------|--------|
| **Electronic baseline** | JRA e-book Ver2.00 (2025-12-19, errata-reflected) | `ADOPTED_WITH_CONDITION` | SRC-R7-1..5, DS-01 |
| **Errata overlay** | 公式正誤表 2026-03-31 (`20260331.pdf`) | `ADOPTED_WITH_CONDITION` | SRC-R7-ERR-20260331, DS-01 `EVD-DS01-004` |
| **Adopted reference baseline** | Ver2.00 **plus** 2026-03-31 正誤表 overlay | `ADOPTED_WITH_CONDITION` | DS-01 |
| **Superseded errata** | 2025-12-12 正誤表 (`20251212.pdf`) — Ver2.00 に反映済み | `SUPERSEDED_EQUIVALENT` | SRC-R7-ERR-20251212, DS-01 `EVD-DS01-003` |
| **Local licensed copies** | Image-export PDF (リポジトリ外保管, `local-archive/restricted-pdf/bridge-standards/260726_設計基準/`) | `ADOPTED_WITH_CONDITION` | SRC-R7-1..5 |

### 2.2 注意点

- ローカル購入版はテキスト層のない IMAGE_SCAN PDF のため、**条文引用は人の目視確認が必要**。自動 OCR は正式根拠にしない。
- 2026-03-31 正誤表の一部項目は電子版・紙版に未反映。採用基準は「Ver2.00 + 2026-03-31 正誤表 overlay」で固定する。
- 版・正誤表の詳細レジスタは DS-01 `edition_and_errata_register.csv`、証跡は `ds01_evidence_register.md`（`EVD-DS01-*`）を参照。

---

## 3. 公式巻構成と Phase 1 巻別役割

| Volume | 公式 MLIT ラベル | JRA e-book ISBN (Ver2.00) | Phase 1 役割 | Adoption status |
|--------|------------------|---------------------------|--------------|-----------------|
| **I** | 共通編 | 978-4-88950-801-7 | Primary — 共通規定・荷重・材料 | `ADOPTED_WITH_CONDITION` |
| **II** | 鋼部材・鋼上部構造編 | 978-4-88950-802-4 | Primary — 非合成鋼鈑桁上部構造 | `ADOPTED_WITH_CONDITION` |
| **III** | コンクリート部材・コンクリート上部構造編 | 978-4-88950-803-1 | Primary — 非合成RC床版 | `ADOPTED_WITH_CONDITION` |
| **IV** | 下部構造編 | 978-4-88950-804-8 | Reference — 下部構造本体は OUT | `REFERENCE_ONLY` |
| **V** | 上下部接続部編 (MLIT / FAQ / ローカル印刷) | 978-4-88950-805-5 | Selected topics — 支承・伸縮・接続部境界 | `ADOPTED_WITH_CONDITION` |

**Volume V 題名揺れ:** JRA 商品ページは「上下部接続部**構造**編」。MLIT / FAQ / ローカル印刷は「上下部接続部編」。統合記録では出典の題名をそのまま使い、**無言の正規化をしない**。

詳細: [DS-01 applicable_volumes_and_sections](../design-standards/01_target_standard/applicable_volumes_and_sections.md)

---

## 4. Phase 1 適用橋種（アーキタイプ）

### 4.1 対象（IN）— DS-00 `design_standard_scope.md` / phase1 再凍結と一致

| Dimension | Phase 1 (IN) |
|-----------|--------------|
| Alignment | 直橋 |
| Girder depth | 等桁高 |
| Deck / girder system | 非合成RC床版鋼鈑桁（多主桁） |
| Span system | 単純1径間 |
| Skew | 90°（直角） |
| Main girders | 約4–6主桁 |
| Analysis | 静的線形 |
| Bearing | 固定・可動支承 |
| Members | RC床版・舗装・ハンチ、横桁（中間/端/支点上）、対傾構、上/下横構、斜材、主桁補剛材、主桁添接 |
| Output | 鋼重・たわみ/剛比・疲労のデータ境界、標準断面/側面構成/配置図/計算書の生成基盤 |

### 4.2 対象外（OUT）

合成桁としての床版有効幅・合成断面計算 / 床版を主桁剛性へ加算 / 曲線・拡幅・斜橋・変桁高 / 箱桁・鋼床版・PC床版 / 複数径間連続桁 / 耐震設計 / 疲労照査（Phase 1 では OUT、Phase A でデータ境界は定義）/ 架設段階解析 / 非線形解析 / 下部構造本体設計 / 製作詳細図完全自動化 / 旧Apolloとの数値同値保証。

**非合成規則（再凍結）:**

```text
compositeAction = false
compositeShearConnector = 禁止
DeckAnchorage = 合成作用とは独立（数値照査は NOT_AUTHORIZED）
```

---

## 5. 旧版・支持資料の排除

| Source class | Disposition |
|--------------|-------------|
| 平成29年11月版 (H29) 道示 および H29 整合数値 | `OUT_OF_SCOPE`（数値権威として） |
| H29 対応設計例（合成桁・箱桁） | `OUT_OF_SCOPE`（機能構成・処理順の参考に限定） |
| R2 鋼便覧 / H31 支承便覧 / DDB / 鋼橋構造詳細の手引き | `REFERENCE_ONLY` |
| 旧Apollo マニュアル（Grider_I_00..13, SuperDesigner 等） | `REFERENCE_ONLY`（機能構成・処理順の参考のみ） |
| JIP-SPACER / JIP-LINER / LINER サンプル計算書 / level2-type2 | `REFERENCE_ONLY` |
| ブログ・二次資料 | 数値採択禁止 |

---

## 6. 数値・式・条項の状態

| 分類 | Adoption status | 理由 |
|------|-----------------|------|
| 基準の名称・版・正誤表・適用開始日 | `ADOPTED` | DS-01 で確定済み |
| 巻別 Phase 1 役割 | `ADOPTED_WITH_CONDITION` | 条文マッピング未確定 |
| 条文番号・節・表・図の厳密な対応 | `BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT` | ローカルPDFは画像、目視確認が必要 |
| 部分係数・許容値・材料強度などの数値 | `BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT` | DS-04/DS-05（Phase A: A2/A3）で確定 |
| 照査式の正確な形・係数配置 | `BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT` | A5/A6 で確定 |
| JIS 材料規格 34 ギャップ行 | `BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT` | JIS 一次資料取得後（A2） |
| 数値実装許可 | `NOT_AUTHORIZED` | 部材・照査単位で A7 ゲート管理 |

---

## 7. A1 検証（Self-check）

| Check | Result |
|-------|--------|
| 既存 DS-01 / DS-00 の決定を書き換えていない | PASS |
| 既存レジスタ・決定ID・証跡IDへの参照が整合 | PASS |
| 数値を捏造していない（全て BLOCKED / NOT_AUTHORIZED） | PASS |
| 変更範囲は `docs/apollo/phase_a_integrated_freeze/` + `final_report.txt` のみ | PASS |
| 長文の基準本文転載なし | PASS |
| Volume V 題名揺れを正規化していない | PASS |
| 採択語彙が DS-00 と一致 | PASS |
| 未完の TODO / TBD / 未採択数値なし | PASS |

---

## 8. A1 決定（decision_log 反映）

| DEC-ID | Date | Decision |
|--------|------|----------|
| DEC-PHA-0005 | 2026-08-02 | Phase A の対象基準・版・正誤表は DS-01 の採用基準（道路橋示方書・同解説 令和7年改訂版 / Ver2.00 + 2026-03-31 正誤表 overlay）をそのまま採用し、再凍結する。 |
| DEC-PHA-0006 | 2026-08-02 | Phase A の適用範囲は DS-00 / phase1 再凍結の IN/OUT をそのまま踏襲する。Phase 1 では耐震・疲労照査・下部構造本体は OUT、疲労はデータ境界のみ定義する。 |
