# Phase 5-01 Step D-01: Load / Analysis / Design Check 設計（凍結案）

## 1. 目的

Phase 5-02で扱う荷重仕様・解析（grillage/solver）データフロー・
設計チェック範囲を凍結する。Phase 5-02実装時に追加設計判断が不要なレベルまで確定する。

- baseline: `9fb58d5aa096567bc9a570d7800445c81bf9876c`（Step C merge後）
- 日付: 2026-08-12

## 2. Load Model 設計（凍結・WP-E）

### 2.1 Phase 5-02で扱う荷重（凍結）

| 分類 | 内容 | 扱い |
|---|---|---|
| DL-STRUCTURAL（構造体自重） | 鋼主桁＋横桁・横構・支承（**partition明示・二重計上防止**） | **実装**（`structuralGirder` + `structuralSecondary`） |
| DL-DECK | RC床版自重 | **実装**（deckConfiguration.thicknessM×unitWeight） |
| DL-PAVEMENT | 舗装荷重 | **入力境界**（暫定値or MISSING・実装は後続） |
| DL-APPURTENANCE | 高欄・地覆・中央分離帯・付属物 | **入力境界**（load caseとして宣言のみ・実装は後続） |
| LL（live load） | 活荷重 | **本実装しない**（`liveLoadReference: null` 明示）。入力境界のみ |

- **partition規則**: DL-STRUCTURAL = 鋼主桁 + 横桁 + 横構 + 支承。DL-DECK = RC床版のみ。
  各caseの包含範囲を明示し、**同一部材を複数caseで二重計上しない**

### 2.2 Load Case / Combination（凍結）

- load cases: `DL-STRUCTURAL`（構造体自重: 主桁+横桁+横構+支承）/ `DL-DECK`（床版）
  / `DL-PAVEMENT`（舗装・空）/ `DL-APPURTENANCE`（付属物・空）/ `LL`（活荷重・空）
- load combination（Phase 5-02）: `COMBO-1 = DL-STRUCTURAL + DL-DECK`（基本）
  - 活荷重・その他組合せは後続Phase。`combinations`は宣言構造のみ
- 係数: Phase 5-01では1.0（REFERENCE）。部分係数は設計check PhaseでDS採用後に確定

### 2.3 座標・符号・単位（凍結）

- 座標: domain（x沿線/y横断/z標高・m）。力 kN・モーメント kNm
- 符号: 荷重は重力方向 -z（下向き負）。反力は支承を上方に押す力 +z（Phase 6 Handoff整合）
- provenance: 各load caseに source / state（CONFIRMED/DERIVED/MISSING/NOT_AUTHORIZED）
- fail-closed: 未対応load kindはreject。MISSINGは許容（発明しない）
- validation: 数値有限・単位列一致・caseId一意

### 2.4 既存load資産の再評価（DEFER判定の見直し・凍結）

| 既存資産 | Phase 5-02での扱い |
|---|---|
| `appurtenanceHaunchLoadModel.ts`（SegmentDeadLoad） | **新load modelには流用しない**（旧Apollo向け）。負荷配分の考え方（nearest/equal/own-girder）は新死荷重配分の参考。Phase 5-02は**単純なgirder均等配分**を既定（詳細な付属物配分は後続） |
| `appurtenanceHaunchAnalysisAdapter.ts` | **使用しない**（旧Apollo閉形式）。新解析はgrillage経路 |
| `loads/appurtenanceHaunchLoadModel` | 旧システム用に維持（REFERENCE） |

## 3. Analysis 設計（凍結・WP-F）

### 3.1 データフロー（凍結）

```
SuperstructureDocument（loadModel・girderConfiguration・deckConfiguration）
  → Analysis Adapter（新規: SuperstructureDocument → grillage input）
  → buildGrillageModel（既存KEEP: GeometrySnapshot → GrillageModel）
  → backend engine/grillage.py（KEEP）→ solver.py（KEEP）
  → GrillageResult（member forces / reactions）
  → DesignResult（基本照査入力）
  → ReactionResult（Phase 6 Handoff入力）
```

### 3.2 モデル生成仕様（凍結）

| 項目 | 仕様 |
|---|---|
| node生成 | support station × girder offset の交点（既存buildGrillageModel流儀・snapshot SupportPoint利用） |
| member生成 | 主桁: 支間毎の縦部材 / 横桁: 各support位置の横部材（既存流儀） |
| support条件 | 全girder nodeに鉛直支持（既存流儀）。bearing条件（固定/可動）はPhase 5-02では**全支持・鉛直のみ**（bearingモデル化は後続） |
| stiffness | 主桁: SuperstructureDocumentの断面性能（宣言値。MISSING時は解析不可fail-closed） |
| section properties | `sectionProperties.computeGirderSectionProperties`（I-beam・KEEP） |
| loads | dead loads（2.1）をgirder lineへ配分（均等配分既定） |
| solver入力 | backend grillage（JSON）・authorization NOT_GRANTEDゲート維持 |
| solver出力 | member forces / reactions（kN / kNm） |

