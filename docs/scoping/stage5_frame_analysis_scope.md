# Stage 5: 骨組み解析Scope

**Generated**: 2026-07-15  
**Git HEAD**: `fd21e30`  
**STAGE5_VERDICT**: CONDITIONALLY_COMPLETE  
**PART_A_GATE**: CONDITIONAL

---

## モジュール判定一覧

| Module | Verdict | 詳細 |
|--------|---------|------|
| CONTROL | **PARTIAL** | runボタンあり。cancel/progress/history/stale UI = ABSENT |
| STATICS model | **PARTIAL** | node/member/mat/sec/support OK。spring/release/rigid = ABSENT |
| STATICS fixed loads | **PARTIAL** | nodal + uniform member OK。temp/settlement = ABSENT |
| INFLOAD | **PARTIAL** | moving-load MVP singlePoint。JIPフルINFLOADではない |
| Influence | **IMPLEMENTED** | UI→API→Solver→Results/CSV |
| R-SPECTRUM | **IMPLEMENTED** | Eigen + spectrum分離。SRSS/CQC |
| PRINT | **PARTIAL** | CSV強い。静的荷重ケース組合せ = ABSENT。PDFにinfluence/movingLoadセクション欠落 |
| DRAFT/Viewer | **PARTIAL** | Viewer/ResultsPanel強。formal FEM CAD DRAFT ≠ Viewer |

---

## B1: エントリ・アーキテクチャ

### 2経路

**経路 A: Bridge Wizard (legacy path)**
```
BridgeWizard → Step 6 → POST /api/fem/generate
  → generate_fem_model() → FEM nodes/members/supports/loads
  → BridgeFemResponse → handleBridgeGenerated()
  → bridgeProjectToProjectModel() → commitProject()
  → Validation → API → Result → Viewer
```

**経路 B: BridgeDefinition (feature-flagged)**
```
BridgeProject → fromBridgeProject adapter → BridgeDefinition
  → generateStructuralModel() → ProjectModel
  → 同 downstream
```

### 入口到達性

| 入口 | Model | 到達性 |
|------|-------|--------|
| `/pro` PropertyPanel/ProjectTree | ProjectModel | 常時 |
| BridgeWizard Modal | BridgeProject → FEM → ProjectModel | Toolbar |
| BridgeDefinition generator | Feature flag | VITE_USE_BRIDGE_DEFINITION_STRUCTURAL_MODEL |
| LINER open-in-Phase3.5 | ProjectModel + liner draft | LINER export |
| JSON openFile | ProjectModel | 常時 |

---

## B2: CONTROL相当

| 機能 | 判定 | 証拠 |
|------|------|------|
| Model type selection | **CONSTANT**（linear_static 固定） | `project.schema.json:162-164` |
| Run selection | **PARTIAL**（6種ボタンあり、バッチ/選択UIなし） | `Toolbar.tsx:1-36` |
| Cancel | **ABSENT** | `App.tsx:120` — running フラグのみ |
| Progress | **ABSENT**（"Running" 表示のみ） | `App.tsx:339` |
| History | **ABSENT**（最新1件のみ） | `App.tsx:103` |
| Stale detection | **ABSENT**（モデル変更で結果クリア = 間接的） | `App.tsx:167` |

---

## B3: STATICS構造モデル

| 要素 | 判定 | 証拠 |
|------|------|------|
| Node | **IMPLEMENTED** | `PropertyPanel.tsx:77-85` |
| Member | **IMPLEMENTED** | `PropertyPanel.tsx:87-102` |
| Material | **IMPLEMENTED** | `PropertyPanel.tsx:104-119` |
| Section | **IMPLEMENTED** | `PropertyPanel.tsx:121-136` |
| Support | **IMPLEMENTED** | `PropertyPanel.tsx:138-154` |
| Spring | **ABSENT** | grep `spring` in model.py → 0 matches |
| Release | **ABSENT** | grep `release` in model.py → 0 matches |
| Rigid offset | **ABSENT** | grep `rigidOffset` in model.py → 0 matches |
| Orientation | **IMPLEMENTED** (basic) | `types.ts:44-45` |

---

## B4: 固定荷重

| 荷重タイプ | 判定 | 証拠 |
|-----------|------|------|
| Nodal load | **IMPLEMENTED** | `PropertyPanel.tsx:170-188`, `LoadRenderer.ts:42-66` |
| Member load (uniform) | **IMPLEMENTED** | `PropertyPanel.tsx:190-207`, `LoadRenderer.ts:68-73` |
| Self weight | **PARTIAL**（Bridge Wizard経路のみ） | `bridge_fem_generator.py:274` |
| Temperature | **NOT CONVERTED**（型定義のみ） | `structuralModelGenerator.ts:165-169` warning |
| Settlement | **ABSENT** | grep → 0 matches |

---

## B5: 影響線

