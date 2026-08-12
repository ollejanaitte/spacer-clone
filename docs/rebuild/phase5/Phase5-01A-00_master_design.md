# Phase 5-01 Step A-00: Phase 5 Master Design（骨格・凍結案）

## 1. 本設計書の位置づけ

Phase 5-01「Phase 5全体完全設計・Design Freeze」の全体骨格。
Phase 5（上部工）のスコープ・原則・モジュール構造・ドキュメント階層・
データフロー・Phase 5-02 Work Package概要を確定し、
詳細設計書（A-01以降）への索引とする。

- baseline: `4b58eae0a23d0670fc9c848eb3af3d20a08f9639`（Phase 5-00 Final Report merge後・GitHub main確認済み）
- 日付: 2026-08-12
- 本設計書は設計専用。Phase 5-02（実装）への越境はしない。

## 2. Phase 5 スコープ

### 2.1 Phase 5 = 上部工（Superstructure）

正式設計順序: 道路 → 地形・現況 → 橋梁配置 → **上部工** → 下部工 → FEM → CIM → 成果品

- Phase 5の正式対象: 鋼鈑桁橋（プレートガーダー・RC床版・非合成）を第一正とする
- 正本: **SuperstructureDocument**（modules.superstructure.data.superstructureDocument）
- 入力正本: BridgeLayoutDocument（唯一正本）から派生する Span Handoff / Support Handoff
- 下流: Phase 6下部工への Bearing / Reaction Handoff

### 2.2 Phase 5で扱う範囲（IN-SCOPE）

- SuperstructureDocument（正本）の確立・validation・persistence
- Bridge Layout → 上部工 の入力接続（Span/Support Handoff利用）
- 上部工Geometry（主桁配置・床版・横桁・横構・支承配置）生成
- 統合3D Viewer（Road+Terrain+Existing+Bridge Layout+Superstructure同一座標表示）
  - ※ **統合viewer表示はPhase 5-02対象。CIM exportは後続Phase（DEFER）**
- 死荷重モデル（自己重量・床版・舗装・付属物）の整理
- 解析（grillage/solver）データフローの接続（**NOT_AUTHORIZED基本解析**）
- 基本設計チェック（断面性能・桁力・応力度・たわみ・基本照査）
- Bearing / Reaction Handoff（Phase 6へ）
- Persistence（Auto Save / Restart Restore / .spacerproj）
- Reference Bridge比較・E2E・Completion Gate

### 2.3 Phase 5で扱わない範囲（OUT-OF-SCOPE・明示）

- 主桁自動設計・断面最適化（詳細設計は後続）
- 床版・横桁・横構の鉄筋・断面詳細設計（基本照査のみ）
- 支承詳細設計（形式選定の基本のみ・詳細は後続）
- 活荷重本計算・荷重組合せ本計算（死荷重のみ。活荷重は入力境界）
- FEM本計算（grillageによる基本解析のみ。**認証済みの反力・解析本計算は対象外**）
- 支点反力の認証済み本計算（NOT_AUTHORIZEDの基本解析結果の受け渡しは対象）
- CIM export・図面・計算書・数量・成果品（成果品Phase）
- Phase 6下部工本体
- 旧システム（App.tsx / Apolloパイプライン）の改修

## 3. 設計原則（Phase 5-00踏襲・凍結）

1. Project Data Core（PDC）が最上位正本
2. BridgeLayoutDocumentはBridge Layout唯一正本
3. SuperstructureDocumentは上部工の正本（新規・既存複製ではない）
4. 旧BridgeProject / Apolloを新正本にしない
5. Connector / Adapter内に別正本を作らない
6. Road / Terrain / Existing正本を上部工へ複製しない（ID/reference境界優先）
7. Road geometryを上部工側で再実装しない（Road Module公式API利用）
8. Viewer都合で正本を書き換えない（renderCoordinateは表示変換のみ）
9. 既存上部工資産を最大限再利用（KEEP/ADAPT判定に従う）
10. 曖昧なTODO・TBD・実装時判断をDesign Freeze後へ残さない

## 4. モジュール構造（PDC接続）

- 新モジュール: `modules.superstructure`（Phase 5-00で登録済み・空slot）
- 登録方式（既知・手順化）:
  - `project/schema.ts`: PROJECT_MODULE_KEYS 追加（済）＋ strictObject（済）
  - `modules/registry.ts`: ModuleDefinition（済: displayName「上部工」・dependencies ["bridgeLayout"]）
  - 実装: SuperstructureModuleAdapter（read/write/has）＋ SuperstructureModule（record factory）＋ validator
- データ: `modules.superstructure.data.superstructureDocument`
- 依存: `bridgeLayout`（Span/Support Handoff経由）。下部工は `superstructure` に依存（Phase 6）

## 5. ドキュメント階層（canonical / reference / derived）

