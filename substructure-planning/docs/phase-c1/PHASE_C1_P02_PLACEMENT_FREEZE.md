# Phase C1 P02 下部工配置方式 Freeze

## 1. 配置方式の比較と決定

### 1.1 3方式の比較

| 項目 | A: LINER線形+測点 | B: LINER平面図選択 | C: XYZ直接指定 |
|------|------------------|-------------------|---------------|
| **方式名** | PRIMARY | SECONDARY | EXCEPTION |
| **説明** | alignmentId + station + offset で支点位置を決定し、LINER座標計算APIでXYZ変換 | 平面図上でクリックした位置からstation/offsetを逆算 | X/Y/Z座標を直接入力 |
| **必要データ** | LINER領域定義が必要 | LINER領域定義が必要 | 不要 |
| **精度** | 高い（線形計算に基づく） | 中（選択精度依存） | 中（入力依存） |
| **曲線対応** | 完全対応 | 完全対応 | 手動 |
| **斜角対応** | 自動（PierDraft.skewAngleRad） | 自動 | 手動 |
| **LINER連携** | 完全 | 部分（位置のみ） | なし |
| **平面図Overlay** | 自動 | 自動 | 手動位置調整 |
| **ユーザー負荷** | 低（station入力のみ） | 低（クリックのみ） | 高（全座標入力） |
| **推奨用途** | 標準 | 補助（直感的配置） | 例外（LINER未定義） |

### 1.2 決定

| 優先順 | 方式 | 判定 |
|--------|------|------|
| **PRIMARY** | LINER線形+測点+Offset | **正式採用** |
| SECONDARY | LINER平面図から選択 | **補助方式として採用**（P03 UI設計で詳細化） |
| EXCEPTION | XYZ直接指定 | **例外方式として採用**（制限付き） |

**基本ルール：** PRIMARY 方式を標準とし、SECONDARY は UI オプション、EXCEPTION は LINER 未定義領域のみ許可。

---

## 2. 位置情報の Source of Truth

### 2.1 正本定義

| 項目 | 正本（Source of Truth） | 算出方法 | 変更権限 |
|------|------------------------|---------|---------|
| **alignmentId** | LINER Draft | ユーザー指定 | LINER UI |
| **station** | Substructure placement | ユーザー指定 or LINER PierDraft | 下部工UI |
| **offset** | Substructure placement | ユーザー指定（通常0） | 下部工UI |
| **X** | LINER算出値 | `pointAtStationOffset(station, offset).x` | **読取専用** |
| **Y** | LINER算出値 | `pointAtStationOffset(station, offset).y` | **読取専用** |
| **Z** | LINER縦断 or ユーザー指定 | `pointAtStationOffset(station, offset).z` or 手動 | 混在（後述） |
| **tangent** | LINER算出値 | `pointAtStationOffset(station, offset).localFrame.tangent` | **読取専用** |
| **transverse** | LINER算出値 | 上記localFrameからskew適用後 | **読取専用** |
| **vertical (up)** | LINER算出値 | `localFrame.binormal` = (0,0,1) | **読取専用** |
| **skew angle** | Substructure placement | ユーザー指定 or LINER PierDraft | 下部工UI |
| **supportId** | Substructure Model（JSON正本） | ユーザー指定 or 自動生成 | 下部工UI |
| **bearingId** | Substructure Model（JSON正本） | 自動生成 | 自動 |
| **support type** | Substructure Model（JSON正本） | ユーザー指定 | 下部工UI |

### 2.2 責任分界

```
LINER（計算エンジン）:
  → alignment / station / offset の正本
  → pointAtStationOffset() で XYZ と localFrame を提供
  → 読取専用値を計算（X, Y, tangent, transverse, vertical）

Substructure Model（JSON 正本）:
  → supportId / supportType / station / offset / skewAngle の保存
  → 形状パラメータ（column / cap / footing / pile）の保存
  → SupportPlacementSnapshot の保存（LINER 再計算用）

Apollo（上部工データ）:
  → BSDD support / bearing の正本（上部工固有情報）
  → 下部工との supportId 対応のみ

SupportPlacementEngine（Connector）:
  → LINER 算出値から SupportPlacement[] を生成
  → station/offset → XYZ + localFrame の変換を実行
  → この Engine の出力は「読取専用」とする

3D Geometry Generator:
  → SupportPlacement + SubstructureModel から 3D Mesh を生成
  → 読み取り専用の位置情報を使用

2D Plan Projection:
  → SupportPlacement + SubstructureModel から 2D 図形を生成
  → 読み取り専用の位置情報を使用
```

