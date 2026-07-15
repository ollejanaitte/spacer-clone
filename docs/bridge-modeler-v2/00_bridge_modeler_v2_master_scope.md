# 00 — Bridge Modeler V2 Master Scope

Date: 2026-07-14  
Status: 設計文書（監督決定に基づく）  
Authority: `_supervisor_decisions.md` の内容に準拠

---

## 1. 全体目的

Bridge Modeler V2 は、Legacy Bridge Wizard（6-step モーダル）を代替する、ルートベースの橋梁モデリングワークスペースである。LINER パイプラインと同一のアーキテクチャパターンに整合し、FEM 生成から Drawing/DXF 出力まで一貫したドメイン駆動設計を提供する。

### 目的の核心
- Legacy の flat z=0 グリッド FEM を、4層アーキテクチャによる Deterministic な構造モデルに置き換える
- LINER の `DrawingDocument` IR を橋梁描図に再利用し、DXF 切断を解消する
- `BridgeDefinition` を importer/legacy adapter の中間層として保持し、既存資産を毀損しない

## 2. 対象

| レイヤー | 対象範囲 |
| --- | --- |
| Frontend | `frontend/src/bridgeModelerV2/` — ルート、UI、ドメインロジック |
| Route | `/pro/bridge-modeler-v2` |
| Feature Flag | `VITE_BRIDGE_MODELER_V2=true` |
| Legacy | Bridge Wizard は coexistence 期間中そのまま保持 |
| Backend | 既存 solver のみ使用。V2 専用 API は MVP 後の PR |
| Schema | `BridgeModelerV2Document` (schemaVersion `bmv2-1.0.0`) |

## 3. 非対象

- Legacy BridgeProject (`frontend/src/bridge/`) の拡張・変更
- 既存 `docs/design/` の削除
- 既存テスト・フィクスチャの変更
- `package.json` / `package-lock.json` の変更
- Backend への新規 API エンドポイント追加（MVP1 後の PR）
- moving load engine（Phase 4 のみ）
- full report PDF productization（Phase 5 以降）
- Legacy BridgeProject → V2 自動移行（side-by-side coexistence）

## 4. Legacy 共存方針

| 項目 | 方針 | 根拠 |
| --- | --- | --- |
| Legacy Wizard | Toolbar モーダル `BridgeWizard` は coexistence 期間中保持 | ADR-BMV2-001 |
| Legacy 入口 | `App.bridgeWizardOpen` → `BridgeWizard` (モーダル) | `frontend/src/App.tsx:115` |
| V2 入口 | `/pro/bridge-modeler-v2` ルート | ADR-BMV2-001 |
| Feature flag | `VITE_BRIDGE_MODELER_V2` が Legacy に影響しない | ADR-BMV2-011 |
| 非推奨 | Legacy の deprecation は明示的な PR まで実施しない | ADR-BMV2-001 |
| 移行 | 自動移行なし。Optional one-way import adapter は P2 | ADR-BMV2-008 |

## 5. 再利用資産

| 資産 | 再利用方法 | 根拠 |
| --- | --- | --- |
| `BridgeDefinition` (schema 1.0.0) | importer/legacy adapter の中間層として保持 | ADR-BMV2-014 |
| `sourceRevisionFor` | LINER pipeline の revision ハッシュをそのまま利用 | ADR-BMV2-002 |
| `DrawingDocument` | Phase 5 の描図 IR として LINER の型を再利用 | ADR-BMV2-006 |
| `ProjectModel` | FEM 結果の永続化形状として既存 solver 出力を使用 | ADR-BMV2-003 |
| `formatStationPlanNotation` / `formatStationDisplay` | Station 表示に既存関数を再利用 | ADR-BMV2-009 |
| LINER DXF mapper/serializer | Bridge 描図の DXF 出力に LINER の DXF パイプラインを再利用 | ADR-BMV2-006 |
| section-editor パターン | Undo/redo の command stack パターン | ADR-BMV2-012 |
| App project autosave | V2 document の autosave に App のパターンを模倣 | ADR-BMV2-008 |

## 6. 新規責務

| レイヤー | 新規責務 |
| --- | --- |
| Phase 1 | `RoadAlignmentReference`、LINER select、alignment 参照、station range、revision、stale detection |
| Phase 2 | `BridgeStructureModel` — supports, girders, cross girders, bearings, sections, materials |
| Phase 3 | Staged FEM pipeline — stations → XYZ → nodes → members → supports → ProjectModel + IdCorrespondence + Diagnostics |
| Phase 4 | `DeckSurface`, `DeckZone`, `TrafficLoadZone`, `LoadPath` — load surface 分離 |
| Phase 5 | `DrawingDocument` builder — FEM grid drawing, support/girder plans, section composition, DXF |
| 全体 | Deterministic stable IDs、diagnostics envelope、command stack (undo/redo) |

