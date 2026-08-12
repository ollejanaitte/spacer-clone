# Phase 6-00 Step E: Migration Map ＋ Phase 6-01 Readiness

## 1. 目的

監査結果を基にPhase 6-01設計用の仮Migration Mapを作成し、
Phase 6-01「下部工全体完全設計・Design Freeze」開始可否を判定する。

- baseline: `eb2ed1658791ff4cde3b96303a0e6c5a3b097f28`（Step D merge後）
- 日付: 2026-08-13

## 2. Migration Map（仮・Phase 6-01設計用）

```
Project Data Core（最上位正本）
├─ modules.road / terrain / existing（KEEP・referenceのみ）
├─ modules.bridgeLayout
│    └─ BridgeLayoutDocument（唯一正本）
│         └─ Support Handoff（derived・共通Support配置情報）
│              ├─ Phase 5上部工で参照
│              └─ Phase 6下部工で参照（正式入口）
├─ modules.superstructure
│    └─ SuperstructureDocument（正本）
│         └─ Bearing / Reaction Handoff（derived・v1.0.0）
│              └─ toSupportInterfaceEntry（v0.1.0互換DTO）
└─ modules.substructure（Phase 6-01でslot実装）
     └─ SubstructureDocument（新正本候補・Phase 6-01で設計）
          ↓
     Compatibility Adapter（新・Phase 6-01設計）
       ├─ Phase 4 SupportHandoff → support配置（station/skew/XYZ/azimuth/terrain）
       └─ Phase 5 Bearing/Reaction Handoff → bearingSeats/reactionCases
          ↓
     既存Substructure実行層（KEEP）
       ├─ model.ts（v0.2.0→SubstructureDocumentへADAPT）
       ├─ SupportPlacementEngine（LINER単一正本）
       ├─ geometryBase / SolidGenerator / PlanProjection（KEEP）
       ├─ viewer3d（KEEP・表示変換はrenderCoordinateへ）
       ├─ Planning UI（KEEP・Host入力のみADAPT）
       ├─ design framework（KEEP・構造照査はDEFER）
       └─ persistence（ADAPT・download/upload→PDC）
```

### 原則（踏襲）

- Projectが最上位正本
- BridgeLayoutDocument / SuperstructureDocumentを**複製しない**
- 旧Substructure modelを**新正本にしない**（SubstructureDocumentへ集約）
- Connector内に別正本を作らない
- Terrain / Existing正本を複製しない（ID/reference境界）
- Viewer都合で正本を書き換えない
- Road geometryを再実装しない（LINER単一正本）

### 接続境界

```
Project Data Core / BridgeLayout / Superstructure Handoff
        ↕
Compatibility Adapter / Connector（新・Phase 6-01で設計）
        ↕
既存Substructure実行層（KEEP/ADAPT）
```

## 3. Phase 6-01 Readiness

### 3.1 再利用可能資産（確定）

| 資産 | 再利用方針 |
|---|---|
| model.ts（v0.2.0） | SubstructureDocumentの型ベース（ADAPT） |
| validation.ts | 検証ロジック踏襲 |
| SupportPlacementEngine | LINER正本としてKEEP |
| geometryBase / SolidGenerator / PlanProjection / viewer3d | 実行層としてKEEP |
| Planning UI（Host/Page/Viewport/forms/undo） | KEEP（Host入力を新PDC/Handoffへ） |
| design framework（runDesign/geometricQuantity/adapter境界） | KEEP（構造照査はDEFER） |
| 既存tests | regression維持 |

### 3.2 入力方針

| 入力 | 方針 |
|---|---|
| Phase 4 SupportHandoff | 正式入口。supportId/type/station/skewは直接・position/azimuth/terrainは新Connectorで接続 |
| Phase 5 Bearing/Reaction Handoff | bearingSeats/reactionCasesを受領（Adapter変換で6課題解決） |
| 未認証反力（NOT_AUTHORIZED） | **正式設計計算へ自動採用しない**（入力データとして保持・fail-closed） |
| Terrain / Existing | Phase 6-01で参照境界を設計（基礎高さ・根入れ計算） |