### 2.3 読取専用ルール

以下の値はユーザーが直接編集できない（表示のみ）：
- X, Y（station + offset から自動算出）
- tangent, transverse, vertical 方向（LINER 線形 + skew から自動算出）

ユーザーが編集できる値：
- alignmentId（選択）
- station（数値）
- offset（数値）
- skewAngle（数値）
- Z（後述：自動 or 手動の混在）

**同じ値を複数Storeで独立管理しない。** Substructure Model が station/offset/skew を保持し、X/Y/tangent/transverse は毎回 LINER から再計算する。

---

## 3. 測点・Offset ルール

| 項目 | ルール |
|------|--------|
| **station の単位** | メートル（m） |
| **station の基準** | LINER 線形起点（0.0 = alignment 開始点） |
| **alignmentId 必須** | PRIMARY 方式では必須。EXCEPTION 方式では不要。 |
| **offset の符号規約** | 正 = 線形進行方向に対して右側（橋軸直角方向） |
| **左右方向の定義** | `localFrame.normal`（azimuth から算出）の方向 |
| **offset = 0 の意味** | 線形中心線上（支承中心の基準位置） |
| **測点範囲外** | LINER 座標APIの `COORDINATE_STATION_OUT_OF_RANGE` 相当。clamp 可能だが warning 表示。 |
| **線形未設定時** | EXCEPTION 方式（XYZ直接指定）のみ許可。3D生成は可、LINER平面図Overlayは不可。 |
| **station 変更時** | XYZ/tangent/transverse を再計算。3D位置を再配置。2D投影を再生成。 |
| **offset 変更時** | X/Y/Z を再計算（offset により Z も変わりうる）。3D/2D を再生成。 |

**station 変更時の再計算対象：**
```
station 変更
  → SupportPlacementEngine が pointAtStationOffset(newStation, offset) を実行
  → 新しい X, Y, Z, tangent, transverse を取得
  → SupportPlacementSnaphot を更新
  → 3D Geometry Generator が再実行（部材形状変更なし、位置のみ変更）
  → 2D Plan Projection が再実行
  → LINER 平面図 Overlay が再描画
```

---

## 4. 曲線橋・斜橋の座標ルール

### 4.1 座標系定義

```
世界座標系（World Coordinate System）:
  - X: 橋軸長手方向（線形の大局的方向）
  - Y: 橋軸直角方向
  - Z: 鉛直上向き
  - 右手系

線形局部座標系（Alignment Local Frame）:
  - tangent: 測点での接線方向（X_local）
  - normal:   tangent を左に90度回転（Y_local）... 橋軸直角方向
  - binormal: 鉛直上（Z_local）= (0, 0, 1)

支点局部座標系（Support Local Frame）:
  - longitudinal: tangent 方向（skew の基準）
  - transverse:   normal 方向を skew 角で回転
  - vertical:     binormal = (0, 0, 1)
```

### 4.2 local → world 変換

```
Support の配置 transform（Three.js Matrix4）:
  T = translate(position) × rotateZ(skewAngle)

詳細:
  1. 基点 P = pointAtStationOffset(station, offset) → (X, Y, Z)
  2. 接線方位 θ = pointAtStationOffset(station, offset).azimuth
  3. 局部基底（skew 適用前）:
       tangent   = (cos θ, sin θ, 0)
       normal    = (-sin θ, cos θ, 0)
  4. skew 角 α を normal から tangent 方向への回転として適用:
       longitudinal = tangent（不変... 橋軸方向）
       transverse   = rotate(normal, α) ... 支点線方向
  5. transform = {
       origin: P,
       xAxis: longitudinal,
       yAxis: transverse,
       zAxis: (0, 0, 1)
     }
```

### 4.3 skew 角の定義