| 要素 | 判定 | path:line |
|------|------|-----------|
| Solver | IMPLEMENTED | `backend/engine/influence.py:34` |
| UI | IMPLEMENTED | `App.tsx:479` |
| API | IMPLEMENTED | `backend/app/main.py:229` |
| ResultsPanel | IMPLEMENTED | `ResultsPanel.tsx:60,387` |
| CSV | IMPLEMENTED | `backend/app/reports.py:226` |
| PDF | NOTINCLUDED | `resultPdfReport.ts` — influenceセクションなし |

---

## B6: INFLOAD

| 要素 | 判定 | path:line |
|------|------|-----------|
| Solver | IMPLEMENTED | `backend/engine/moving_load.py:14` |
| UI | IMPLEMENTED | `App.tsx:448` |
| API | IMPLEMENTED | `backend/app/main.py:257` |
| Envelope | IMPLEMENTED | `moving_load.py:239` |
| CSV | IMPLEMENTED | `reports.py:273` |
| MVP制限 | **singlePoint のみ** | `moving_load.py:88` |

---

## B7: R-SPECTRUM

| 要素 | Eigen | Response Spectrum |
|------|-------|-------------------|
| Solver | `eigen.py:18` | `response_spectrum.py:33` |
| API | `/api/analysis/eigen` | `/api/analysis/response-spectrum` |
| SRSS/CQC | — | `response_spectrum.py:292` |
| PDF | `resultPdfReport.ts:166` | `resultPdfReport.ts:236` |
| CSV | `reports.py:183` | `reports.py:110` |

---

## B8: PRINT (CSV/PDF)

### CSV（全解析タイプ対応）

| CSV | 場所 |
|-----|------|
| displacements.csv | `reports.py:110` |
| reactions.csv | `reports.py:135` |
| member_section_forces.csv | `reports.py:155` |
| eigen_modes.csv | `reports.py:183` |
| influence_lines.csv | `reports.py:226` |
| moving_load.csv | `reports.py:273` |

### PDF

| セクション | 判定 |
|-----------|------|
| Project Overview | IMPLEMENTED |
| Analysis Conditions | IMPLEMENTED |
| Displacements/Reactions/Member Forces | IMPLEMENTED |
| Eigen Modes | IMPLEMENTED |
| Response Spectrum | IMPLEMENTED |
| Influence | **NOTINCLUDED** |
| MovingLoad | **NOTINCLUDED** |
| Static load combinations | **ABSENT** |

---

## B9: DRAFT/Viewer/帳票

| 項目 | 判定 |
|------|------|
| ResultsPanel (6 tabs, 6 views) | IMPLEMENTED |
| Viewer3D (3D+fallback+compare) | IMPLEMENTED |
| LoadRenderer (arrow/moment glyphs) | IMPLEMENTED |
| PDF Report | IMPLEMENTED |
| CSV Export | IMPLEMENTED |
| DXF Plan/Profile/Cross-Section | IMPLEMENTED |
| STL Frame | IMPLEMENTED |

---

## B10: Solver能力

| ケース | 説明 | 判定 |
|--------|------|------|
| Cantilever tip load | uy = -PL³/(3EI) | IMPLEMENTED |
| Simply supported center | uy = -PL³/(48EI) | IMPLEMENTED |
| Simply supported uniform | uy = -5wL⁴/(384EI) | IMPLEMENTED |
| 3D torsion | rx = TL/(GJ) | IMPLEMENTED |
| Insufficient support | MODEL_UNSTABLE | IMPLEMENTED |
| Invalid reference | INVALID_REFERENCE | IMPLEMENTED |
| Near singular | NEAR_SINGULAR_STIFFNESS warning | IMPLEMENTED |

---

## B11: 結果永続

| 項目 | 状態 |
|------|------|
| AUTOSAVE_ENABLED | **false**（無効） |
| timeHistory results | **ProjectModel 永続** |
| static/eigen/spectrum/influence/movingLoad | **React state のみ（リロードで消失）** |
| Viewer UI state | **Session のみ** |

---

## B12: Validation

- Frontend: TypeScript コンパイル時
- Backend parse_model: スキーマ検証
- Backend validate_model: 参照整合・値制約・MVP scope
- Solver: 特異行列・非有限値

---

## 証拠Path

| 事実 | 根拠 |
|------|------|
| CONTROL run buttons | `Toolbar.tsx:1-36`, `App.tsx:964-980` |
| CONTROL cancel ABSENT | `App.tsx:120` — useState only |
| Spring ABSENT | `backend/engine/model.py` — grep 0 matches |
| Release ABSENT | `backend/engine/model.py` — grep 0 matches |
| Rigid offset ABSENT | `backend/engine/model.py` — grep 0 matches |
| INFLOAD MVP singlePoint | `backend/engine/moving_load.py:88` |
| PDF influence NOTINCLUDED | `frontend/src/exports/resultPdfReport.ts` |
| PDF movingLoad NOTINCLUDED | `frontend/src/exports/resultPdfReport.ts` |
| AUTOSAVE false | `App.tsx:89` |
| timeHistory persistent | `types.ts:189-191` |
