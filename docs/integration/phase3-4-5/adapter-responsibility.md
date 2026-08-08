# Phase 3-4/3-5 Adapter 責任

> **Phase:** P6 (docs)
> **対象:** `frontend/src/bridgeProject/{superstructureAdapter,projectSuperstructure,substructureBinding}.ts`

## 1. データ経路（正規）

```
① LINER → BridgeProject.Alignment → BridgeGeometry (CBDM)      [Phase 3-1/3-2]
  → ② GeometryEngineInput → GeometrySnapshot → 3D              [Phase 3-3]
  → ② BridgeProject.Superstructure (superstructureAdapter)     [Phase 3-4]
  → ③ Support[] binding (substructureBinding)                  [Phase 3-5]
  → SupportPlacementEngine（実線形配置）→ Pier/Abutment 初期モデル → 3D
  → Save / Load / Replay
```

## 2. 責任分離

| Adapter | 責任 | 計算しない |
|---------|------|-----------|
| `superstructureAdapter` | GeometrySnapshot + input → ②共有事実（girder/deck/bearing/spanSystem/3D ref） | 設計・解析・反力 |
| `attachSuperstructureToManifest` | manifest の bearingSeats / section status / references 更新 | — |
| `substructureBinding` | CBDM + manifest → ③ Support[]（station/skew/bearingSeats/alignment） | 設計・配置計算（SupportPlacementEngine が担当） |
| Calculation Adapter (A-01) | Support → 計算 engine 境界（**変更なし・再利用**） | — |

- 単一経路: `source → BridgeProject Adapter → Support model`。二重 adapter 生成禁止。
- ③の形状（pier/abutment form・寸法）は SUBSTRUCTURE_OWNER の入力（初期テンプレート）。

## 3. provenance / authorization

- BridgeProject.Superstructure は schemaVersion 0.1.0・documentId（決定論 uuid）・revision・provenance を保持。
- `analysisReference.status = NOT_AUTHORIZED`（正式解析未認証）。
- 反力: `buildBoundReactions` は NOT_AUTHORIZED のみ入力データとして伝搬。CONFIRMED/DERIVED は fail-closed。
- 未認証値を CONFIRMED へ昇格しない（CBDM `NOT_GRANTED` / `PROHIBITED` 維持）。

## 4. 永続化

- `ProjectModel.apolloBridgeProjectSuperstructure` サイドカー + importExport hydrate/serialize。
- ③は既存 `SubstructureProject 0.2.0` / `AdapterEnvelope 0.1.0` で永続化（既存経路）。
