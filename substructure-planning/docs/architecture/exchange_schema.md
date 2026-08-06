# 上部工交換スキーマ案（Exchange Schema）

区分:
- PROPOSED : 今回提案する事項
- EXISTING_CODE_DERIVED : spacer-clone から読み取った事項
- INFERENCE : 推論

## 1. 目的

上部工ツール（spacer-clone）と下部工ツールを、コード結合ではなく
JSON交換データで疎結合連携するためのスキーマ案。

## 2. 設計原則

- 上部工から下部工へ: 支点・支承位置・桁下高・反力（任意）
- 下部工から上部工へ: 下部工形状・寸法・数量（将来）
- 上部工がなくても下部工ツール単独で動作可能
- 未知項目があっても safe（スキーマバージョンで制御）

## 3. スキーマ構成

### 3.1 substructure-project.schema.json

下部工ツール自身のプロジェクト全体を保存するスキーマ。
上部工からの入力値を含み得る。

### 3.2 support-interface.schema.json

上部工と下部工の境界を表す交換スキーマ。次の項目を持つ（必須は★）。

| 項目 | 型 | 必須 | 備考 |
|---|---|---|---|
| schemaVersion | string | ★ | semver |
| projectId | string | ★ | |
| bridgeId | string | | |
| supportId | string | ★ | P1 等 |
| supportType | enum(pier/abutment) | ★ | |
| sourceApplication | string | ★ | |
| sourceVersion | string | ★ | |
| sourceRevision | string | | |
| coordinateSystem | string | ★ | x-longitudinal-y-transverse-z-up |
| unitSystem | string | ★ | m, deg, kN |
| origin | {x,y,z} | ★ | |
| position | {x,y,z} | ★ | 支点座標 |
| longitudinalAxis | {x,y,z} | ★ | |
| transverseAxis | {x,y,z} | ★ | |
| verticalAxis | {x,y,z} | ★ | |
| skewAngle | number | | 斜角 deg |
| bearingSeats | array | | |
| bearingId | string | | |
| bearingPosition | {x,y,z} | | |
| bearingDimensions | {w,d,h} | | |
| bearingHeight | number | | |
| girderBottomElevation | number | | |
| deckElevation | number | | |
| reactionCases | array | | 任意 |
| permanentReaction | {fx,fy,fz,mx,my,mz} | | |
| liveLoadReaction | {..} | | |
| brakingReaction | {..} | | |
| windReaction | {..} | | |
| seismicLevel1Reaction | {..} | | |
| seismicLevel2Reaction | {..} | | |
| displacement | {..} | | |
| rotation | {..} | | |
| metadata | object | | |
| createdAt / updatedAt | string | | ISO8601 |

## 4. 反力の扱い

- 反力データがなくても 3D モデリング・概算数量は可能
- 反力依存計算（将来）は反力がないとき無効化
- 正式照査は常に無効

PROPOSED: reactionCases は「caseId + caseKind(permanent/live/braking/wind/seismic1/seismic2) + vector」の
配列で持つ。既存 spacer-clone の reactions[] は loadCaseId ベース（EXISTING_CODE_DERIVED）で、
caseKind 分類がないため、交換時は caseId をそのまま引き継ぐ（INFERENCE）。

## 5. 交換フロー

```text
spacer-clone (上部工)
   │  BridgeDefinition の supports/bearings/alignmentRefs から
   │  support-interface.json を生成（上部工側が下部工ツール向けに出力）
   ▼
support-interface.json
   ▼
下部工ツール
   - 支点・支承・桁下高を受ける
   - 下部工寸法（柱・梁・フーチング・杭）を入力
   - 3D生成・概算数量
   - substructure-project.json として保存
```

## 6. バージョンと前方互換

- schemaVersion 不一致は拒否（fail-closed）
- 未知の enum / フィールドは既定では拒否、拡張用に metadata を許可

## 7. 用語と既存の整合

- supportId: spacer-clone の BridgeDefinition.supports[].id に対応（EXISTING_CODE_DERIVED）
- bearingSeats: 既存には無いが、支承の載る座として新設（PROPOSED）
- reactionCases: 既存は loadCaseId ベース、caseKind を追加（PROPOSED）

## 8. スキーマファイル

- schemas/substructure-project.schema.json
- schemas/support-interface.schema.json
- サンプル: schemas/sample-project.json
