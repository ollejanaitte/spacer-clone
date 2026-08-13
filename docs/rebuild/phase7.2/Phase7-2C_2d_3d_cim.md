# Phase 7.2C: 2D Preview + 3D / Road CIM 統合設計

- Phase: 7.2 Road/LINER Rescue 完全設計・Design Freeze
- baseline: 86d4d72e80dd21863c4dcdf77d6f475f7647355b
- 日付: 2026-08-13
- 凍結: D-06（2D） / D-07（3D/Road CIM）

## 1. 2D Preview統合（D-06 Freeze）

### 1.1 現状比較

| 機能 | 旧LINER | 現Road Preview | 判定 |
|---|---|---|---|
| 平面（Plan） | `core/visual/horizontalAlignment.ts buildPlanPayload` + `LinerPreviewPage` | `RoadPlanPreview`（SVG・簡略） | 旧が高機能（要素/IP/BC/EC表示） |
| 縦断（Profile） | `VerticalProfileChart.tsx` + `buildProfilePayload` | `RoadProfilePreview`（SVG・簡略） | 旧が高機能（VCL/PVI） |
| 横断（Cross Section） | `CrossSectionPreview.tsx` + `buildSectionPayload` | `RoadCrossSectionPreview`（SVG・簡略） | 旧が高機能（role配色・grid） |
| station/major point表示 | 旧visualに有 | 現Previewに無 | **MERGE必要** |
| validation/result表示 | 旧diagnostics panels | 現Previewに無 | MERGE候補 |

### 1.2 統合方針（Freeze）

- **現Road Previewを単純廃棄しない**。旧visual（`core/visual/*` のDiagramPayload）をKEEP/ADAPTして、新Road ModuleのPreviewへMERGE。
- **UI編集とPreviewは同一Canonical Dataから更新**:
  `roadData`（正本）→ derived（intermediate）→ DiagramPayload（旧visual）→ Preview（SVG）を1データフローに。
- Previewコンポーネント: 新 `RoadModule` のPreview領域に、旧visualのSVG builder + 旧Chartを接続（二重実装しない）。
- station/major point表示・validation/result表示は旧visualから救出（MERGE）。

### 1.3 責務（Freeze）

- `core/visual/`（旧LINER）: DiagramPayload生成（KEEP・正本から導出）
- 新Road Module Preview: 上記payloadを表示（ADAPT）
- 表示のみ（正本を書き換えない）

## 2. 3D / Road CIM統合（D-07 Freeze）

### 2.1 現状

- 現: `road/roadMesh.ts buildRoadMesh`（3D表面mesh）→ `road/roadCimGeometry.ts buildRoadCimGeometry`（CIM document）→ `integratedSceneBuilder`（road-surface）
- 旧: `LinerMain3DPage.tsx` + `samples/mountain-viaduct-500/viewer.tsx`（R3F・terrain/road/superstructure/substructure/frame・camera presets・selection）
- Road CIMは**production UI未消費**（testのみ）

### 2.2 統合方針（Freeze）

- **旧3Dを別正本にしない**。正式縦断:
  `roadData`（正本）→ intermediate → `buildRoadMesh`（pavement solid）→ `buildRoadCimGeometry`（Road CIM）→ `integratedSceneBuilder`（Integrated 3D）
- 旧LinerMain3Dから救出する価値がある表示・操作機能:
  - camera presets・selection（マウス選択）・terrain/road重ね表示 → `integratedSceneBuilder` + 既存Viewer3DへADAPT
  - 旧 `viewer.tsx`（mountain sample）は**サンプル/参照実装**として残す（正本ではない）
- Road CIMのproduction消費: Road CIM geometry documentを下流（export/表示）へ正式接続（Phase 7.3 WP-I）。

### 2.3 責務（Freeze）

- `roadMesh.ts` / `roadCimGeometry.ts`（現）: 正式3D/CIM生成（KEEP）
- `integratedSceneBuilder.ts`（現）: Integrated 3Dシーン（KEEP・旧3D機能ADAPT）
- 旧 `LinerMain3DPage`/`viewer.tsx`: 参照実装（KEEP・正本ではない）
- 表示のみ（正本を書き換えない）

## 3. 共通原則

- 全てderived（正本→計算→表示）。表示データを正本にしない。
- 旧visual/3Dの「表示・操作」はMERGE救出、「計算」は正本から導出。
- 二重実装しない（同じ計算は一箇所）。