| ドキュメント | 種別 | 格納 | 正本 |
|---|---|---|---|
| Project | canonical | `project.json` | 最上位正本 |
| modules.road（RoadDesignDocument） | canonical | modules.road | Road正本 |
| modules.terrain | canonical | modules.terrain | Terrain正本 |
| modules.bridgeLayout（BridgeLayoutDocument） | canonical | modules.bridgeLayout | Bridge Layout唯一正本 |
| **Span Handoff** | **derived** | 非保存・毎回再生成 | 生成元: BridgeLayoutDocument |
| **Support Handoff** | **derived** | 非保存・毎回再生成 | 生成元: BridgeLayoutDocument |
| **SuperstructureDocument** | **canonical（上部工正本）** | modules.superstructure | 上部工正本 |
| **GeometrySnapshot** | **derived（凍結契約）** | 非正本・再生成 | 生成元: DefaultGeometryEngine |
| Bearing / Reaction Handoff | derived | 非保存・Phase 6へ | 生成元: SuperstructureDocument＋解析結果 |

## 6. データフロー（凍結・Phase 5-00踏襲）

```
Project Data Core
   └─ modules.bridgeLayout.bridgeLayoutDocument（canonical）
        ├─ buildSpanHandoff    → Span Handoff（derived・Phase 5上部工正式入口）
        └─ buildSupportHandoff → Support Handoff（derived・共通Support配置情報）
                                    ↓
        modules.superstructure.data.superstructureDocument（canonical）
                                    ↓
        superstructureAdapter（ADAPT: Handoff＋上部工入力 → shared facts）
                                    ↓
        superstructureBinding（ADAPT: SuperstructureDocument → GeometryEngineInput）
                                    ↓
        DefaultGeometryEngine.generateSnapshot → GeometrySnapshot（derived・fingerprint）
                                    ↓
        3D（snapshot3d / solids）／ Analysis（grillage/solver）／ Design Check
                                    ↓
        Bearing / Reaction Handoff → Phase 6下部工（support-interface / superstructureEnvelope流用）
```

## 7. 資産再利用方針（Phase 5-00分類を踏襲）

| 資産 | 分類 | Phase 5-02での扱い |
|---|---|---|
| GeometrySnapshot / DefaultGeometryEngine | KEEP | 入力正本として利用（凍結契約維持） |
| CommonModelGeometryInputAdapter | ADAPT | 入力元をSuperstructureDocumentへ差し替え |
| LinerAlignmentConnector | ADAPT | LINER単一正本の原則維持 |
| superstructureAdapter | ADAPT | 新module内に新関数を**追加**（旧ファイルは無変更・REFERENCE） |
| superstructureBinding | ADAPT（KEEP寄り） | 新module内に新関数を**追加**（旧関数は無変更・fail-closed不変条件維持） |
| projectSuperstructure | ADAPT（新経路不使用） | 旧sidecar永続化は旧システム用に維持。**新ファイル・旧ファイルとも変更しない**。新正本はPDC |
| sectionProperties | KEEP | 断面性能計算 |
| grillage / solver（backend） | KEEP | 基本解析 |
| snapshot3d / solids / STL | KEEP | 3D・出力 |
| superstructureEnvelope / support-interface | KEEP | Phase 6 Handoff境界 |
| bridge_fem_generator.py | REWRITE | Phase 5-02で置換（分析はgrillage経路を正とする） |
| BSDD（旧contract） | ADAPT（参照） | 新SuperstructureDocument設計の参考。データ移行はしない |

## 8. Phase 5-02 Work Package 概要（詳細は Step E で確定）

| WP | 内容 |
|---|---|
| WP-A | SuperstructureDocument / PDC接続 |
| WP-B | Bridge Layout → Adapter / Binding |
| WP-C | Geometry Engine / 3D |
| WP-D | Girder / Deck / Cross Beam / Bearing |
| WP-E | Load Model |
| WP-F | Analysis / solver |
| WP-G | Design Check |
| WP-H | Bearing / Reaction Handoff |
| WP-I | Persistence / .spacerproj |
| WP-J | Reference Bridge / E2E / Completion Gate |

## 9. 詳細設計書索引（Step A〜Eで作成）

| 設計書 | 内容 | Step |
|---|---|---|
| Phase5-01A-01 | SuperstructureDocument Contract | A |
| Phase5-01B-01 | Bridge Layout Input + Adapter/Connector/Binding Mapping | B |
| Phase5-01B-02 | Migration設計 | B |
| Phase5-01C-01 | Geometry完全設計（Coordinate/skew/曲線橋） | C |
| Phase5-01C-02 | 3D / CIM設計 | C |
| Phase5-01D-01 | Load / Analysis / Design Check設計 | D |
| Phase5-01D-02 | Bearing / Reaction Handoff設計 | D |
| Phase5-01E-01 | Persistence設計 | E |
| Phase5-01E-02 | Reference Bridge Expected Data | E |
| Phase5-01E-03 | Test Specification | E |
| Phase5-01E-04 | Phase 5-02 Work Package | E |

## 10. 基準規格・単位・座標（Phase 5-01全体に共通）

- 基準規格: 道路橋示方書・同解説（Phase 5-01では基本照査の枠組みのみ定義。数値採用はREFERENCE）
- 単位: 長さ m / 角度 rad（skew: counterclockwise-positive）/ 力 kN / 曲げ kNm / 応力度 kN/m²（kPa）
- 座標: domain = x沿線 / y横断 / z標高（metric）。Three表示変換は renderCoordinate（x→x, y→z, z→-y）
- 値status語彙: CONFIRMED / DERIVED / INFERRED / MISSING / DEFERRED / NOT_AUTHORIZED（既存BpValue語彙を踏襲）
