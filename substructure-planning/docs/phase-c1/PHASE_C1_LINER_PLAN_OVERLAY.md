# Phase C1 LINER 平面図 Overlay 設計

## 1. 下部工 2D 平面投影方式

### 1.1 投影ルール

各下部工要素の 3D 形状を XY 平面（z=0 平面）に投影する。
投影方向は鉛直上方（+Z 方向）からの平行投影とする。

| 要素 | 投影内容 | 図形種別 | 備考 |
|------|----------|----------|------|
| フーチング | 上面矩形を投影 | 矩形（回転あり） | skew 角を反映 |
| キャップ | 上面矩形を投影 | 矩形（回転あり） | 柱位置を内包 |
| 柱 | 断面矩形を投影 | 矩形（回転あり） | ハッチング推奨 |
| 杭 | 中心位置のみ | 十字マーカー or 小円 | 杭径は縮尺上無視可 |
| 支承 | 上面矩形を投影 | 小矩形（回転あり） | 支承座より小 |
| 支承座 | 上面矩形を投影 | 小矩形（回転あり） | 支承を内包 |
| 橋台壁面 | 壁正面線を投影 | 直線+矩形 | 翼壁含む |
| 翼壁 | 上面投影 | 矩形 | 橋台左右 |

### 1.2 投影計算

```
3D 形状の各コーナー点 P = (Px, Py, Pz) を
P' = (Px, Py) として XY 平面に投影。

skew 角がある場合：
  1. 中心を原点とする局部座標系でコーナー点を計算
  2. skew 角で回転
  3. 世界座標に変換
  4. Z を無視して 2D 座標を得る

例：フーチング（長さ L, 幅 W, 中心位置 C, skew α）
  無 skew 時のコーナー：
    (-L/2, -W/2), (L/2, -W/2), (L/2, W/2), (-L/2, W/2)
  skew 適用後：
    各コーナーを α 回転し、C で平行移動
```

### 1.3 2D DrawingPrimitive 生成

投影結果は LINER Drawing モデルの `DrawingPrimitive` として生成する。

```typescript
// 生成する DrawingPrimitive の種類
type SubstructurePlanPrimitive =
  | { kind: "rectangle"; center: Point2; width: number; height: number; rotation: number; style: SubstructureStyle }
  | { kind: "polyline"; points: Point2[]; closed: boolean; style: SubstructureStyle }
  | { kind: "circle"; center: Point2; radius: number; style: SubstructureStyle }
  | { kind: "cross"; center: Point2; size: number; style: SubstructureStyle }
  | { kind: "label"; position: Point2; text: string; style: SubstructureStyle };

interface SubstructureStyle {
  strokeColor: string;
  fillColor?: string;
  strokeWidth: number;
  fillOpacity?: number;
  hatchPattern?: "solid" | "diagonal" | "none";
}
```

## 2. LINER 平面図 Overlay 方式

### 2.1 設計方針

**既存 LINER DrawingDocument を変更せず、独立レイヤとして追加する。**

既存の DrawingDocument は以下のように構成される：

```
DrawingDocument
  └── sheets[0]
       └── viewports[0]
            ├── layers[0]: geometry（線形中心線）
            ├── layers[1]: annotation（測点ラベル）
            ├── layers[2]: band（測点帯）
            ├── layers[3]: coordinate（座標表）
            └── layers[4]: bridge（橋梁レイアウト）
```

これに対し、Phase C1 では以下を追加する：

```
            └── layers[5]: substructure（下部工 Overlay） ← 新規
```

### 2.2 Overlay Layer の追加方法

#### 方法 A：DrawingBuilder 拡張（推奨）

既存の `FormalPlanBuilder` または `PlanCenterlineOnlyBuilder` 実行後、
追加の builder 関数で substructure Overlay レイヤを生成し、既存 DrawingDocument に追加する。

```typescript
// 新規関数（builder 内、または builder 呼び出し後）
function addSubstructureOverlayLayer(
  document: DrawingDocument,
  substructureData: SubstructureModel,
  supportPlacements: SupportPlacement[],
  settings: OverlaySettings
): DrawingDocument {
  // 1. 既存 document を clone（非破壊）
  // 2. 下部工 2D 投影図形を生成
  // 3. DrawingLayer として追加
  // 4. 元の sheet に layer を追加して返す
}

// DrawingLayer の生成
function buildSubstructureOverlayLayer(
  substructureData: SubstructureModel,
  supportPlacements: SupportPlacement[]
): DrawingLayer {
  return {
    id: "substructure-overlay",
    name: "下部工平面図",
    visible: true,
    primitives: generateSubstructurePrimitives(substructureData, supportPlacements),
    style: {
      layerColor: "#888888",
      lineWeight: 0.18,
    }
  };
}
```