### 3.3 力・モーメント・反力の符号規約（凍結）

- member force: 軸力N（引張+）/ せん断V（縦断平面・正の符号は後方定義を明示）/
  曲げM（下縁引張+を既定とする設計用定義）
- reaction: 支承を押し上げる方向を +z 正（鉛直反力Rz）。水平・モーメント反力はPhase 5-02では
  算出しない（支持条件が鉛直のみのため）。Mx/My/Mzは0または算出対象外
- **反力の扱い（明確化）**: Phase 5-02で算出する反力は**NOT_AUTHORIZEDの基本解析結果**。
  「認証済みの反力本計算」は対象外。Phase 6へは入力データとして受け渡し（A-01 §4.24・D-02準拠）
- 詳細符号はPhase 5-02実装時に本設計書の規定に従う（追加設計判断なし）

### 3.4 エラー処理・fail-closed（凍結）

- 断面性能未宣言（MISSING）→ 解析実行不可（fail-closed・エラー表示）
- 解析戻り authorization が `NOT_GRANTED` → 結果は**常にNOT_AUTHORIZEDとして保持**（昇格禁止。
  authorizedと返された場合も人の承認を経由するまでNOT_AUTHORIZEDのまま）
- solverがNaN/Infinityを返した場合 → fail-closed（結果破棄・エラー）
- 未対応モデル（SIMPLE_MULTIPLE・ボックス桁等）→ 解析要求reject

### 3.5 bridge_fem_generator.py の扱い（再掲・凍結）

- 新経路では**呼ばない**。grillage経路を正とする（Phase5-01B-02参照）

## 4. Design Check 設計（凍結・WP-G）

### 4.1 Phase 5-02で実装する基本照査（IN-SCOPE）

| check | 内容 | 入力 |
|---|---|---|
| SECTION-PROPERTIES | 断面性能計算（Area/Ix/Iy/断面係数・web/flange厚） | SuperstructureDocument断面（宣言値） |
| GIRDER-BENDING-BASIC | 主桁曲げ基本照査（応力度σ = M/Z ≤ 許容応力度or材料強度/係数） | grillage member force・section properties |
| GIRDER-SHEAR-BASIC | 主桁せん断基本照査（τ = V·S/(I·tw)） | grillage member force・断面 |
| GIRDER-DEFLECTION-BASIC | 主桁たわみ（δ ≤ 規制値・基本） | 解析変位 |
| CROSSBEAM-BASIC | 横桁基本照査（横部材曲げ・せん断） | grillage cross-girder force |
| BEARING-BASIC | 支承基本照査（反力 ≤ 支承許容・概算） | reaction |

- 許容応力度・規制値: Phase 5-01では**REFERENCE保持**。実装時にDS-00..09採用値へ接続する
  設計インターフェース（`designConditions`）を定義し、値は採用Phaseで確定
- **入力MISSING時の挙動（明確化）**: 断面（depthM/web/flange等）または解析結果が
  MISSING/NOT_AVAILABLEの場合、該当checkは**NOT_AVAILABLE（照査保留）** とし、OK/NGと判定しない
  （fail-closed・自動判定禁止）
- 各check結果: `designStatus` に OK/NG/WARNING/STALE/NOT_AUTHORIZED を記録
- 自動昇格禁止（NOT_AUTHORIZED→OKは人手承認を経由）

### 4.2 Phase 5-02で実装しないもの（OUT-OF-SCOPE・明示）

- 床版鉄筋設計・ひび割れ照査（詳細）
- 横構（sway/lateral）部材照査（配置のみ）
- 支点上補剛材・中間補剛材・継手照査
- 活荷重載荷・影響線・移動載荷・包絡線
- 疲労照査
- 耐震照査・地震時保有水平耐力
- 合成桁（非合成固定のため不要）
- 部分係数法の数値適用（採用Phase）
- 詳細たわみ（クリープ・乾燥収縮等）

### 4.3 既存checkFrameworkの扱い（凍結）

- 既存`RB001_DECLARED_CHECKS`（10check・NOT_AUTHORIZED）は旧システム用に維持
- 新Phase 5-02のcheck registryは`basicChecks`（上記6種）として新module内に定義
  （RB001宣言の「ID・kind・ruleReference」構造は踏襲）

## 5. Reference Bridge比較に必要な出力（凍結・WP-G/WP-J）

- 各checkの入力値（M/V/δ/反力）と結果を、Reference Bridge Expected Data
  （Phase5-01E-02）と比較できる形で出力（単位・符号統一）

## 6. 検証・tests観点（WP-E/F/G）

- Load: 死荷重配分・case一意・fail-closed（MISSING）
- Analysis: モデル生成（node/member/support）・grillage往復・符号規約・NOT_GRANTEDゲート
- Design Check: 各基本照査の入力/出力/判定・自動昇格禁止・OUT-OF-SCOPE拒否
