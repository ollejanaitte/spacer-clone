# 現行アーキテクチャ

**Generated**: 2026-07-15  
**Git HEAD**: `fd21e30`

---

## 関係図

```mermaid
graph TD
    subgraph UI["Frontend UI"]
        TB[Toolbar]
        PT[PropertyPanel]
        PJT[ProjectTree]
        RP[ResultsPanel]
        V3D[Viewer3D]
        BW[BridgeWizard Modal]
        THW[TimeHistoryWizardModal]
    end

    subgraph LINER["LINER Module"]
        LE[LinerEditPage]
        LP[LinerPreviewPage]
        LDW[LinerDrawingWorkspace]
        LI[Importer]
        LHF[LinerHeadless]
        LCore[Liner Core]
    end

    subgraph API["Backend API"]
        FA[FastAPI main.py]
        RPT[reports.py]
    end

    subgraph Solver["FEM Engine"]
        SM[solver.py]
        ASM[assembly.py]
        EIG[eigen.py]
        RS[response_spectrum.py]
        TH[time_history.py]
        INF[influence.py]
        ML[moving_load.py]
    end

    subgraph Data["Data Models"]
        PM[ProjectModel]
        BP[BridgeProject]
        BD[BridgeDefinition]
        PMOD[Model dataclass]
    end

    TB --> PT
    TB --> PJT
    TB --> RP
    TB --> V3D
    TB --> BW
    TB --> THW
    PT --> PM
    PJT --> PM

    BW --> BP
    BP -->|generate_fem_model| FA
    BP -->|fromBridgeProject| BD
    BD -->|structuralModelGenerator| PM

    FA --> SM
    SM --> ASM
    SM --> PMOD

    PMOD --> SM
    PMOD --> EIG
    PMOD --> RS
    PMOD --> TH
    PMOD --> INF
    PMOD --> ML

    LE --> LCore
    LCore --> LP
    LCore --> LDW
    LCore --> LHF
    LHF --> PM

    FA --> RPT
```

---

## BridgeWizard経路 vs BridgeDefinition経路

### 経路 A: BridgeWizard (legacy)

```
BridgeWizard (BridgeProject)
  → Step 6 "Generate"
  → POST /api/fem/generate
  → backend/engine/bridge_fem_generator.py: generate_fem_model()
  → BridgeFemResponse { summary, fem: ProjectModel }
  → handleBridgeGenerated() (App.tsx:596)
  → bridgeProjectToProjectModel() (conversion.ts:9)
  → commitProject()
```

- **場所**: `frontend/src/bridge/` → `backend/engine/bridge_fem_generator.py`
- **保存先**: BridgeProject は `backend/data/bridges/` に CRUD
- **特徴**: z=0.0 固定、Legacy FEM 2D planar model

### 経路 B: BridgeDefinition (feature-flagged)

```
BridgeProject → fromBridgeProject adapter (bridge/api.ts:70-76)
  → BridgeDefinition (canonical intermediate)
  → generateStructuralModel() (structuralModelGenerator.ts:198)
  → ProjectModel (discretized FEM)
```

- **場所**: `frontend/src/bridgeDefinition/`
- **Flag**: `VITE_USE_BRIDGE_DEFINITION_STRUCTURAL_MODEL`（デフォルト false）
- **特徴**: frontend-side conversion、coordinatePolicy 対応

---

## UI → API → Solver → Viewer

```mermaid
sequenceDiagram
    participant UI as UI (App.tsx)
    participant API as FastAPI (main.py)
    participant SOL as Solver (solver.py)
    participant VIEW as Viewer (Viewer3D.tsx)

    UI->>API: POST /api/analysis/run (ProjectModel)
    API->>API: parse_model() + validate_model()
    API->>SOL: solve_model(Model)
    SOL-->>API: AnalysisResult
    API-->>UI: JSON response
    UI->>UI: setResult(result)
    UI->>VIEW: ProjectModel + result (React state)
    VIEW->>VIEW: applyViewerDisplayTransform()
    VIEW->>VIEW: Three.js render
```

---

## 主要保存先

| 対象 | 保存先 | 場所 |
|------|--------|------|
| ProjectModel | JSON download (browser) | `App.tsx:534-538` |
| ProjectModel (backend) | filesystem JSON | `backend/data/projects/` |
| BridgeProject | filesystem JSON | `backend/data/bridges/` |
| Importer | localStorage | `importer/storage/importerStorage.ts` |
| Viewer axis swap | localStorage | `viewer/coordinateTransform.ts:22` |
| analysisResults.timeHistory | ProjectModel 永続 | `types.ts:189-191` |
| 他の解析結果 | React state のみ | `App.tsx:103` |
| Autosave | **無効** | `App.tsx:89` |

---

## 現行正本定義

| 正本 | 場所 | 型 | 用途 |
|------|------|-----|------|
| **LINER** | `frontend/src/liner/` | 幾何計算 | 線形・断面・グリッド・中間結果 |
| **BridgeProject** | `backend/engine/bridge_model.py` | dataclass | Bridge Wizard ドメインモデル |
| **BridgeDefinition** | `frontend/src/bridgeDefinition/types.ts` | interface | 中間表現（canonical intermediate） |
| **ProjectModel** | `frontend/src/types.ts:158-196` | type | FEM解析の唯一の正本 |
| **Model** | `backend/engine/model.py:151-165` | dataclass | Backend solver入力 |
