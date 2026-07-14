# Stage 0–3: システム事実まとめ

**Generated**: 2026-07-15  
**Git HEAD**: `fd21e30` (`chore: local state as source of truth`)  
**Branch**: `main`

---

## Stage 0: スコープ境界

### リポジトリ構成

| パス | 責務 |
|------|------|
| `frontend/` | React/TypeScript/Electron フロントエンド |
| `backend/` | Python/FastAPI バックエンド |
| `backend/engine/` | FEM解析エンジン（scipy） |
| `desktop/electron/` | Electron シェル |
| `schemas/` | JSON Schema定義 |
| `examples/` | サンプルプロジェクト |

### IN-SCOPE / OUT-SCOPE

- **IN**: Bridge structural analysis application 全般
- **OUT**: `docs/bridge-modeler-v2/`（将来設計）、`マニュアル/*.pdf`（参照可だが改変禁止）、ビルド成果物

---

## Stage 1: Git基線・品質基線

### Git基線

| 項目 | 値 |
|------|-----|
| ブランチ | `main` |
| HEAD | `fd21e30` |
| origin | `origin/main` と完全一致 |
| 変更 | `D review_docs_liner.md`（unstaged削除）+ 2 untracked |

### 技術スタック

| レイヤー | 技術 |
|----------|------|
| Frontend | React 19, TypeScript 5.8+, Vite 7 |
| 3D | Three.js 0.184, React Three Fiber 9.6 |
| Backend | FastAPI, Python 3.10+ |
| Solver | NumPy, SciPy |
| Test | Vitest 4.1, Playwright 1.61, pytest |
| Desktop | Electron 42 |
| State | React useState（Redux/Zustand 不使用） |

### 品質基線

| 項目 | 結果 |
|------|------|
| Frontend typecheck | PASS |
| Frontend test | PASS（1192 tests） |
| Frontend build | PASS |
| Frontend lint | PASS |
| Backend pytest | PASS（494 tests） |
| E2E | BLOCKED（バックエンド未起動） |

---

## Stage 2: 入口・ルート・画面到達性

### 全ルート数: 28

| カテゴリ | ルート数 |
|----------|----------|
| Lobby | 6 |
| Pro | 11 |
| Importer | 7 |
| Legacy | 3（REDIRECT） |
| Modal | 2（Route外） |

### 主要入口

| 入口 | 状態 |
|------|------|
| Lobby `/` | STATICALLY_REACHABLE |
| Pro `/pro` | STATICALLY_REACHABLE |
| Bridge Wizard (Modal) | STATICALLY_REACHABLE |
| Time History Wizard (Modal) | STATICALLY_REACHABLE |
| LINER Launcher | STATICALLY_REACHABLE |
| LINER Drawings (plan/profile/cross-section) | STATICALLY_REACHABLE |

### データフロー（主経路）

```
BridgeWizard (BridgeProject)
  → Step 6 "Generate"
  → POST /api/fem/generate (backend)
  → generate_fem_model() → FEM nodes/members/supports/loads
  → BridgeFemResponse
  → handleBridgeGenerated()
  → bridgeProjectToProjectModel()
  → commitProject() → setProject()
  → Validation → API (solver) → Result → Viewer
```

---

## Stage 3: データモデルと保存構造

### 正本型

| 型 | 場所 | 用途 |
|----|------|------|
| `ProjectModel` | `frontend/src/types.ts:158-196` | FEM解析の唯一の正本 |
| `BridgeProject` | `frontend/src/bridge/types.ts:49-63` | Bridge Wizard ドメインモデル |
| `BridgeDefinition` | `frontend/src/bridgeDefinition/types.ts:173-191` | 中間表現 |
| `Model` | `backend/engine/model.py:151-165` | Backend solver入力 |

### 保存メカニズム

| 方法 | 場所 | 状態 |
|------|------|------|
| Manual Save | `App.tsx:534-538` | 有効（ブラウザDL） |
| File Open | `App.tsx:521-531` | 有効 |
| Backend Save | `main.py:307-328` | 有効（filesystem JSON） |
| Autosave | `App.tsx:240-250` | **無効**（`AUTOSAVE_ENABLED = false`） |

### 永続化状況

| 項目 | 保存先 | 状態 |
|------|--------|------|
| ProjectModel 全体 | JSON download | 有効 |
| analysisResults | timeHistory のみ | 部分永続 |
| BridgeProject | backend/data/bridges/ | 有効 |
| React UI state | 未永続 | リロードで消失 |
| static/eigen/spectrum/influence/movingLoad 結果 | React state のみ | **未永続** |

### ID生成

| エンティティ | ID形式 | 生成方法 |
|-------------|--------|----------|
| FEM Node/Member | `N{n}`/`M{n}` | 決定論的（入力順依存） |
| NodalLoad/MemberLoad | `NL{n}`/`ML{}` | 決定論的（入力順依存） |
| Importer entities | `{prefix}-{uuid}` | `crypto.randomUUID()` |
| Project ID | string | Manual/hardcoded |

### 座標規約（概要）

- LINER: X=線形面上(橋軸), Y=直交距離, Z=高程
- Bridge: X=支間累積, Y=断面方向, Z=0.0
- Viewer: 表示変換のみ（swap+sign flip）
- 詳細: [coordinate_convention.md](./coordinate_convention.md)

---

## 証拠Path

| 事実 | 根拠 |
|------|------|
| AUTOSAVE_ENABLED = false | `frontend/src/App.tsx:89` |
| ProjectModel 定義 | `frontend/src/types.ts:158-196` |
| BridgeProject 定義 | `frontend/src/bridge/types.ts:49-63` |
| BridgeDefinition 定義 | `frontend/src/bridgeDefinition/types.ts:173-191` |
| generate_fem_model | `backend/engine/bridge_fem_generator.py:136` |
| validate_model | `backend/engine/model.py:317-513` |
| routeRedirect | `frontend/src/timeHistory/routeRedirect.ts:1-21` |
| main.tsx routing | `frontend/src/main.tsx:30-33` |