| 項目 | ルール |
|------|--------|
| **基準** | LINER `pierLineGeometry.ts` の定義を継承 |
| **skew = 0** | Pier line = normal 方向（= 橋台・橋脚が線形に直角） |
| **skew = 90°** | Pier line = tangent 方向（= 橋台・橋脚が線形に並行） |
| **正の方向** | normal から tangent への回転（反時計回り） |
| **単位** | **radian**（LINER 既存に統一） |
| **保存形式** | radian（UI 表示時のみ degree 変換可） |
| **prototype 互換** | prototype の skewAngle（degree, CCW +Z）は `degree → rad` 変換で一致 |

**既存コードでの確認：**
- LINER `pierLineGeometry.ts:skewAngleRad` : radian, normal→tangent
- LINER `PierResult.skewAngleRad` : radian
- prototype `Support.skewAngle` : degree, +Z axis CCW
- Phase C1 では **radian 統一**、prototype からの移行時に変換

### 4.4 曲線区間での橋脚・橋台の向き

```
曲線区間では、各測点での接線方向が変化する。
そのため橋脚・橋台は各 station の localFrame に従って個別に配置される。

ルール：
  - 各 support は自身の station における localFrame を基準とする
  - 曲線 R が小さい場合、前後の support で tangent 方向が異なる（当然）
  - skew 角は localFrame に対する相対角
  - 曲線区間でも橋脚・橋台の配置計算は station ごとに独立
```

### 4.5 skew 変更時の再配置

```
skewAngle 変更
  → transverse 方向を再計算（tangent は不変）
  → 3D Geometry Generator が再実行
     （柱・梁・フーチングの Y 軸方向が変化、X/Y/Z中心位置は不変）
  → 2D Plan Projection が再実行
     （投影矩形の回転角が変化）
  → LINER 平面図 Overlay が再描画
  → Apollo 上部工は不変（支承位置のみ影響）
```

---

## 5. Z 座標の Source of Truth

### 5.1 Z 値の種類と正本

| Z 値 | 正本 | 算出方法 | 備考 |
|------|------|---------|------|
| **support 基準点 Z** | LINER縦断 if available, else ユーザー指定 | `pointAtStationOffset(station, offset).z` | 線形中心線上の地盤面 or 計画高 |
| **支承天端 Z** | 下部工 Model（ユーザー指定） | seatElevation（橋台）or cap上面+seat高 | 上部工 girderBottom と整合 |
| **橋脚天端 Z** | 下部工 Model（自動計算） | column.height + cap.height | 基準点 Z + 柱高 + 梁高 |
| **橋台天端 Z** | 下部工 Model（ユーザー指定） | `backwall.seatElevation` | 橋台特有のパラメータ |
| **フーチング天端 Z** | 下部工 Model（ユーザー指定） | `footing.topElevation` | 独立指定（support Z とは別） |
| **杭頭 Z** | 下部工 Model（自動計算） | `footing.topElevation - footing.thickness` | フーチング下面 = 杭頭 |
| **杭先端 Z** | 下部工 Model（自動計算） | 杭頭 Z - `piles.length` | |

### 5.2 「配置位置Z」と「部材標高」の分離

```
配置位置Z（Placement Z）:
  → 下部工全体の設置高さ基準
  → pointAtStationOffset の z をデフォルト値とする
  → ユーザーが手動オーバーライド可能
  → 変更時は全 Z 座標が連動してシフト

部材標高（Component Elevation）:
  → 各要素の相対的な高さ（placement Z を基準）
  → 柱高、梁高、フーチング厚など寸法から決定
  → placement Z 変更時に自動再計算
```

### 5.3 Z 取得不能時のフォールバック

| 状況 | フォールバック値 | 表示 |
|------|-----------------|------|
| LINER 縦断未定義 | `z = 0`（デフォルト） | warning「縦断未設定のため Z=0 を使用」 |
| `pointAtStationOffset` エラー | 前回キャッシュ値 or 0 | warning「座標計算エラー」 |
| station 範囲外 | clamp して評価 | warning「station 範囲外」 |
| EXCEPTION 方式 | ユーザー指定値 | なし |

---

