# 既存資産調査結果（Existing Asset Review）

対象: ~/Projects/spacer-clone（読み取り専用）
日付: 2026-08-07

区分:
- EXISTING_CODE_DERIVED : 既存コードから読み取った事項
- INFERENCE             : 既存コードを基にした推論
- PROPOSED              : 今回提案する事項
- UNRESOLVED            : 根拠不足

## 1. 調査対象

spacer-clone は上部工（鋼鈑桁）向けの React+TS+Three.js フロントエンド、
Python FastAPI バックエンド、Electron デスクトップで構成。

主要な既存実装:

| 資産 | 場所 | 役割 |
|---|---|---|
| BridgeDefinition | frontend/src/bridgeDefinition/types.ts, schemas/bridge-definition.schema.json | 上部工の意匠データモデル（支援・支承・スパン・桁） |
| RoadToFrameTransferPackage | frontend/src/contracts/roadToFrameTransferPackage.ts | 道路→フレーム交換パッケージ |
| bridgeDefinition アダプタ | frontend/src/bridgeDefinition/adapters/ | LINER/BridgeProject → BridgeDefinition |
| 3Dビューア | frontend/src/viewer/, BridgeThreeViewer.tsx | Three.js表示 |
| STL export | frontend/src/apollo/export/apolloStlExport.ts | @jscad/stl-serializer によるBinary STL |
| 座標系ポリシー | docs/road/design/coordinate_system_policy.md | x-longitudinal-y-transverse-z-up |
| schemas/contracts/v0.1/ | 24ファイル | IF3風コントラクト |

## 2. 既存の下部工まわりのデータモデル

### 2.1 支援（support）

EXISTING_CODE_DERIVED:

- `BridgeDefinition.supports[]` は `{ id, station, kind(fixed/pinned/roller/custom), substructureKind(abutment/pier), skewAngleDeg, transversePosition }`
- 支援は**座標ではなく station（橋軸距離）**で定義される。x/y/z 座標は持たない。
- 線形（alignment）は `alignmentRefs[]` に alignmentId と station 範囲のみ参照し、実線形は別保持。

### 2.2 支承（bearing）

EXISTING_CODE_DERIVED:

- `BridgeDefinition.bearings[]` は `{ id, supportId, type(elastomeric/pot/fixed/custom) }`
- 支承座（bearing seat）の座標・寸法エンティティは**未整備**。
- 支承位置は supportId 経由で station に紐づく。

### 2.3 橋脚・橋台・基礎

EXISTING_CODE_DERIVED:

- substructureKind は abutment/pier/virtual_pier の識別のみ。
- `defaultProject.ts` に `pierBaseGroundCondition`（岩盤/軟弱）がある。
- **フーチング・杭・柱・梁などの下部工ジオメトリの専用モデルは存在しない**。
  下部工は FEM の支持条件としてしか現れない。

### 2.4 反力（reaction）

EXISTING_CODE_DERIVED:

- `result.schema.json` の `reactions[]` = `{ loadCaseId, nodeId, fx..mz, constrainedDofs }`
- 常時・活荷重・制動・風・耐震のような分類enumは**現状なし**。loadCaseId の文字列で区別。

INFERENCE: 今回の交換スキーマでは reactionCases として分類を持たせつつ、
既存の loadCaseId ベースの汎用表現とも相互変換可能に設計すると、将来の連携が容易。

## 3. 座標系

EXISTING_CODE_DERIVED（docs/road/design/coordinate_system_policy.md）:

- 右手系 Z-up。+X = 橋軸方向（起点）、+Y = 橋軸直角（+X を見て左が+）、+Z = 鉛直上。
- 斜角 skewAngleDeg、方位角 azimuth は +X から +Y へ CCW 正。
- `BridgeDefinition.coordinatePolicy.axisConvention` = "x-longitudinal-y-transverse-z-up"
- 横断方向オフセット d は +左。

INFERENCE: 下部工ツールも同ポリシーに合わせるのが連携上望ましい。
ただし「+Y は +X を見て左」の定義は道路基準では一般に「左が+」だが、
日本の設計では「右が+」が使われることがあり、交差角・オフセットの正負は交換スキーマで明示する。

## 4. 3D / エクスポート

EXISTING_CODE_DERIVED:

- Three.js 0.184 + R3F。STL は @jscad/stl-serializer（Binary STL、既存）。
- glTF/GLB/OBJ の実装は無し（検討履歴のみ）。
- 部材→グループ→STL という層構造を持つ（girders/cross-beams/deck/bearings 等のグループ）。
- 部材ID（例: P1-COLUMN-01）のような安定IDは既存にはない。UUID entityId（RoadToFrame）はある。

INFERENCE:
- STL はテクスチャ無し・メタデータ無し・単位無し。glTF/GLB は単位とメタデータを保持可能。
- 部材ID保持には GLB の node.name や custom properties が使えるため、比較対象として glTF/GLB を推奨。

## 5. 再利用可否のまとめ

| 項目 | 再利用 | 方式 |
|---|---|---|
| 座標系ポリシー | 概念流用 | 同一規約 x-longitudinal-y-transverse-z-up を採用（明示化） |
| station ベースの支援定義 | 概念流用 | supportId と station の考え方を踏襲 |
| entityId / dependencyIds | 概念流用 | 安定IDの付与ルールに応用 |
| RoadToFrameTransferPackage の形 | 参照 | 交換スキーマの参考 |
| JSON Schema (bridge-definition.schema.json) | 参照のみ | 下部用は別スキーマを新規作成 |
| コード本体（TS/Python） | 移植しない | 疎結合。LAB_ROOT内で新規に最小実装 |
| STL 出力 | 方式参考 | プロトタイプでは Three.js GLTFExporter を中心に比較 |

## 6. ギャップと教訓

- 下部工の寸法データ（柱・梁・フーチング・杭・橋台・翼壁・地盤面）は現状どこにも無い。
  → 今回新規データモデルとして提案する。
- 反力の分類が無い。→ reactionCases を提案。
- 支承座の寸法が無い。→ bearingSeats を提案。
- 上部工側は「下部工 = 支持点」しか見ていない。→ 交換スキーマは下部工が上部工から
  支持点情報（station, 支承位置, 桁下高）を受け取り、下部工形状を返す設計が自然。

## 7. 結論

EXISTING_CODE_DERIVED + PROPOSED:
- 上部工の BridgeDefinition は下部工を「station + substructureKind + skewAngleDeg」で参照している。
- 今回の下部工ツールは、この「stationベース参照」を入り口とし、
  下部工独自の寸法を JSON で保持する疎結合交換が成立可能。

UNRESOLVED:
- 桁下高・支承高の定義の一致（上部工が桁下高を持っているか確認不足）。
- 斜角の符号規約の現場差。
