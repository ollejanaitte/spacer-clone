# STEP 1-P03 — API_DATAFLOW_MATRIX

> **Authority:** Reference Bridge 001 (RB-S10-001) — 上部工一気通貫
> **Status:** STEP 1 設計
> **正本:** `backend/app/main.py` ルート一覧・`frontend/src/api/client.ts`・`frontend/src/apollo/importExport.ts`

## 1. 現行 backend API（責務確定）

| Method | Path | 責務 | 消費者 | 備考 |
|--------|------|------|--------|------|
| GET | /health | 死活・version | UI | |
| POST | /api/projects/validate | schema/非有限値検証 | UI（Pro/LINER） | |
| POST | /api/analysis/run | 線形静的解析+CSV | UI（AnalysisProbe） | IF3 正規化+persistence |
| POST | /api/analysis/eigen | 固有値解析 | UI | |
| POST | /api/analysis/response-spectrum | 応答スペクトル | UI | |
| POST | /api/analysis/time-history | Newmark-B 時刻歴 | UI | 部材力/反力は未出力 |
| POST | /api/influence/run | 影響線 | UI | |
| POST | /api/moving-load/run | 移動荷重 | UI | |
| POST | /api/projects/save | project.json 保存 | UI | atomic store |
| POST | /api/projects/load | 保存済み読込 | UI | |
| POST/GET | /api/projects/autosave | autosave | UI | 現状 OFF |
| GET | /api/examples | サンプル一覧 | UI | |
| POST | /api/if3/availability | IF3 catalog | UI | checksum 束縛 |
| POST | /api/bridge | bridge definition 作成 | BridgeWizard | |
| GET/PUT/DELETE | /api/bridge/{id} | bridge CRUD | BridgeWizard | |
| GET | /api/bridge/template | 既定 template | BridgeWizard | |
| POST | /api/fem/generate | bridge→FEM 生成(+解析) | BridgeWizard | |
| GET | /api/viewer/bridge/{id} | viewer payload | Viewer | |

## 2. STEP 2 で追加する backend API（責務確定・実装先）

| 追加 API（案） | 責務 | Producer | Consumer | 依存 |
|----------------|------|----------|----------|------|
| POST /api/design/grillage/generate | GeometrySnapshot→設計格子生成 | Design Engine | UI/backend | 2-14 |
| POST /api/design/analyze | 格子解析（反力/断面力） | Analyzer | UI | 2-15 |
| POST /api/design/check | 照査実行（主桁/横桁/横構/床版/支承） | Design Engine | UI | 2-16 |
| POST /api/design/autosize | 断面自動決定 iteration | Design Engine | UI | 2-19 |
| POST /api/design/report | 正式計算書生成（認証ゲート後） | Report Connector | UI | 2-20 |
| POST /api/replay/run | RB-001 Project Replay | Replay | UI/CLI | 2-12 |
| POST /api/design/result | 設計結果ドキュメント取得/保存 | Design Engine | UI | 2-16..19 |

※ 各 API は `bridge-superstructure-design-document` + `frame-analysis-result-resource` を
入出力とし、既存 `/api/analysis/run` を壊さない。数値出力は認証ゲートを透過しない。

## 3. データフロー（frontend/backend/adapter/persistence/import-export）

```
UI (ApolloPhase1Shell / 新画面)
  │ import/export: importExport.ts (Common Model round-trip, fail-closed)
  │ save/load: workspace (localStorage) + /api/projects/* + file
  ▼
Common Bridge Data Model (canonical, 永続化契約)
  ▼ GeometryInputAdapter (frontend, 計算なし)
GeometryEngineInput
  ▼ GeometryEngine (frontend, LINER接続)
GeometrySnapshot  ──► 3D Connector ──► Viewer3D（表示専用）
  │                ──► Drawing/Report/Quantity Connector
  ▼ StructuralModel Connector
解析モデル ──► backend /api/analysis/* or /api/design/* ──► Results (IF3)
  ▼ Design Engine（照査・断面決定）
設計結果 ──► Report / Drawing / Quantity / DXF / STL（認証ゲート）
  ▼ traceability
Replay / Golden Master / 出力 artifact
```

## 4. backend canonical state と UI state

- UI state は transient（history/workspace）。永続化は Common Model（+ 設計 document）。
- 競合防止: 保存時 serialize（unit2Draft → Common Model）→ load 時 hydration を
  現行 `importExport.ts` / `unit2Draft.ts` 機構で統一。解析結果は別 resource（IF3）。
- autosave は現状 OFF 維持（復元可能なコードパス保持）。

## 5. 監査チェック

- API 未接続・stub・placeholder・TODO が残らない（STEP 3 完了時）。
- 同じ計算を frontend/backend で二重実装しない（幾何は frontend Geometry、解析は backend）。
- save/load 後に同一結果が再現できる（Replay で保証）。