## 6. Apollo 上部工との位置整合

### 6.1 supportId 対応ルール

| 項目 | ルール |
|------|--------|
| **Apollo BSDD** | `BsddSupport.supportId` は UuidString（UUID形式） |
| **LINER** | `PierDraft.id` は "P1", "A1" 等の文字列 |
| **下部工** | `Support.supportId` は "P1", "A1" 等 |
| **対応方式** | 下部工の `supportId` をキーとして BSDD と紐付け |
| **UUID 変換** | `stableUuidFromSeed("substructure:" + supportId)` で安定UUID生成 |

### 6.2 支点位置の正本

```
支点位置の正本は LINER（線形からの算出値）とする。

Apollo 上部工は LINER → SupportPlacementEngine で算出された位置を
参照する形とし、Apollo 側で独立した XYZ を持たない。

フロー：
  LINER 線形 → SupportPlacementEngine → SupportPlacement[]
    → ↓ 下部工 3D 位置
    → ↓ Apollo 上部工の reference 位置（support-interface 経由）
```

### 6.3 support 移動時の同期

```
下部工側で station/offset を変更
  → SupportPlacementEngine が再実行
  → 下部工 3D 位置が更新
  → support-interface.json を通じて Apollo に通知
  → Apollo 側で一致確認（Apollo 側は位置の正本を持たない）
```

### 6.4 上部工未作成時の振る舞い

- 下部工は上部工がなくても単独で配置・3D生成・2D投影可能
- support-interface は optional（上部工がある場合のみ生成）
- 上部工追加後は supportId の一致確認を自動実行

---

## 7. LINER 平面図との同期

### 7.1 変更→再生成マトリクス

| 変更 | LINER平面図 | 下部工2D投影 | 下部工3D | Apollo上部工3D |
|------|------------|-------------|---------|---------------|
| **station 変更** | 影響なし（線形不変） | **再生成** | **再配置** | （要確認） |
| **offset 変更** | 影響なし | **再生成** | **再配置** | 影響なし |
| **skew 変更** | 影響なし | **再生成**（回転角変化） | **再生成** | 影響なし |
| **supportId 変更** | 影響なし | ラベル更新 | userData更新 | 要同期 |
| **寸法変更** | 影響なし | **再生成** | **再生成** | 影響なし |
| **LINER線形変更** | 自動更新 | **SupportPlacementEngine再実行→全再生成** | | |
| **alignment 変更** | 自動更新 | 同上 | | |

### 7.2 再生成順序ルール

```
変更発生
  → Substructure Model 更新（JSON 保存）
  → SupportPlacementEngine 再実行（XYZT/tangent 再計算）
    → SupportPlacement[] 更新
      → 3D Geometry Generator 再実行
        → SceneBuilder で SceneGroup 置換
      → 2D Plan Projection 再実行
        → DrawingPrimitive[] 生成
        → DrawingDocument Overlay Layer 更新
          → SVG 再レンダリング
```

---

## 8. XYZ 直接指定ポリシー

| 項目 | ポリシー |
|------|---------|
| **alignmentId なしで配置可能か** | **可**（EXCEPTION 方式） |
| **station なしで配置可能か** | **可**（EXCEPTION 方式） |
| **tangent/transverse をどう決めるか** | 方位角（azimuth）をユーザー指定 or デフォルト0 |
| **skew の扱い** | ユーザー手入力（degree 単位） |
| **後から LINER 線形へ関連付け可能か** | **可**（offset+station を逆算して紐付け） |
| **LINER 平面図へ表示可能か** | **可**（XYZ から直接投影。線形なしでも配置表示） |
| **識別方法** | `placement.source = "direct_xyz"` フラグで区別 |

**データモデル上の扱い：**
```typescript
interface SupportPlacementSnapshot {
  source: "liner" | "direct_xyz";
  // liner 方式:
  alignmentId?: string;
  station?: number;
  offset?: number;
  // direct_xyz 方式:
  position?: Vec3;       // [X, Y, Z]
  azimuth?: number;      // 接線方向（degree or rad）
  // 共通:
  skewAngle: number;     // radian
  longitudinalAxis?: Vec3;
  transverseAxis?: Vec3;
}
```

