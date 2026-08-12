# Phase 5-00 Step E: Phase 5-01「Superstructure Contract」Readiness

## 1. 目的

Phase 5-00（設計順序転換＋既存上部工資産・Connector監査）完了を受けて、
Phase 5-01「Superstructure Contract」を開始するための
準備状態・開始条件・契約候補・実装範囲を確定する。

- baseline: `019d304dffc7b1720565ee41960a95f67a0e65da`（Step D merge後）
- 日付: 2026-08-12

## 2. 設計順序（確定）

```
道路 → 地形・現況 → 橋梁配置 → 上部工 → 下部工 → FEM / 構造解析 → 統合3D / CIM → 成果品
```

- Phase 5 = 上部工（Superstructure）
- Phase 6 = 下部工（Substructure）
- Span Handoff → Phase 5上部工の正式入口
- Support Handoff → 共通Support配置情報（Phase 5上部工でも参照 / Phase 6下部工でも参照）

## 3. Phase 5-01 で実装する範囲（Superstructure Document Contract）

Phase 5-01では「上部工の正本Contract」を定義する。見切り発車の実装はしない。

### 3.1 SuperstructureDocument 最小Contract候補

既存BSDD（`bridgeSuperstructureDesignDocument` v0.1.0）をベースに、
新Project Data CoreのID/reference境界へ整理した最小契約候補。

```
SuperstructureDocument
├─ schemaVersion / documentKind: "superstructure-design"
├─ bridgeReference（bridgeId / BridgeLayoutDocument参照・複製しない）
├─ spanHandoffReference（span-handoff id参照・複製しない）
├─ supportHandoffReference（support-handoff id参照・複製しない）
├─ roadReference（moduleId: road / alignmentId・複製しない）
├─ superstructureType（プレートガーダー RC床版 非合成 等）
├─ spanSystem（simple / continuous）
├─ girderLines（girderLineId / offsetFromCenterline / depthProfileRef / materialRefId）
├─ deck（deckId / deckKind / width / thickness / unitWeight）
├─ bearingSupportRelation（supportId × girderId の支承配置関係）
├─ designStatus（NOT_AUTHORIZED / INCOMPLETE / READY / …）
└─ validation（schemaVersion / validatedAt / ok / issues）
```

- 正本はSuperstructureDocumentのみ。詳細設計値（桁高・断面・横桁・支承詳細・FEM）は含めない。
- 既存`BridgeProjectSuperstructure`（schemaVersion 0.1.0）のshared facts構造
  （girder arrangement / deck / bearing-support relation）は本Contractのベースとして
  ADAPT利用する。

### 3.2 新Project Data Coreへの接続

- `modules.superstructure` slot（既存宣言済み・空）へ接続。
- `projectSchema`（strictObject）と`registry.ts`の3重登録方式を踏襲。
- Persistenceは`next/persistence`（project.json + .spacerproj + backup）経由。
- 旧`ProjectModel.apolloBridgeProjectSuperstructure` sidecarとは分離する（旧systemは旧のまま）。

## 4. Bridge Layout からの入力（Phase 5上部工が参照するもの）

| 入力 | 供給元 | 利用方針 |
|---|---|---|
| span配置 | **Span Handoff**（`bridgeLayoutSpanHandoff.buildSpanHandoff`） | Phase 5上部工の**正式入口**。spanId/chain/spanLength/Σ=bridgeLength/skewを利用。正本はBridgeLayoutDocument |
| support配置 | **Support Handoff**（`bridgeLayoutSupportHandoff.buildSupportHandoff`） | **共通Support配置情報**として参照。supportId/station/position XYZ/elevation/tangentAzimuthRad/skewAngleRad/terrainElevation/roadReference |
| 道路Alignment | Road Module（`readRoadAlignmentContext`） | 上部工で再実装しない。LINER単一正本を経由（`LinerAlignmentConnector`原則） |
| 地形 | Terrain Module | 標高参照のみ（reference） |
| 現況 | Existing Conditions | 参照のみ（reference） |

## 5. Handoff利用方針

