# Phase 5-01 Step B-02: Migration設計（凍結案）

## 1. 目的

旧BridgeProject / Apollo / 既存Superstructure資産から
新Project Data Core / SuperstructureDocument への移行方針を確定する。

Phase 5-02の実装が**追加設計判断なし**で進められるよう、
「何を移すか / 何を残すか / 何を捨てるか / どう接続するか」を凍結する。

- baseline: `6e3cc6dc795707770f87ebdd68c0d640d0a9a91c`
- 日付: 2026-08-12

## 2. 移行原則（凍結）

1. **データの自動移行はしない**。Phase 5-02はBridge Layoutから新規生成を正とする
   （設計順序: 橋梁配置→上部工。旧BSDDデータを新Documentへ流用しない）
2. 旧システム（App.tsx / Apollo / BridgeProject）は**compatibility boundaryとして残す**
   （既存機能・tests・regressionを壊さない）
3. 新システムは `frontend/src/next/` 配下に自己完結
4. 移行は「コードの再利用」であり「データの引継ぎ」ではない
5. 既存dirty差分・旧資産は削除・破棄しない

## 3. 移行対象と扱い（凍結）

| 旧資産 | 扱い | 移行内容 |
|---|---|---|
| BridgeProject統合チェーン（bridgeProject/*） | **参照維持** | 新システムで使用しない。新adapter/bindingは同ロジックを新正本向けにADAPT実装 |
| Apollo Geometry（engine/placement/snapshot等） | **KEEP利用** | GeometryEngineInput→GeometrySnapshot経路をそのまま利用 |
| CommonModelGeometryInputAdapter | **ADAPT** | 新SuperstructureDocument向け新adapterを追加（旧は維持） |
| superstructureAdapter / superstructureBinding | **ADAPT** | 新関数を追加（旧は維持） |
| projectSuperstructure.ts | **参照維持** | 新経路では不使用 |
| BSDD（contract + schema） | **参照維持** | 新SuperstructureDocumentの設計思想の参考。データ移行なし |
| backend grillage / solver | **KEEP利用** | 解析実行層として利用 |
| bridge_fem_generator.py | **REWRITE（置換）** | Phase 5-02では使用しない。分析はgrillage経路を正とする（後述） |
| 3D（snapshot3d / solids / STL） | **KEEP利用** | 上部工3D表示に利用 |
| superstructureEnvelope / support-interface | **KEEP利用** | Phase 6 Handoff境界 |
| 旧Apolloパネル（SuperstructurePipelinePanel等） | **参照維持** | 新moduleから呼ばない |

## 4. 移行の3層モデル（凍結）

```
【第1層】旧システム（残す・REFERENCE）
  App.tsx / Apollo / BridgeProject / 旧sidecar / 旧tests
  → 既存機能・regressionを維持。mainへはPhase 5-00以前のまま

【第2層】新システム（新規・正本）
  next/（PDC）＋ modules.superstructure
  → SuperstructureDocumentを正本として上部工を完結

【第3層】共有実行層（KEEPで利用）
  LINER core / GeometryEngine / GeometrySnapshot / grillage+solver /
  3D solids / STL / superstructureEnvelope / support-interface
  → 旧・新の両システムから同一ロジックを呼ぶ（正本は持ち歩かない）
```

## 5. データフロー移行マップ（凍結）

旧:
```
LINER draft → buildBridgeProjectAlignment → buildBridgeProjectGeometry
  → CBDM → CommonModelGeometryInputAdapter → GeometryEngineInput
  → DefaultGeometryEngine → GeometrySnapshot → BSDD/BridgeProjectSuperstructure
```

新:
```
BridgeLayoutDocument（正本）
  → Span Handoff / Support Handoff（derived）
  → SuperstructureDocument（正本・上部工入力統合）
  → superstructureFacts（新adapter） / superstructureBindingNew
  → GeometryEngineInput → DefaultGeometryEngine → GeometrySnapshot（KEEP）
  → 3D / Analysis / Design / Reaction Handoff
```

旧→新の橋渡しに**データ変換（migration）は存在しない**。
「生成起点の差し替え」のみ。旧生成起点（LINER draft→CBDM）は新では
「BridgeLayoutDocument→SuperstructureDocument」へ置き換わる。

## 6. bridge_fem_generator.py の置換方針（凍結）

- 現状: `backend/engine/bridge_fem_generator.py`（station→X / offset→Y / Z=0 仮定）
  が旧FEM生成。R0-08およびPhase 5-00でREWRITE判定
- Phase 5-02での置換:
  - 上部工解析は **grillage経路**（`apollo/design/grillageModel.ts` →
    `backend/engine/grillage.py` → `solver.py`）を正とする
  - bridge_fem_generator.pyは新経路から**呼ばない**（参照のみ・削除しない）
  - 旧`bridge_model.py` / `bridge_fem_generator.py`の依存は新システムへ持ち込まない
- 備考: 旧FEM生成の一部（部材メッシュ化）は後続Phase（FEM Phase）で
  GeometrySnapshot由来へ再実装する候補。Phase 5-02ではスコープ外

## 7. ID・参照の移行（凍結）

| 対象 | 新ID規則 | 旧IDとの関係 |
|---|---|---|
| supportId | A1/P1..Pn/A2（BridgeLayoutDocumentからそのまま） | 同一IDを継承（参照） |
| spanId | S1..Sn（generateSpansから） | 同一IDを継承 |
| girderId | G1..Gn（上部工所有） | 旧BSDD girderLineIdとは別体系 |
| bearing seatId | BRG-{supportId}-{girderId} | 新規 |
| documentId | deriveStableUuid("superstructure-design", bridgeId) | 新規・安定 |
| geometry fingerprint | computeFingerprint（不変） | 同一ロジック |

## 8. バージョン・スキーマ移行（凍結）

- 新SuperstructureDocument: schemaVersion `0.1.0`（新規・旧schemaとの互換なし）
- PDC: `PROJECT_MIGRATIONS` は現状空。Phase 5-02でsuperstructure module追加時に
  migration（module存在チェック・初期化）を定義
- 旧CBDM/BSDDのversionは旧システム内で維持（新システムは参照しない）

## 9. 移行リスク（凍結）

1. 二重正本化リスク: 新module内にproducer配線を閉じないと旧経路と二重化
   → 対策: 新SuperstructureDocument生成は新module内の`buildSuperstructureDocument`のみ
2. 旧regression破壊リスク: 新関数追加は既存関数を変更しない（追加のみ）
   → 対策: 既存tests維持・新tests追加
3. 座標規約混在リスク: 旧`SpacerAxisSwap`（y-up）と新`renderCoordinate`（x→x,y→z,z→-y）
   → 対策: 新システムはrenderCoordinateのみ使用。旧3Dパス（integratedScene3d等）は新3Dに使わない

## 10. 移行チェックリスト（Phase 5-02開始時点で満たすこと）

- [ ] 新SuperstructureDocumentがBridgeLayoutから生成できる（WP-A/B）
- [ ] 旧関数（buildBoundGeometryInput等）は未変更（regression維持）
- [ ] GeometrySnapshot経路（engine）は既存のまま利用
- [ ] grillage経路が新bindingから呼べる（WP-F）
- [ ] 旧bridge_fem_generator.pyは新経路から未参照
- [ ] 新3DはrenderCoordinateのみ使用
- [ ] 旧Apolloパネルは新moduleから未参照