---

## 9. supportId / Stable ID

### 9.1 命名ルール

| 要素 | 命名パターン | 例 |
|------|-------------|-----|
| **support** | `{type}{index}` | P1, P2, A1, A2 |
| **column** | `{supportId}-COLUMN-{nn}` | P1-COLUMN-01 |
| **cap/beam** | `{supportId}-CAP` | P1-CAP |
| **footing** | `{supportId}-FOOTING` | P1-FOOTING |
| **pile** | `{supportId}-PILE-{nn}` | P1-PILE-01 |
| **pile group** | `{supportId}-PILEGROUP` | P1-PILEGROUP |
| **bearing seat** | `{supportId}-SEAT-{nn}` | P1-SEAT-01 |
| **bearing** | `{supportId}-BEARING-{nn}` | P1-BEARING-01 |
| **backwall** | `{supportId}-BACKWALL` | A1-BACKWALL |
| **wing wall** | `{supportId}-WING-{L/R}` | A1-WING-L |

### 9.2 各レイヤでの ID 表現

| レイヤ | 表現方法 | 例 |
|--------|---------|-----|
| **JSON (project.json)** | `supportId: string` | "P1" |
| **3D Object** | `Object3D.name: string` | "P1-COLUMN-01" |
| **3D userData** | `Object3D.userData.stableId: string` | "substructure:column:uuid-xxx" |
| **2D DrawingPrimitive** | `primitive.id: string` | "P1-FOOTING"（substructure- prefix） |
| **StableEntityId** | `{ namespace, id, entityKind }` | `{ ns: "substructure", kind: "column", id: uuid }` |
| **Apollo BSDD** | `BsddSupport.supportId: UuidString` | uuid |
| **LINER PierDraft** | `PierDraft.id: string` | "P1" |
| **support-interface** | `supportId: string` | "P1" |

### 9.3 ID 重複時の挙動

| 状況 | 挙動 |
|------|------|
| 同一 supportId の2重定義 | **エラー**（fail-closed）。保存・読込時に validation で検出。 |
| supportId 変更 | 3D/2D の name を更新。StableEntityId は不変（alias 追加）。 |
| supportId 削除 | StableEntityId は archive 扱い。再利用不可だが履歴に残す。 |

---

## 10. 例外・エラー処理

### 10.1 エラー種別と対応

| 状況 | 分類 | 対応 |
|------|------|------|
| alignment 未設定 | **FATAL** | EXCEPTION 方式のみ許可。PRIMARY方式はエラー。 |
| alignmentId 不明 | **FATAL** | エラー表示＋再選択促す |
| station 範囲外 | **WARNING** | clamp して継続可能。warning 表示。 |
| offset 異常値（NaN/Inf） | **FATAL** | エラー表示 |
| Z 取得不能 | **WARNING** | デフォルト0で継続。warning 表示。 |
| tangent 取得不能 | **FATAL** | pointAtStationOffset エラー時 |
| skew 不正（NaN/Inf） | **FATAL** | skew=0 で継続も可？ → fail-closed（エラー） |
| supportId 重複 | **FATAL** | バリデーション検出。保存不可。 |
| bearingId 不整合 | **WARNING** | 自動補正。warning 表示。 |
| Apollo support なし | **INFO** | 上部工なしでも下部工単独動作可 |
| LINER データなし | **INFO** | EXCEPTION 方式への自動切り替え |
| XYZ 直接指定との競合 | **FATAL** | 両方指定不可。いずれかを選択。 |
| 座標系不一致 | **FATAL** | unit/coordinate system const 違反 |

### 10.2 Fail-closed と Warning の境界

```
FATAL（fail-closed: 保存・生成不可）:
  - alignment 未設定で PRIMARY 方式選択時
  - station 範囲外かつ clamp 拒否時
  - supportId 重複
  - 不正な数値（NaN, Inf）
  - 座標系/単位系 const 違反

WARNING（継続可能）:
  - station 範囲外（clamp 許容時）
  - Z をデフォルト値で代用時
  - bearingId 自動補正時

INFO（通知のみ）:
  - Apollo support なし
  - EXCEPTION 方式使用中
```

---

