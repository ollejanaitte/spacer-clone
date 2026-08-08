# BridgeGeometry mapping 表（Phase 3-2）

> `BridgeProjectBridgeGeometry` / CBDM `bridgeGeometry` の各値。
> **原則:** 上部工の固定値・sample 値から逆輸入して正本化しない。全て
> BridgeProject.Alignment + 明示配置条件（pier/span draft）から決定論導出。

| 項目 | 生成元 | status | unit | 備考 |
|------|--------|--------|------|------|
| bridgeId | options / alignment.alignmentId | CONFIRMED | — | |
| bridgeStartStation | 最上流 support station（A1） | CONFIRMED | m | 入力 |
| bridgeEndStation | 最下流 support station（A2） | CONFIRMED | m | 入力 |
| bridgeLength | 最下流 − 最上流 support station | DERIVED | m | alignment.bridgeLength と整合を検証 |
| support.station | pier.physicalDistance | CONFIRMED | m | 入力 |
| support.skew | pier.skewAngleRad | CONFIRMED / DEFERRED | rad | 未指定 → DEFERRED（推定しない） |
| support.position | alignment sample（LINER solver） | DERIVED | m | 再実装なし |
| support.tangent / transverse | alignment sample localFrame | DERIVED | m | |
| span.length | end − start support station | DERIVED | m | span draft 優先、無ければ consecutive |
| span.start/endSupportId | span draft（pierIdStart/pierIdEnd） | CONFIRMED | — | |
| deckWidth | options（CONFIRMED）/ cross-section max 幅（DERIVED）/ 無 → MISSING | 可変 | m | |
| centerOffset | options（既定 0） | CONFIRMED | m | 橋梁中心/基準線 |

## support / span / skew 生成ルール

1. support 一覧 = pier draft（station・kind・skew）。pier が無ければ alignment の
   support-station サンプルから fallback（kind=virtual_pier, skew=DEFERRED）。
2. support の station は**昇順必須**（違反 → fail-closed）。
3. span = span draft（pierIdStart/pierIdEnd）。無ければ consecutive supports から導出。
4. span 長 = end − start（DERIVED）。**span 合計 ≠ bridgeLength → fail-closed**。
5. support 配置が alignment.bridgeLength と不一致 → fail-closed。
6. skew は rad 正準。deg は sourceUnit としてのみ保持（現時点では deg 入力なし）。

## CBDM `bridgeGeometry` エンティティ

- SUPPORT（id=supportId）: `station` / `stationM` / `skew` / `skewRad` / `x` / `y` / `z` /
  `tangentX..Z` / `transverseX..Z` / `kind`
  - `station` と `stationM`、`skew` と `skewRad` は**両方**出力
    （既存 `CommonModelGeometryInputAdapter` が読むキーに適合）
- SPAN（id=spanId）: `spanLength` / `startStationM` / `endStationM` / `startSupportId` / `endSupportId`
- DECK: `widthM`
- girders / gridPoints / crossMembers: 空（上部工 owner）

## 3D 座標系整合

- 値は liner-global（x-east/y-north/z-up, m）で格納。
- 既存3D（threeCoords y-up / substructure domain x-longitudinal）への変換は
  runtime 境界の責務（本モジュールは変換しない）。座標系は manifest sharedFacts で宣言。