### 3.3 Adapter変換が必要な箇所

1. Phase 4 SupportHandoff → support配置（position/azimuth/terrainの接続）
2. Phase 5 Handoff → bearingSeats（sign/axis/ID/enum/localFrame/elevationの6課題）
3. reactionCases sign規約（up-positive vs fixture）の統一
4. support-interface schema整合（parser寛容化 or schema厳格化）
5. seat-ID 3方式の統一
6. Persistence方式（download/upload→PDC）

### 3.4 SubstructureDocument最小候補

```
SubstructureDocument
├─ schemaVersion / documentKind: "substructure-design"
├─ documentId（deriveStableUuid("substructure-design", bridgeId)）
├─ projectId / revisionId / status / provenance / timestamps
├─ bridgeLayoutReference（ID参照・複製なし）
├─ superstructureReference（ID参照・複製なし）
├─ roadReference / terrainReference / existingConditionsReference
├─ supportReferences（Phase 4 Support Handoff由来・derived）
├─ bearingReactionReferences（Phase 5 Handoff由来・derived）
├─ supports: Support[]（model.ts ADAPT・canonical）
├─ validation（fail-closed）
└─ extensions
```

### 3.5 Phase 6-01で凍結すべき設計項目

- SubstructureDocument Contract（全field・owner/canonical/derived/persistence）
- Compatibility Adapter / Connector設計（Handoff→support配置・bearing/reaction）
- Geometry仕様（support配置・Terrain/Existing参照・基礎高さ）
- 3D/CIM仕様（renderCoordinate統一・ID規則）
- Persistence仕様（PDC auto-save/.spacerproj/derived transient）
- schema/version/migration（0.2.0一本化）
- Design Check範囲（IN/OUT-SCOPE・未認証反力の扱い）
- Phase 6-02 Work Package
- Reference Sample候補

### 3.6 Phase 6-02で実装すべき範囲

- modules.substructure実装（SubstructureDocument/PDC接続）
- Compatibility Adapter/Connector実装
- Planning UIの新PDC接続
- Persistence（auto-save/.spacerproj）
- 既存実行層（geometry/3D/design framework）の新正本接続
- Terrain/Existing連携（基礎高さ等）

### 3.7 Phase 6で実装しない範囲（OUT-OF-SCOPE）

- 構造照査（stability/member/foundation/pile）の実数値化（認証Phase）
- 耐震照査・鉄筋設計（詳細設計Phase）
- 実計算engineの本実装（backend含む）
- 図面・計算書・数量・成果品
- 未認証反力の自動採用

### 3.8 Reference Sample候補

- `substructure-planning/verification/evidence/m3-03/design-result-P1.json`（golden・概算数量のみ）
- `substructure-planning/examples/sample-project.json`（v0.1.0）
- `reference-bridge-001-support-interface.json`（Phase 5接続検証用）
- 新サンプル（Phase 6-01で定義）

## 4. Readiness 判定

| 判定項目 | 状態 |
|---|---|
| 再利用可能model / Geometry / 3D / Planning / Design framework | ✅（L4〜L5・production実績） |
| Connector / Adapter / Handoff互換 | ✅（field互換確認済み・Adapter変換点特定） |
| Terrain / Existing接続方針 | ✅（Phase 6-01で設計） |
| 未認証Reactionの扱い | ✅（fail-closed・自動採用禁止） |
| 新PDC / SubstructureDocument設計対象 | ✅（最小候補定義） |
| **Phase 6-01 readiness** | **READY** |

## 5. 監査全体のまとめ（Step A〜E）

1. 既存下部工資産は成熟（L4〜L5）かつproduction実績あり（/pro/liner/substructure）
2. 新PDC / Phase 4 SupportHandoff / Phase 5 Handoffへの接続が最大の設計対象
3. 構造照査・実計算・耐震・鉄筋はDEFER（認証ゲート）
4. 未認証反力は自動採用しない（fail-closed）
5. **Phase 6-01はREADY**
