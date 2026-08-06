# 座標系（Coordinate System）

区分:
- EXISTING_CODE_DERIVED : spacer-clone の座標系ポリシーから読み取った事項
- PROPOSED : 今回提案する事項
- INFERENCE : 推論
- UNRESOLVED : 未解決

## 1. 基本方針

右手系、Z-up、単位 m / deg（角度）を採用する。

spacer-clone の座標系ポリシー（docs/road/design/coordinate_system_policy.md）に合わせ、
`x-longitudinal-y-transverse-z-up` を基本とする。

### 1.1 グローバル座標

| 軸 | 意味 | 既定方向 |
|---|---|---|
| X | 橋軸方向（進行方向） | +X が橋軸正方向 |
| Y | 橋軸直角方向 | +Y は +X を見て左が正 |
| Z | 鉛直方向 | +Z が上 |

右利き（右手系）：X×Y=Z。

### 1.2 ローカル座標（下部工）

- 各下部工はグローバルに配置する。下部工内は local 軸で寸法を持つ。
- 寸法の正方向は原則 +X（橋軸）/ +Y（直角）/ +Z（上）。
- 斜角は支承線（橋軸直角方向）を回転させる。

### 1.3 斜角（skewAngle）

- 橋軸直角（Y軸）から支承線方向への回転角。
- 正の向きは +Z 軸周り（Z-up で上から見て CCW を正）。
- EXISTING_CODE_DERIVED: azimuth は +X から +Y へ CCW 正。斜角もこの規約に整合させる。

UNRESOLVED: 斜角の正負は現場により「右回り/左回り」解釈が異なる可能性。
交換スキーマでは direction 定義（ccw_positive 等）を明示する。

### 1.4 支持点・桁下高

- support.position = {x,y,z} は支点の基準点（通常、支承天端または柱芯・桁下高基点）。
- girderBottomElevation / deckElevation は Z で持つ。
- 桁下高 = deckElevation - 上部工床版厚 - 支承高（概算）。

PROPOSED: 交換スキーマで elevationReference を定義（girder_bottom / deck_top / ground 等）。

## 2. 単位系

- 長さ: m
- 角度: deg（保存）、内部計算 rad
- 力: kN
- 体積: m^3
- 距離: m

unitSystem 不明時は拒否。

## 3. 変換

- プロジェクトは origin でオフセット。
- 3Dシーンは右手系 Z-up の Three.js にそのまま対応（Y-up に変換しない方針）。
  ただし Three.js は Y-up が慣例のため、表示側では Z-up を保持するか、
  表示用に一時変換するかを明示。本プロトタイプでは Z-up のまま表示する。

## 4. 検証テスト

- 橋軸方向変更（X方向基準ベクトル変更）時の回転
- 斜角変更時の支承線回転
- 支点座標変更時の移動
- 上記を検証項目に含める（verification/test_plan.md）

## 5. 留意点

- 下部工の寸法が「+X が橋軸」を前提とするため、曲線部・斜角大の場合は
  曲線近似（弦長/直線近似）が必要になる。初期は直線橋のみ想定。

UNRESOLVED:
- 曲線橋・超高（カント）の扱いは対象外（将来）。
- 右利き座標系はIFS等と一致するが、地図座標（緯度経度）は対象外。