## 11. UI 要件への引き渡し

### 11.1 配置UIに必要な要素

```
配置方式選択:
  [○] 線形・測点指定（PRIMARY）
  [ ] 平面図から選択（SECONDARY）
  [ ] XYZ直接指定（EXCEPTION）

--- PRIMARY 方式 ---
線形（Alignment）: [MAIN ▼]     ← LINER 線形選択
測点（Station）:   [123.450 m]   ← 数値入力
Offset:            [0.000 m]     ← 数値入力（通常0）
斜角（Skew）:      [90.000°]     ← 数値入力（degree表示）
標高（Z）:         [自動 ▼] 10.500 m  ← 自動 / 手動 切替

--- EXCEPTION 方式 ---
X: [0.000 m]       Y: [0.000 m]       Z: [0.000 m]
方位角（Azimuth）:  [0.000°]
斜角（Skew）:       [90.000°]

--- 共通 表示部 ---
X: 123.456 m       （読取専用）
Y: 0.000 m         （読取専用）
接線方向: 45.000°   （読取専用）
橋軸直角方向: 315.000°（読取専用）
```

### 11.2 UI 状態管理要件

- 「自動/手動」Z 切替 → Z 入力フィールドの活性/非活性
- 「線形から取得」ボタン → LINER データから station → XYZ を自動反映
- 平面図選択モード切替 → カーソル変更 + クリック位置の station/offset 逆算
- 再配置プレビュー → station/offset 変更時に 3D/2D の即時プレビュー更新
- degree ↔ radian 変換 → UI 表示は degree、保存は radian

---

## 12. 検証ケース

### 12.1 Golden Case 定義

| Case | 橋種 | station | offset | skew | LINER | 備考 |
|------|------|---------|--------|------|-------|------|
| PC-01 | 直橋 | 45.0, 75.0, 105.0 | 0 | 0° | あり | 基本ケース |
| PC-02 | 直橋+斜角 | 45.0, 75.0, 105.0 | 0 | 30°(P1), 15°(P2) | あり | 斜角ケース |
| PC-03 | 曲線橋 | 曲線station | 0 | 0° | あり | 曲線+自動 tangent |
| PC-04 | 曲線橋+斜角 | 曲線station | 0 | 15° | あり | 曲線+斜角複合 |
| PC-05 | 直橋+offset | 45.0, 75.0, 105.0 | 2.5(P1), -1.5(P2) | 0° | あり | offset あり |
| PC-06 | XYZ直接指定 | N/A | N/A | 30° | なし | 例外方式 |

### 12.2 各Caseの確認項目

| # | 確認項目 | 全Case | 特記事項 |
|---|----------|--------|---------|
| 1 | station 値が一致 | 1-5 | PC-06はN/A |
| 2 | offset 値が一致 | 1-5 | PC-05で特に確認 |
| 3 | X が LINER 計算値と一致 | 1-5 | tolerance 1mm |
| 4 | Y が LINER 計算値と一致 | 1-5 | tolerance 1mm |
| 5 | Z が LINER 縦断 or 指定値と一致 | 1-6 | |
| 6 | tangent 方向が station の azimuth と一致 | 1-5 | PC-03/04 で曲線確認 |
| 7 | transverse が skew 適用後の方向と一致 | 1-6 | PC-02/04/06 |
| 8 | skew 値が指定値と一致（degree→rad） | 2,4,5,6 | |
| 9 | supportId 命名ルールに従っている | 1-6 | |
| 10 | 3D 配置位置が計算値と一致 | 1-6 | Three.js 座標確認 |
| 11 | LINER 平面図位置が計算値と一致 | 1-5 | PC-06 は Overlay 不可 |
| 12 | 2D/3D parity（XY投影一致） | 1-6 | |
| 13 | round-trip（保存→読込→再計算一致） | 1-6 | PC-06も可 |

---

## 13. Freeze 判定

### 13.1 Freeze 内容

