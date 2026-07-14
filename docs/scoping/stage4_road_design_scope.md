# Stage 4: 道路設計Scope

**Generated**: 2026-07-15  
**Git HEAD**: `fd21e30`

---

## B1: LINER エントリポイント

| 入口 | Route | Component | 状態 |
|------|-------|-----------|------|
| Launcher | `/pro/linear-coordinate` | LinerLauncherPage | IMPLEMENTED |
| GUI Editor | `/pro/liner/setup` | LinerEditPage | IMPLEMENTED |
| Importer | `/pro/importer/startup` | ImporterStartupPage | IMPLEMENTED |
| Preview | `/pro/liner/preview` | LinerPreviewPage | IMPLEMENTED |
| Mapping Review | `/pro/liner/mapping-review` | LinerMappingReviewPage | IMPLEMENTED |
| Drawing Plan | `/pro/liner/drawings/plan` | LinerFormalDrawingWorkspacePage | IMPLEMENTED |
| Drawing Profile | `/pro/liner/drawings/profile` | LinerFormalDrawingWorkspacePage | IMPLEMENTED |
| Drawing Cross-Section | `/pro/liner/drawings/cross-section` | LinerFormalDrawingWorkspacePage | IMPLEMENTED |

---

## B2: 平面線形

| 機能 | 判定 | 再利用 |
|------|------|--------|
| 直線 (Straight) | IMPLEMENTED | — |
| 円弧 (Arc) | IMPLEMENTED | — |
| クロソイド (Clothoid) | IMPLEMENTED | — |
| 複合線形 (Composite) | IMPLEMENTED | — |
| Offset線 | IMPLEMENTED | — |
| 拡幅 (Widening) | ABSENT（型定義のみ） | — |
| 接続/分岐 | ABSENT | — |
| 複数線形 | ABSENT | — |

---

## B3: 測点

| 機能 | 判定 |
|------|------|
| 累加距離 (physicalDistance) | IMPLEMENTED |
| No.表記 (No.XX+YY) | IMPLEMENTED |
| Pitch (interval) | IMPLEMENTED |
| Explicit Station | IMPLEMENTED |
| Equation (break) | IMPLEMENTED |

---

## B4: 縦断・横断

| 機能 | 判定 |
|------|------|
| 縦断勾配 (Grade) | IMPLEMENTED |
| 縦断放物線 (Parabolic) | IMPLEMENTED |
| 横断勾配 (CrossSlope) | IMPLEMENTED |
| Centerline Elevation | IMPLEMENTED |
| Z Merge | IMPLEMENTED |

---

## B5: 道路横断構成

| 機能 | 判定 | 再利用 |
|------|------|--------|
| Lane/Shoulder/Sidewalk/Median/Edge/Custom | IMPLEMENTED | — |
| Barrier | PARTIAL（Importer のみ） | — |
| 幅員変化 (Width Change) | ABSENT（型定義のみ） | — |

---

## B6: 橋梁幾何 — 横断表

### 横断責務表

| 項目 | LINER | BridgeProject | BridgeDefinition | ProjectModel | Solver |
|------|-------|---------------|------------------|--------------|--------|
| 水平線形 | 有 | 無 | 無 | 無 | 無 |
| 縦断線形 | 有 | 無 | 無 | 無 | 無 |
| 横断テンプレート | 有 | 無 | 無 | 無 | 無 |
| 支間長 | 有 | 有 | 有 | 無 | 無 |
| 橋脚/支点 | 有 | 無 | 有 | 有(FEM制約) | 無 |
| 車道幅/横断尺寸 | 有 | 有 | 有 | 無 | 無 |
| 荷重 | 無 | 有 | 有 | 有 | 無 |
| FEMノード/部材 | 無 | 無 | 無（生成器で変換） | 有 | 無 |
| 解析実行 | 無 | 無 | 無 | 無 | 有 |

---

## B7–B8: LDIST / HAUNCH / HOSO

| 機能 | 判定 |
|------|------|
| LDIST（構造的距離計算） | **NOT IMPLEMENTED** |
| HAUNCH（ハンチ） | **NOT IMPLEMENTED** |
| HOSO（防水板） | **NOT IMPLEMENTED** |
| GDRAW (Drawing/DXF) | **IMPLEMENTED** |
| TOOL（測点電卓等） | **NOT IMPLEMENTED** |