### Span Handoff
- `buildSpanHandoff(manager, projectId, document)` を毎回再生成（derived）。
- 上部工はspan chain・支間長・端支点skewを入力として受け取り、
  SuperstructureDocumentの`girderLines`/`spans`配置に利用。
- 正本編集禁止（BridgeLayoutDocumentが唯一正本）。

### Support Handoff
- `buildSupportHandoff(manager, projectId, document)` を毎回再生成。
- 上部工はsupport位置・標高・skewを、支承配置（bearingSupportRelation）と
  3D配置の参照に利用。
- Phase 6下部工は同Handoffを正式入口として利用（共通情報）。

## 6. 既存Adapter再利用方針

| 資産 | 再利用方針（Phase 5-01で確定） |
|---|---|
| `superstructureAdapter.buildBridgeProjectSuperstructure` | **ADAPT**。Snapshot+Handoff→SuperstructureDocument生成の核として流用。producerを新module内に配線。`analysisReference=NOT_AUTHORIZED`はdesignStatusとして継承 |
| `superstructureBinding.buildBoundGeometryInput` | **ADAPT**。入力（CBDM）をSuperstructureDocument+Handoffへ変更。fail-closed不変条件は維持。出力GeometryEngineInputは旧GeometryEngineへの互換入力 |
| `CommonModelGeometryInputAdapter` | ADAPT。入力元を新正本へ差し替え。写像はほぼ不変 |
| `LinerAlignmentConnector` | ADAPT。LINER単一正本の原則を維持し、新Road Module参照経路へ |
| GeometryEngine / GeometrySnapshot | **KEEP**。凍結契約。入力は新bindingから |
| 3D（snapshot3d / solids / STL） | KEEP。表示・出力に流用 |
| `projectSuperstructure.ts`（旧sidecar永続化） | ADAPT。新PDC永続化へ移行 |

## 7. Phase 5-01 の最初の最小縦断

1. **Phase 5-01-A**: SuperstructureDocument最小Contract（TS型＋Zod validator）を
   `contracts/` または `next/modules/superstructure/` に定義
2. **Phase 5-01-B**: `modules.superstructure` module登録（schema.ts keys＋strictObject＋registry.ts）
   ＋SuperstructureModuleAdapter（read/write/has）
3. **Phase 5-01-C**: Span/Support Handoff読み込み＋SuperstructureDocument初期生成
   （buildBoundGeometryInput経由でGeometryEngineInput生成）
4. **Phase 5-01-D**: 上部工Shell UI（最小）＋GeometrySnapshot→3D表示（既存資産流用）
5. **Phase 5-01-E**: Persistence（Auto Save / restart restore / .spacerproj round-trip）＋
   Completion Gate相当（Phase 5-01 readiness）＋tests

## 8. Phase 5-01 で実装してはいけない範囲（越境禁止）

- 主桁自動設計・桁断面設計（DEFER）
- 床版設計・横桁設計・横構設計（DEFER）
- 支承詳細設計（DEFER）
- 荷重計算本実装（DEFER）
- FEM本実装・支点反力本計算（DEFER）
- 図面・計算書・数量・成果品（DEFER）
- Phase 6下部工本体（DEFER）
- 既存旧system（App.tsx / Apolloパイプライン）の改修（REFERENCE維持）

Phase 5-01は「上部工正本のContract確立＋Project Data Coreへの接続」に限定する。

## 9. Phase 5-01 開始条件（Gate）

- [x] Phase 5-00 COMPLETE（設計順序転換・inventory・Connector監査・分類・Migration Map）
- [x] BridgeLayoutDocument / Span Handoff / Support Handoff が本番コードで利用可能
- [x] modules.superstructure slot が登録済み（空）
- [x] 既存上部工資産のKEEP/ADAPT判定確定
- [x] GeometryEngine / GeometrySnapshot の流用方針確定
- [ ] 上部工Shell UI の実装（Phase 5-01で実施）
- [ ] SuperstructureDocument のContract確定（Phase 5-01で実施）

## 10. リスク

- SuperstructureDocumentと旧BSDDの差分吸収コスト（Phase 5-01で設計判断）
- superstructureAdapterのproducer配線を新module内に閉じないと二重正本
- `projectSchema` strictObjectのmodule登録3重変更（既知・手順化）
