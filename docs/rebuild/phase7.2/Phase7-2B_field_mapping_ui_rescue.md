# Phase 7.2B: 旧LINER→Canonical Field Mapping + UI Rescue

- Phase: 7.2 Road/LINER Rescue 完全設計・Design Freeze
- baseline: 86d4d72e80dd21863c4dcdf77d6f475f7647355b
- 日付: 2026-08-13
- 凍結: D-04（field mapping） / D-05（UI Rescue）

## 1. 旧LINER→Canonical Road Field Mapping（D-04 Freeze）

凡例: old path → canonical field（LinerDomainDraftVNext準拠・roadData）→ RoadDesignDocument → downstream。単位/符号/座標/nullabilityを明示。

| 分類 | 旧LINER（old path） | canonical field（roadData） | RoadDesignDocument | downstream | 単位/符号/座標 | nullability/default |
|---|---|---|---|---|---|---|
| ライン管理 | `AlignmentBundleDraft`（linerUiAdapter・AlignmentManager） | `alignments[]`（id/modelId/bundles/lines） | `alignments: RoadAlignmentEntry[]` | BridgeLayout等のline参照 | — | lines≥1（centerline必須） |
| centerline | `deriveLinerCenterlineId`・`AlignmentLineManager` | `alignments[].lines[centerline]`（offset 0・保護） | 同上 | Road計算の基準 | offset=0固定 | 常に存在 |
| offset line | `addOffsetLine` | `lines[]`（label/baseLineId/offset/sortIndex） | 同上 | 横断/幅員 | offset m（右正） | optional |
| Straight | `StraightElementDraft` | `alignments[].horizontal.elements[]` type=straight | RoadAlignmentEntry（entity ref） | 平面評価 | startX/Y m・azimuth rad | — |
| Arc | `CircularArcElementDraft` | 同上 type=arc | 同上 | 平面評価 | R m・turn(L/R)・azimuth | R>0 |
| Clothoid | `ClothoidElementDraft` | 同上 type=clothoid | 同上 | 平面評価 | A・startRadius/endRadius | A>0 |
| Composite | `HorizontalAlignmentDraft`（elements連鎖） | `alignments[].horizontal` | 同上 | 連鎖評価 | C0/C1連続 | — |
| BP/EP・BC/EC・KA/KE | `HorizontalPiPointResult`（導出） | derived（計算） | — | 表示/表 | 測点・m | derived |
| station | `StationDefinitionDraft`（LinerStationProfilePanel） | `alignments[].stationing`（start/interval/equations） | `stationing` | 測点計算 | No.+形式 | — |
| station equation | `StationEquationDraft` | `stationing.equations[]` | 同上 | 測点表 | add_constant/reset_to_value | optional |
| vertical grade | `GradeElementDraft` | `alignments[].vertical[]` type=grade | `profiles` | 縦断評価 | startStation・elevation・grade% | — |
| vertical curve/VCL | `ParabolicElementDraft` | 同上 type=parabolic | 同上 | 縦断評価 | startGrade%・endGrade%・length | 勾配8/12%制限 |
| cross section | `CrossSectionTemplateDraft` | `alignments[].crossSections[]`（offset lines） | `crossSections` | 横断評価 | offset m・elevation m | — |
| width | `WidthChangePointDraft` | `alignments[].widthChangePoints[]` | —（算出） | 幅員計算 | station・left/right m | optional |
| lane/shoulder/median/sidewalk | `CrossSectionOffsetLineDraft`（role） | `crossSections[].lines[].role` | 同上 | 横断構成 | role enum | — |
| cross slope | `CrossSlopeIntervalDraft` | `alignments[].crossSlopeIntervals[]`（mode/left%/right%/pivot） | —（算出） | 横断勾配 | %（右down正） | optional |
| superelevation | `SuperelevationEditor`（scalar） | 同上（legacy scalar） | — | 片勾配 | % | legacy |
| widening | `width/widthResolution.ts` | `alignments[].widthChangePoints[]`（widen） | — | 拡幅 | m | optional |
| pier/span/skew | `PierDraft`/`SpanDraft`/`pierLineGeometry` | `alignments[].bridgeLayout`（piers/spans/skew） | `bridges: RoadBridgeEntry[]` | BridgeLayout handoff | station・skew rad | — |

### 1.1 単位・符号・座標系・validation（Freeze）

- 単位: m（長さ）・rad（角度）・kN/kNm（構造はPhase 7契約）・%／ratio（勾配）。
- **座標系（Sol review反映・3つのframeを分離）**:
  - **world XYZ**: project-global・right-handed・z up（表示・最終座標）。
  - **alignment local frame**: 各stationのtangent/normal/binormal（曲線でglobal X≠沿線方向になるため・`core/vector.ts localFrameFromAzimuth`を利用）。
  - **cross-section offset frame**: offset沿いの横断frame（offset右正・crossfall右down正）。
  - 変換関数: world↔local変換は `core/geometry3d`・`coordinate3d.ts` の既存KEEP関数を利用（新規に作らない）。
- 符号: offset右正・cross slope右down正・skew CCW正（Phase 5/6契約と整合）。
- nullability: 旧draftのoptionalを継承・NOT_AVAILABLEは発明しない。
- default: 旧 `linerUiAdapter.createDefaultLinerDraft` を継承。
- validation: `schema/validateProjectLinerExtension.ts` を正本validationとしてADAPT。

### 1.2 stable ID lifecycle（Sol review反映・D-04追補）