#### 方法 B：別途 Overlay Function（代替案）

後処理として、DrawingDocument の SVG レンダリング後に SVG 要素として追加する。
→ 方法 A が確実なため、方法 B は非推奨。

### 2.3 Overlay の表示制御

- LINER Setup タブまたは Drawing Workspace 内に「下部工表示」トグルを追加
- DrawingLayer.visible を切り替えることで表示/非表示を制御
- 既存の DrawingLayer 表示制御 UI を流用

### 2.4 スケーリングと座標変換

下部工の平面投影座標は、既存 DrawingDocument と同じ `StationAxis` を使用して図面座標に変換する。

```typescript
// physicalDistance → 図面 X 座標への変換
function toPlanX(physicalDistance: number, stationAxis: StationAxis): number {
  return stationAxis.physicalDistanceToStationAxisX(physicalDistance);
}

// transverse offset → 図面 Y 座標への変換
function toPlanY(transverseOffset: number, scale: number): number {
  return transverseOffset * scale;
}
```

## 3. 橋脚・橋台・フーチング・杭の描画仕様

### 3.1 橋脚（Pier）

| 要素 | 描画内容 | 色 |
|------|----------|-----|
| キャップ | 上面矩形（overhang 含む） | #7aa07a（緑）線 |
| 柱 | 断面矩形（ハッチング） | #8a8ac8（青紫）線 |
| 支承座 | 台上小矩形 × n | #d0b080（褐色）塗り |
| 支承 | 支承座上小矩形 | #7a9ad0（青）塗り |

### 3.2 橋台（Abutment）

| 要素 | 描画内容 | 色 |
|------|----------|-----|
| 壁面 | 前面線 | #9aab9a（灰緑）線 |
| 左翼壁 | 上面矩形 | #8aa88a（緑）線 |
| 右翼壁 | 上面矩形 | #8aa88a（緑）線 |
| 支承座 | 壁上小矩形 | #d0b080（褐色）塗り |

### 3.3 フーチング（Footing）

| 要素 | 描画内容 | 色 |
|------|----------|-----|
| フーチング外形 | 上面矩形 | #b09050（金色）線 |
| ハッチング | 斜線クロス | #b0905040（半透明） |

### 3.4 杭（Pile）

| 要素 | 描画内容 | 色 |
|------|----------|-----|
| 各杭位置 | 十字マーカー | #a08040（銅色） |
| 四隅連結 | 点線矩形（任意） | #a0804040（半透明） |

### 3.5 全体 Overlay

| 要素 | 描画内容 |
|------|----------|
| 支点名ラベル | 各下部工中心位置に "P1", "A1" 等 |
| 凡例 | 図面端に下部工凡例（将来） |

## 4. 既存 LINER 描画との干渉防止

| 対策 | 詳細 |
|------|------|
| 独立レイヤ | 既存 layer を一切変更せず、新しい layer として追加 |
| ID 衝突防止 | `substructure-` prefix を全 DrawingPrimitive ID に付与 |
| 重なり順制御 | Layer の sortIndex を最上位に設定（必要に応じて調整） |
| 表示制御 | Layer.visible トグルで既存描画に影響なく非表示可能 |
| SVG レンダリング | DrawingDocumentSvg が layer 配列を順次描画する仕様をそのまま利用 |

## 5. SVG 出力対応

既存 `DrawingDocumentSvg.tsx` は `DrawingLayer[]` を順次 SVG 要素に変換する。
新しい `substructure-overlay` レイヤが追加されると、自動的に SVG にも反映される。

```
DrawingDocumentSvg
  → sheets.map(sheet)
    → sheet.viewports.map(viewport)
      → viewport.layers.map(layer)
        → layer.primitives.map(primitive → SVG element)
```

このため、SVG レンダラーの変更は不要。

## 6. DXF 出力への影響

既存 DXF マッパー（`mapDrawingDocumentToDxf.ts`）は `DrawingLayer[]` を DXF に変換する。
新しい layer が追加されるため、自動的に DXF にも下部工が出力される。

注意点：
- DXF レイヤ名は `SUBSTRUCTURE_OVERLAY` のような固定名にする
- CAD 側でレイヤ表示制御が可能