## 7. MVP1 境界

MVP1 は **Slice A+B（Phase 1 + Phase 2）** とする。

| In (MVP1) | Out (MVP1) |
| --- | --- |
| LINER alignment 参照選択 | FEM 生成（Phase 3） |
| Bridge interval (start/end station) | Traffic load zones（Phase 4） |
| Revision tracking + stale detection | Drawing/DXF（Phase 5） |
| Structure 入力 (supports, girders, bearings) | 既存 tests の変更 |
| 3D structure preview | Backend API 追加 |
| V2 document の front-end 保存 | Legacy wizard の変更 |

最終形は **Slice A〜E（Phase 1〜5）** とする。

### MVP1 完了条件
1. `/pro/bridge-modeler-v2` ルートが `VITE_BRIDGE_MODELER_V2=true` 時にのみ登録される
2. LINER alignment 参照を選択し、start/end station を指定できる
3. `sourceRevision` による stale detection が機能する
4. `BridgeStructureModel` に supports, girders, cross girders, bearings を入力できる
5. 3D preview で構造を確認できる
6. `BridgeModelerV2Document` が `ProjectModel.bridgeModelerV2` キーで project JSON に保存される
7. Legacy BridgeWizard が変更されない
8. `VITE_BRIDGE_MODELER_V2=false` 時に V2 ルートが表示されない

## 8. 依存概要

```
V2 Document
  ├── RoadAlignmentReference → LINER pipeline (sourceRevision)
  ├── BridgeInterval → station range
  ├── BridgeStructureModel → supports, girders, bearings
  └── AnalysisModelSpec → ProjectModel (Phase 3)
        └── backend solver (既存)

DrawingDocument (Phase 5)
  ├── LINER drawing model 再利用
  └── LINER DXF mapper/serializer 再利用
```

### 外部依存
- LINER pipeline: alignment 評価、station 生成、sourceRevision
- Backend solver: `POST /api/fem/generate` → `generate_fem_model` (既存)
- App project: autosave パターン、project JSON スキーマ

## 9. 実装開始条件

実装開始は blocking OD = 0 とした。

## 10. 完了条件（全体）

1. Phase 1-5 が全て実装される
2. Legacy BridgeWizard が deprecation PR まで動作し続ける
3. V2 document が `bmv2-1.0.0` スキーマで `ProjectModel.bridgeModelerV2` キーに永続化される
4. Deterministic stable IDs が再生成時に ID を保つ
5. Diagnostics envelope が FEM emit を block/banner する
6. DrawingDocument → DXF が LINER の adapter を介して出力される
7. Semantic parity テストが Legacy と V2 の結果一致を検証する
8. 既存 `docs/design/` が削除されない

---

## ADR 一覧（転記）

| ID | タイトル |
| --- | --- |
| ADR-BMV2-001 | New route, keep Legacy |
| ADR-BMV2-002 | LINER is source of truth for RoadAlignment |
| ADR-BMV2-003 | Four layers |
| ADR-BMV2-004 | Deterministic stable IDs |
| ADR-BMV2-005 | Separate deck / traffic load surface / FEM |
| ADR-BMV2-006 | DrawingDocument is the drawing IR |
| ADR-BMV2-007 | Staged FEM pipeline with diagnostics |
| ADR-BMV2-008 | Schema & persistence |
| ADR-BMV2-009 | Units & coordinates |
| ADR-BMV2-010 | Frontend/backend split |
| ADR-BMV2-011 | Feature flag |
| ADR-BMV2-012 | Undo/redo |
| ADR-BMV2-013 | Diagnostics envelope |
| ADR-BMV2-014 | BridgeDefinition relationship |

## Open Decisions（転記）

| ID | 内容 | 状態 |
| --- | --- | --- |
| OD-01 | Exact host project JSON key for embedding `BridgeModelerV2Document` → `ProjectModel.bridgeModelerV2` | **RESOLVED** |
| OD-02 | Backend REST vs frontend-only persistence for MVP1 | OPEN |
| OD-03 | Whether girder "follow widening" uses continuous offset function or piecewise stations in MVP1 | OPEN |
| OD-04 | Partial regeneration granularity (span-local vs full structure) | OPEN |
| OD-05 | Coexistence end criteria for removing Legacy Wizard | OPEN |
