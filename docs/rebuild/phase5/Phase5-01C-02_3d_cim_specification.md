# Phase 5-01 Step C-02: 3D / CIM設計（凍結案）

## 1. 目的

Road + Terrain + Existing + Bridge Layout + Superstructure を
同一座標系で表示する統合3Dの仕様を凍結する。
Phase 5-01では3D本実装を行わず、Phase 5-02で迷わない仕様まで確定する。

- baseline: `55b40539a7acf7738b2691315dd1f354387e0e2e`
- 日付: 2026-08-12

## 2. 基本原則（凍結）

- 正本は各ドキュメント（Road / Terrain / BridgeLayout / Superstructure）のみ
- 3Dは**表示・参照の場**。正本を書き換えない
- renderCoordinate（x→x, y→z, z→-y）を唯一の表示変換とする（R3-00 freeze）
- GeometrySnapshotのglobal XYZ / fingerprintを上部工3Dの配置根拠とする
- Project reload後は各正本から再生成（キャッシュは派生・再現性あり）

## 3. シーン構成（凍結）

| レイヤ | 内容 | 供給元 |
|---|---|---|
| Road | 路面メッシュ・線形 | `roadMesh.ts`（KEEP） |
| Terrain | TIN表面・tile（LOD） | `terrainViewerBuilder.ts`（KEEP） |
| Existing | 河川/道路/鉄道/橋梁/パイプ等ソリッド | `existingViewerBuilder.ts`（KEEP） |
| Bridge Layout | A1/P1..Pn/A2 marker・span・skew指示線・focus bounds | `bridgeLayoutScene.ts`（KEEP） |
| **Superstructure** | 主桁・床版・横桁・横構・支承ソリッド | **新規（WP-C）**・snapshot由来 |

### 3.1 Superstructure 3Dレイヤ（新規仕様）

- 生成元: GeometrySnapshot（fingerprint確定）＋ SuperstructureDocument（断面・配置）
- ソリッド生成: 既存 `snapshot3d.ts` / `bridgeStructureSolids.ts`（KEEP）を新moduleから呼ぶ
  - 主桁: girder linesを基準としたboxソリッド（断面寸法はSuperstructureDocumentのdesign model・MISSINGなら表現薄型）
  - 床版: deck reference（boundary・elevation）から板ソリッド
  - 横桁: cross girder reference位置でgirder間を渡すbox
  - 支承: bearing seat位置のマーカー（小型box）
- 配置変換: ソリッド生成をdomain座標（global XYZ）で行い、表示時のみrenderCoordinate適用
  - **旧`SpacerAxisSwap`（y-up）は使用しない**

## 4. ID規則（凍結）

| 対象 | ID | 備考 |
|---|---|---|
| scene object | `scene-{layer}-{entityId}` | layer: road/terrain/existing/bl/super |
| superstructure mesh | `super-girder-{girderId}` / `super-deck-{deckId}` / `super-xbeam-{crossBeamId}` / `super-brg-{seatId}` | entityIdは正本IDと一致 |
| selection ID | `{layer}:{entityId}`（例 `super:G1`） | プロパティ表示・選択同期 |
| 3D geometry（BufferGeometry） | 再生成ごとに新ID（非キャッシュ） | キャッシュはfingerprint key |

## 5. 表示仕様（凍結）

| 項目 | 仕様 |
|---|---|
| visibility | レイヤ別トグル（全レイヤ既定ON。superstructure追加で既定ON） |
| focus bounds | 選択エンティティ／全シーン。Bridge Layout focus（既存）＋superstructure選択時は選択部材へ |
| camera framing | 全シーン = 全レイヤ包含。単一選択 = 対象focusBounds |
| local origin | Project Origin基準（R3-00）。表示座標はoriginからのオフセット |
| clipping | 既定なし（全表示）。必要時はviewer設定のみ（正本不変更） |
| mesh regeneration | fingerprint不変なら同一生成（決定論）。正本変更時のみ再生成 |
| viewer cache | key = `renderKey(schemaVersion, fingerprint, documentRevision)`。正本由来のみ |

## 6. GeometrySnapshot 連動（凍結）

- 上部工3Dは `geometryReference.snapshotFingerprint` を必ず参照
- fingerprint不一致（正本変更後・snapshot未再生成）は **STALE表示**（既存表現: グレーアウト）
- 再生成: SuperstructureDocument → binding → engine → snapshot → 3D の一本道
  （Phase 5-02: `superstructureSceneBuilder` がこの経路を集約）

## 7. Project reload 後の再生成（凍結）

1. restore → modules.superstructure.data.superstructureDocument 復元
2. BridgeLayout復元 → Span/Support Handoff再生成 → derived一致検証
3. SuperstructureDocumentを再検証（STALE検出）
4. 3Dは初回表示時に snapshot再生成（fingerprint比較→必要なら再生成）
5. 解析結果はreload時に再計算（resultの再現性・詳細はPhase5-01E-01）

## 8. 将来CIM export境界（凍結）

- CIM / 統合3DはPhase 5-02では**本実装しない**（既存road/terrain CIMはKEEP）
- 将来のCIM exportは各正本（Road/Terrain/Existing/BridgeLayout/Superstructure）＋
  GeometrySnapshotを同一座標でまとめて出力する境界として本シーンを位置づける
- SuperstructureのCIM化は後続Phase（統合3D/CIM Phase）の対象。本設計書は
  「正本由来・決定論・ID整合」を保証する範囲までを凍結

## 9. 検証・tests観点（WP-C）

- 同一座標: Road+Terrain+Existing+BL+Superstructureの重なり（Reference Mountain・curved）
- ID整合: selection IDと正本entityIdの対応
- 決定論: 同一入力→同一メッシュ（fingerprint）
- reload再現: save→restart→restore→3D再生成（一致）
- renderCoordinate適用: domain→Threeの変換（既存テスト流用）
- STALE表示: fingerprint不一致時の表現
