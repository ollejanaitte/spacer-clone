# Phase 7-01E: Reference Analysis / Golden（設計Freeze）

- Phase: 7-01 Step E
- baseline: `4c6df0d8ff089e5c8ad8293867321e7da023c2e3`
- 日付: 2026-08-13
- 凍結: Design Decision D-05 / D-17
- 対応R: R9 / R16

## 1. 目的

統合Bridge解析goldenを整備する設計を凍結する。
**Phase 7-02でtestを通すためexpectedの変更を禁止**。

## 2. Reference Analysisモデル（Freeze・5種）

| # | モデル | 解析種別 | golden性質 |
|---|---|---|---|
| 1 | simple beam（単純梁） | linear static | **closed-form照合**（authoritative） |
| 2 | continuous beam / frame（連続梁・門型フレーム） | linear static | **closed-form/反力釣合い照合** |
| 3 | spring support model（弾性支持） | linear static（spring対応後） | closed-form照合（1DOF spring等） |
| 4 | grillage model（グリレージ） | linear static | 配分・横桁・縦横部材のregression + 釣合い照合 |
| 5 | RB-S10-001統合Bridge解析 | linear static | **regression golden + 検証照合**（下記§5） |

## 3. Goldenモデル詳細（Freeze）

### 3.1 simple beam

| 項目 | 値 |
|---|---|
| source | `examples/verification/simple_beam_center_load.json` + `sample_models.py:simply_supported_center_load`（KEEP） |
| geometry | 支間4.0m・単純支持 |
| material/section | E=205 MPa・A=0.02 m²・I=0.0001 m⁴・J=0.00005 m⁴（既存KEEP） |
| supports | 両端ピン+ローラー（既存） |
| loads | 中央集中 P=10kN・分布 w=2kN/m（別case） |
| expected | 集中: δ=PL³/48EI・反力P/2・Mmax=PL/4／分布: δ=5wL⁴/384EI・反力wL/2・Mmax=wL²/8（closed-form） |
| unit/sign | m・kN・kNm・+z up |
| tolerance | 既存meta（KEEP） |
| analysis type | linear_static |

### 3.2 continuous beam / frame

| 項目 | 値 |
|---|---|
| source | 新規golden fixture（`examples/analysis/continuous_beam.json`・`portal_frame.json`） |
| geometry | 2径間連続梁（等支間）+ 門型フレーム |
| expected | 反力釣合い（ΣR=Σ荷重・COMBO-1総荷重）+ **支間対称性**（外径間40.201/40.200がほぼ等しいことから、等分布COMBO-1で中央支間の反力・変位が対称・僅差許容）+ closed-form（連続梁の3モーメント法） |
| tolerance | 1e-6相対 |

### 3.3 spring support model

| 項目 | 値 |
|---|---|
| source | 新規fixture（`examples/analysis/spring_support.json`） |
| geometry | 単純梁の一端を弾性縦spring支持（k=100 kN/m）等 |
| expected | closed-form（ばね支持梁のたわみ・反力） |
| tolerance | 1e-6相対 |
| 備考 | spring solver対応後のgolden（WP-D/WP-G後） |

### 3.4 grillage model

| 項目 | 値 |
|---|---|
| source | RB001_GRILLAGE（`test_grillage.py` fixture・KEEP）を正規fixtureへ昇格（`examples/analysis/grillage.json`） |
| geometry | 4 support × 2 girder・3径間（40.201/51.000/40.200） |
| loads | DL配分（部材分布載荷）+ COMBO-1 |
| expected | 総反力=総荷重（**COMBO-1総荷重との釣合い**）・支間対称性（等分布COMBO-1・外径間対称）・**regression snapshot**（決定論出力凍結・NOT_AUTHORIZED） |
| tolerance | 釣合い1e-9相対・regression 1e-12（snapshot一致） |

### 3.5 RB-S10-001統合Bridge解析

| 項目 | 値 |
|---|---|
| source | RB-S10-001 input/model/design golden（KEEP）→ AnalysisDocument生成 |
| geometry | 支間 40.201/51.000/40.200・橋長134.001・AG1/AG2（offset 1.47689/-3.02859）・4 support（AR2/PR1/PR2/PU15） |
| material/section | design goldenのsection_property（uflg/web/lflg）→ I断面性能導出（WP-E） |
| supports | bearing mapping（fixed/movable定義はdesign golden・UNDECIDEDは既定） |
| loads | DL-STRUCTURAL/DL-DECK（SuperstructureDocument由来・部材分布）・COMBO-1 |
| expected displacement/reaction/member force | **sourceに解析goldenが無いため「発明しない」**（下記§5方針） |
| analysis type | linear_static |

## 4. Golden Provenance（Freeze）

- 各goldenは `{goldenId, source(原文/実測/closed-form/regression), derivation, authorized, unit, tolerance}` を保持。
- closed-form照合（1・2・3）: **authoritative**（design用ではない・解析solver検証）。
- regression（4・5）: **development/regression**（決定論出力凍結・NOT_AUTHORIZED・設計には未認証）。
- 値の出所を明記し、発明を排除。

## 5. RB-S10-001解析goldenの昇格方針（R9・Freeze）

Phase 7-00でRB-S10-001のanalysis goldenはNOT_AVAILABLE（`analysis_result_parity_note.md`・`EXCLUDED_ANALYSIS_RESULT`）。

| 種別 | 扱い |
|---|---|
| 入力golden（geometry/model/design） | **KEEP・昇格**（AnalysisDocument生成のsource・変更禁止） |
| 解析expected値（displacement/reaction/member force） | **sourceに存在しないため発明しない**。`SOURCE_NOT_AVAILABLE` として閉じる |
| 解析結果（実測） | **regression goldenとして凍結**（Phase 7-02実装で決定論出力snapshot・`NOT_AUTHORIZED`・development用） |
| 検証照合 | 反力釣合い（**ΣR=COMBO-1総荷重**）・**支間対称性**（等分布COMBO-1・外径間対称・横断方向は非対称のため対象外）・非負剛性等の**invariant検証**をacceptanceに使用（発明値ではなく数学的不変量） |
| 原文候補（phase2_ii candidates AN-039/040等） | 既存 `EXCLUDED_ANALYSIS_RESULT` を維持（`KNOWN_DATA_DISCREPANCY` 相当として閉じる） |

- **Phase 7-02のRB-S10-001 Completion条件**: 解析が実行でき・invariant検証（釣合い・対称性）をPASSし・regression snapshotが安定（決定論）すること。設計用expected値は未認証。

## 6. expected変更禁止（Freeze）

- 本設計書のgolden expected（1・2・3のclosed-form値・4・5のregression snapshot・tolerance）は
  **Phase 7-02でtestを通すため変更禁止**。
- 変更が必要な場合はDesign Change手続き（Freeze Gate再評価）を要する。

## 7. 保存場所（Freeze）

- `examples/analysis/`（新規・golden入力）
- `backend/tests/fixtures/analysis/`（新規・expected）
- `docs/rebuild/phase7/evidence/`（provenance）

## 8. tests観点

- 5種goldenの照合（closed-form・invariant・regression）
- tolerance一致
- expected変更禁止のguard