- **migration時の決定論ID**（legacy由来）: legacy source IDからuuid5決定論生成（migration時のみ・既存Bridge参照を維持）。
- **runtime新規entityの永続ID**: entity作成時に一度生成し、**geometry編集では変わらない**（再生成しない）。geometry値からuuid5を作らない（編集でIDが変わりBridge参照が切れるのを防ぐ）。
- namespace/name規則: Phase 7-01 D-11のanalysis namespaceとは**別のroad namespace**を固定。
- 複製・並べ替え・legacy ID保持・collision: 複製は新ID・並べ替えはID不変・legacy IDは `_meta.legacyId` に保持・collisionは新ID生成で回避。

### 1.3 Editor commit protocol（Sol review反映・D-05追補）

全Editor共通のcommit protocol:
```
UI edit → validate（正本schema+LINER rule）→ atomic canonical commit（roadDataへ）
→ contentChecksum更新 → autosave（正本のみ）→ invalidation（依存scoped fingerprint）
```
- 不正値はcommit前fail（stateに保持・正本に書かない）。
- atomic: commit成功時のみchecksum更新・下流STALE発動。

## 2. UI Rescue仕様（D-05 Freeze）

方針: 旧/pro/linerを「そのまま正規入口として復活」させるのではなく、**新Road Module（/app）の中へ旧LINER完成済みEditor components/hooks/calculation linkageを最大限KEEP/RESTORE/ADAPT**する。

### 2.1 Line Management

| 項目 | Freeze |
|---|---|
| 再利用 | `liner/components/AlignmentManager.tsx`・`AlignmentLineManager.tsx`・`offsetLineOrdering.ts` |
| 新接続先 | 新Road Module Page（`/app/projects/:id/modules/road`）のLine管理領域 |
| props/state | `LinerDomainDraftVNext.alignments` をprops・editor stateは正本へwrite |
| canonical write | `modules.road.data.roadData.alignments` |
| validation | alignments≥1・centerline保護（offset 0） |
| calc trigger | 変更→計算再生成（intermediate） |
| preview | 2D Preview更新 |
| persistence | Auto Save（正本のみ） |
| stale trigger | line変更→下流（BridgeLayout等）STALE |
| tests | 旧 `AlignmentManager.test.tsx`（存在）・multiAlignmentIsolation.test.ts |

### 2.2 Horizontal Alignment Editor

- 再利用: `HorizontalElementEditor.tsx`（straight/arc/clothoid行・R/A/L/azimuth/XY）
- 新接続先: Road Module Page・平面線形領域
- 正本write: `roadData.alignments[].horizontal`
- validation: `core/geometry/horizontal.ts validateAlignment`（C0/C1・ゼロ長・R/A）
- calc: `evaluateAlignmentAtDistance`（KEEP）→ 平面評価
- preview: 平面Preview（旧visual PLAN payload + 現RoadPlanPreview MERGE）
- tests: `HorizontalElementEditor`関連・geometry.test・horizontalCurveGolden.test

### 2.3 Stationing Editor

- 再利用: `LinerStationProfilePanel.tsx`（origin/interval/sample/explicit/equations/offsets）
- 正本write: `roadData.alignments[].stationing`
- calc: `generateStations`・`stationAtPoint`（KEEP）
- tests: stationFormat.test・station.test・App.linerSaveLoad

### 2.4 Vertical Alignment Editor

- 再利用: `VerticalElementEditor.tsx`（grade/parabolic）
- 正本write: `roadData.alignments[].vertical`
- validation: `validateVerticalAlignment`（8/12%制限）
- preview: 縦断Profile（旧VerticalProfileChart + 現RoadProfilePreview MERGE）
- tests: verticalGolden.test・VerticalElementEditor.test

### 2.5 Cross Section Editor

- 再利用: `CrossSectionTemplateEditor.tsx`・`offsetLineOrdering.ts`
- 正本write: `roadData.alignments[].crossSections`
- preview: 横断図（旧CrossSectionPreview + 現RoadCrossSectionPreview MERGE）
- tests: crossSectionGolden.test・CrossSectionPreview.test

### 2.6 Width / Widening / CrossSlope / Superelevation Editor

- 再利用: `WidthChangePointEditor.tsx`・`CrossfallIntervalEditor.tsx`・`CrossSlopeIntervalEditor.tsx`・`SuperelevationEditor.tsx`
- **重要**: roadInputにはwidthChangePoints/crossSlopeIntervals fieldが無い。正本schemaには **`alignments[].widthChangePoints[]`・`alignments[].crossSlopeIntervals[]` を追加**（旧draft schemaに存在）。
- 正本write: 上記
- calc: `resolveWidthAtDistance`・`resolveCrossfallState`（KEEP）
- tests: widthResolution.test・crossfallResolution.test

### 2.7 各Editor共通Freeze

- canonical write path: `roadData`（正本）・二重write禁止
- validation: 正本schema + 旧LINER rule validation
- calculation trigger: 変更→`buildRoadIntermediate`再計算（決定論）
- preview update: 正本→derived→preview（同一データ供給）
- persistence: Auto Save（正本のみ）・derived非保存
- stale trigger: 編集→下流STALE（§STALE matrix）
- E2E acceptance: 入力→計算→結果→保存→restore→.spacerproj roundtrip が成立

### 2.8 救出範囲の最終判定

- 全6種Editor（Line/Horizontal/Stationing/Vertical/CrossSection/Width+CrossSlope）を**RESTORE/ADAPT**（rescue HIGH）。
- 旧実装（/pro/liner）は**そのまま残存維持**（正本ではない・参照保全）。新Road Moduleへ複製・適合する。