| 項目 | 判定 |
|------|------|
| PRIMARY 配置方式 | **FROZEN**: LINER 線形+測点+Offset |
| SECONDARY 補助方式 | **FROZEN**: LINER 平面図選択（UI詳細はP03） |
| EXCEPTION 例外方式 | **FROZEN**: XYZ 直接指定（制限付き） |
| Source of Truth | **FROZEN**: LINER が座標計算正本、Substructure Model が保存正本 |
| 読取専用ルール | **FROZEN**: X/Y/tangent/transverse は読取専用 |
| Z 座標ルール | **FROZEN**: LINER 縦断優先、手動オーバーライド可 |
| skew 角定義 | **FROZEN**: LINER 定義（radian, normal→tangent）に統一 |
| 座標変換ルール | **FROZEN**: localFrame → worldMatrix の計算式確定 |
| supportId 命名 | **FROZEN**: {type}{index} + 構成要素 suffix |
| 変更時同期ルール | **FROZEN**: Station/offset/skew 変更→全再生成 |
| エラー処理方針 | **FROZEN**: FATAL/WARNING/INFO 分類確定 |

### 13.2 最終報告

```
BASE_MAIN_SHA: d36da3e53de36afdc5513d06d893f00d80b6913e
WORKTREE_PATH: /tmp/spacer-clone-phase-c1
FEATURE_BRANCH: feature/phase-c1-3d-liner-integration
WORKTREE_STATUS: clean

PRIMARY_PLACEMENT_MODE: LINER alignment + station + offset
SECONDARY_PLACEMENT_MODES: LINER plan click-to-place
DIRECT_XYZ_POLICY: EXCEPTION only, with source flag

POSITION_SOURCE_OF_TRUTH: LINER coordinate3d.ts（pointAtStationOffset）
ALIGNMENT_SOURCE_OF_TRUTH: LINER Draft（BuildIntermediateInput）
STATION_SOURCE_OF_TRUTH: Substructure Model placement（ユーザー指定 or LINER PierDraft）
OFFSET_RULE: 正=右側（normal方向）、0=中心線
Z_SOURCE_OF_TRUTH: LINER縦断 first、手動 override allowed

TANGENT_RULE: LINER localFrame.tangent（読取専用）
TRANSVERSE_RULE: skew 適用後の localFrame （読取専用）
SKEW_RULE: radian、normal→tangent方向、LINER pierLineGeometry定義に準拠
LOCAL_WORLD_TRANSFORM_RULE: translate(position) × rotateZ(skew) の Matrix4

SUPPORT_ID_RULE: {type}{index} e.g. P1, A1（構成要素はハイフン区切り suffix）
BEARING_ID_RULE: {supportId}-BEARING-{nn}

LINER_SYNC_RULE: 線形変更→SupportPlacementEngine 再実行→全再生成
APOLLO_SYNC_RULE: supportId で紐付け、位置は LINER 正本を参照
3D_SYNC_RULE: SupportPlacement 変更→SceneGroup 置換
PLAN_OVERLAY_SYNC_RULE: DrawingDocument Layer 置換→SVG 再レンダリング

ALIGNMENT_CHANGE_POLICY: 全 support の station 維持、XYZ 再計算
STATION_CHANGE_POLICY: 当該 support のみ XYZ/tangent 再計算
OFFSET_CHANGE_POLICY: 当該 support のみ X/Y/Z 再計算
SKEW_CHANGE_POLICY: 当該 support のみ transverse/2D回転 再計算

ERROR_POLICY: FATAL=fail-closed, WARNING=継続可能, INFO=通知のみ
FALLBACK_POLICY: Z=0 when no vertical, clamp station, direct_xyz when no alignment

MODEL_EXTENSION_REQUIRED: YES（placement.source 区分）
SCHEMA_EXTENSION_REQUIRED: YES（project.json substructure.placement 拡張）
CONNECTOR_EXTENSION_REQUIRED: YES（SupportPlacementEngine 新規）
UI_REQUIREMENTS_READY: YES（P03 UI設計への引継ぎ完了）
VERIFICATION_CASES_READY: YES（6 Golden Cases, 13 確認項目）

SOURCE_CODE_CHANGED: NO
SCHEMA_CHANGED: NO
UI_CHANGED: NO
TEST_CODE_CHANGED: NO

UNRESOLVED_BLOCKERS: NONE
PHASE_C1_P02_VERDICT: FROZEN
```