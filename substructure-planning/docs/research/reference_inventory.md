# 参考資料一覧（Reference Inventory）


## 本ドキュメントの位置づけ

下部工計画・3Dモデリングツールの事前調査で参照できる資料を整理する。
「ローカルに存在する資料」と「未入手資料」を区分する。
記載内容は原則 SOURCE_DERIVED（資料から読み取った事項）とする。
個人の判断を交える場合は PROPOSED / INFERENCE として明記する。

CLASSIFICATION:
- SOURCE_DERIVED   : 資料から読み取った事項
- PROPOSED         : 今回提案する事項
- INFERENCE        : 資料・既存コードを基にした推論
- UNRESOLVED       : 根拠不足または未解決事項

## ローカルで入手済みの資料

| ID | 資料 | 場所 | 状態 | 区分 |
|----|------|------|------|------|
| REF-001 | JIP-LINER マニュアル PDF | spacer-clone/マニュアル/JIP-LINER_マニュアル.pdf | SOURCE_DERIVED | |
| REF-002 | SPACER 操作マニュアル PDF | spacer-clone/マニュアル/SPACER操作マニュアル.pdf | SOURCE_DERIVED | |
| REF-003 | 鋼鈑桁橋_設計計算例.pdf | ~/Projects/鋼鈑桁橋_設計計算例.pdf | SOURCE_DERIVED | |
| REF-004 | 鋼鈑桁橋_図面例.pdf | ~/Projects/鋼鈑桁橋_図面例.pdf | SOURCE_DERIVED | |
| REF-005 | BridgeDefinition JSON Schema | spacer-clone/schemas/bridge-definition.schema.json | EXISTING_CODE_DERIVED | 上部工データモデル |
| REF-006 | RoadToFrameTransferPackage | spacer-clone/frontend/src/contracts/roadToFrameTransferPackage.ts | EXISTING_CODE_DERIVED | |
| REF-007 | 座標系ポリシー | spacer-clone/docs/road/design/coordinate_system_policy.md | EXISTING_CODE_DERIVED | |
| REF-008 | road-to-frame 交換スキーマ | spacer-clone/schemas/contracts/v0.1/ | EXISTING_CODE_DERIVED | IF3風コントラクト |
| REF-009 | STL export 設計 | spacer-clone/docs/apollo/3d-stl/10_stl_export_design.md 等 | EXISTING_CODE_DERIVED | |
| REF-010 | Apollo STL 実装 | spacer-clone/frontend/src/apollo/export/apolloStlExport.ts | EXISTING_CODE_DERIVED | |
| REF-011 | bridgeDefinition 型定義 | spacer-clone/frontend/src/bridgeDefinition/types.ts | EXISTING_CODE_DERIVED | |
| REF-012 | 3D ビューア実装 | spacer-clone/frontend/src/viewer/, BridgeThreeViewer.tsx | EXISTING_CODE_DERIVED | |
| REF-013 | project.schema.json | spacer-clone/schemas/project.schema.json | EXISTING_CODE_DERIVED | |
| REF-014 | result.schema.json | spacer-clone/schemas/result.schema.json | EXISTING_CODE_DERIVED | 反力系 |

## 2. 未入手資料（UNDERREACHED）

- Apollo SuperDesigner / SuperDrawing の各資料（ローカルに未整備）
- JIP-LINER の正式仕様書一式（マニュアルの他、操作系のみ入手）
- 下部工専用の設計基準（道路橋示方書・下部構造編）の全文
- 杭基礎・橋台の詳細な一般図（取り合いが完全に判る図面）

上記は今回 `未入手資料` として記録する。
本作業ではネット取得せず、必要な場合は UNRESOLVED として扱う。

## 3. 上部工と下部工の接続情報整理

SOURCE_DERIVED / EXISTING_CODE_DERIVED:

- 上部工側は `BridgeDefinition` に支援点(support)を `station`（橋軸上の距離[になる])だけで定義する。
  座標 x/y/z は持たない。支援点は `substructureKind` (abutment/pier) を参照する。
- 支承(bearings[]) は `{ id, supportId, type }` で支援点を参照する。支承座(seat)の座標エンティティは既存モデルに存在しない。
- RoadToFrameTransferPackage は `SubstructureEntry`（point XOR polyline）+ `BearingLineEntry` で
  下部局所形状と支承線を結びつける。UUID entityId + dependencyIds で安定参照。
- 座標は `x-longitudinal-y-transverse-z-up`（右利き、X×Y=Z）。斜角は skewAngleDeg。
- 反力は現状 `result.schema.json` の `reactions[]`="{loadCaseId,nodeId,fx..mz,constrainedDofs}" として汎用表現。
  引張/活荷重/制動/風/耐震 の分類enumは未実装。

INFERENCE:
- 下部ツールは上部工と座標系を合わせるなら `x-longitudinal-y-transverse-z-up` を踏襲するのが整合的。
- 支援/支承を station ベースで参照し、下部の構造寸法は下部ツールが独自に保持する疎結合が自然。

UNRESOLVED:
- 上部工と下部で「桁下高・支承高・下部の天端高」の各 Z 定義の一致。設計計算書で確認が必要。
- 斜角の入り方（上部工定義 vs 下部定義のどちらが正）の明確化。

## 4. 既存資産の再利用可否（概観）

| 資産 | 再利用可否 | 理由 |
|------|-----------|------|
| BridgeDefinition 座標ポリシー | 可能（概念流用） | 座標系を統一したい |
| RoadToFrame の entityId パターン | 可能（概念流用） | 安定ID付与の流儀 |
| STL 出力アーキ（@jscad/stl-serializer） | 方式検討のみ | 自作prototypeで利用可能 |
| 既存上部のコード本体 | 移し替えない | spacer-clone変更禁止、密結合回避 |
| 下部専用モデル（柱/フーチング/杭） | 新規考案 | 現行に基礎モデル皆無 |

必要に応じて資料を追加・補充する。