---

## B9: DXF 図面

| 図面種別 | Builder | DXF Export | SVG Preview |
|----------|---------|------------|-------------|
| Plan Type A (road_shape) | 有 | 有 | 有 |
| Plan Type B (centerline_only) | 有 | 有 | 有 |
| Profile | 有 | 有 | 有 |
| Cross Section | 有 | 有 | 有 |
| Band | 有 | 有 | 有 |

DXF形式: LINE, LWPOLYLINE, ARC, CIRCLE, TEXT。rad→deg変換済み。INSUNITS=6 (m)。

---

## A3: 座標対応（13経路）

| # | 経路 | swap | sign flip | 根拠 |
|---|------|------|-----------|------|
| 1 | LINER入力 | なし | なし | `liner/core/pipeline/pipeline.ts:79-89` |
| 2 | LINER geometry evaluation | なし | なし | `liner/core/grid/gridGeneration.ts:73-127` |
| 3 | LINER preview | なし | なし | `liner/headless/convertFrameMappingEntities.ts:11-18` |
| 4 | LINER 3D Viewer | **ON: Y↔Z** | **liner: z→-z** | `viewer/coordinateTransform.ts:66-98` |
| 5 | LINER DXF | なし | なし | `liner/dxf/model/units.ts` |
| 6 | BridgeWizard | なし | なし | `bridge_fem_generator.py:167` |
| 7 | BridgeDefinition | なし | policy.sign | `structuralModelGenerator.ts:218-251` |
| 8 | Legacy bridge_fem_generator | なし | なし | `bridge_fem_generator.py:89-96,167` |
| 9 | ProjectModel node | なし | 経路依存 | — |
| 10 | Solver input | なし | なし | `backend/engine/model.py:184-239` |
| 11 | Three.js Viewer | display-only | 同#4 | `viewer/coordinateTransform.ts:86-98` |
| 12 | Result mapping | display-only | 同#11 | `viewer/coordinateTransform.ts:120-155` |
| 13 | Drawing builder | viewport invertY | なし | `liner/drawing/builders/` |

### 非対称座標 実行検証（A1）

- LINER path: swap on → `{x=10, y=3, z=-2}` ✓（Y/Z swap + sign flip）
- Legacy FEM: z=0 確認済み（`bridge_fem_generator.py:167`）
- Unit test: 24/24 PASS

---

## A4: Legacy FEM ID（9経路）

| 経路 | ID種別 | 生成方法 | 安定性 | Risk |
|------|--------|----------|--------|------|
| backend bridge_fem_generator | N{counter}/M{counter}/NL{counter}/ML{counter} | counter=1開始、入力順依存 | 安定（同一入力→同一ID） | 低 |
| frontend structuralModelGenerator | N{counter}/M{counter} | counter=0→+1開始 | 安定 | 低 |
| importer | {prefix}-{uuid} | crypto.randomUUID() | 不安定（毎回UUID） | 中 |
| viewer index | nodeIndex (整数配列) | node_id_to_index変換 | 一時的 | 低 |
| save/reload | 生成済みIDそのまま | 再生成で同一入力→同一ID | 安定 | 低 |

---

## 再利用判定

| コンポーネント | 判定 | 根拠 |
|---------------|------|------|
| LINER (LinerDomainDraftVNext) | **KEEP** | 純粋幾何 |
| BridgeProject (backend) | **SPLIT** | 幾何と力学が混在 |
| BridgeDefinition | **KEEP** | 中間表現として正しく設計 |
| ProjectModel | **KEEP** | FEM 専用モデル |
| bridge_fem_generator.py | **KEEP**（legacy） | 現行FEM生成器として使用中 |
| structuralModelGenerator.ts | **KEEP** | 新BD→FEMパス |
| Bridge Wizard UI | **KEEP** | 現行Wizard UI |
| PropertyPanel/ProjectTree | **KEEP** | 一般FEM編集 |
| Viewer3D/ResultsPanel | **KEEP** | 3D表示・結果表示 |
