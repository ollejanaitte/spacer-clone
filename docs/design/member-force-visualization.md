# 断面力可視化設計書

## 概要

3D Viewer上で部材断面力を視覚的に確認できる機能群を提供する。

## 表示仕様

### Phase-1: カラーマップ表示

部材ごとに断面力の大小を色分けして表示する。

対象成分:
- N（軸力）
- Vy（せん断力Y方向）
- Vz（せん断力Z方向）
- My（曲げモーメントY軸回り）
- Mz（曲げモーメントZ軸回り）
- Mt（ねじりモーメント）

表示対象:
- 最大値（max）: i端・j端のうち大きい方
- 最小値（min）: i端・j端のうち小さい方
- 絶対最大値（absMax）: i端・j端の絶対値のうち大きい方

### Phase-2: 数値表示

部材選択時に、ResultsPanelに部材断面力詳細パネルを表示する。

表示内容:
- 部材ID
- 表示名
- i端節点ID
- j端節点ID
- 各成分（N, Vy, Vz, Mt, My, Mz）のi端値・j端値・単位

### Phase-3: モーメント分布図

My, Mzのモーメント図に半透明のリボン（ポリゴン塗りつぶし）を追加し、分布の大小を視覚的に強調する。

## カラースケール仕様

5段階のグラデーション:
- 起点(t=0): 青 (#1a56db) - 小
- t=0.25: 緑 (#22c55e)
- 中間(t=0.5): 黄 (#ebc72e) - 中
- t=0.75: オレンジ (#f57a1a)
- 終点(t=1): 赤 (#dc2626) - 大

凡例はViewerControlsパネル内に表示する。

## 座標系仕様

- 断面力データは解析結果の部材ローカル座標系のまま使用する
- SPACER座標系表示ON/OFFに関わらず、断面力の成分名・符号は変更しない
- 表示（位置・色）のみ座標変換を適用する

## 拡張方針

- 新成分の追加: `FORCE_COLOR_COMPONENTS`配列と`componentToSectionForce`マップに追加
- カラー スケールの変更: `COLOR_STOPS`配列を修正
- カラーマップの無効化: `forceColorMap`フラグをfalseに設定
- 分布図スタイルの拡張: `renderMemberForce`関数内のリボン描画ロジックを変更

## ファイル構成

| ファイル | 役割 |
|---------|------|
| `memberForceColorMap.ts` | カラーマップ計算ロジック |
| `memberForceDetail.ts` | 部材断面力詳細データ構築 |
| `renderers/MemberRenderer.ts` | 部材レンダリング（カラーマップ適用） |
| `renderers/ResultDiagramRenderer.ts` | 結果図レンダリング（リボン描画） |
| `SceneBuilder.ts` | シーン構築（カラーマップモード伝播） |
| `ThreeViewport.tsx` | 3Dビューポート（モード状態管理） |
| `Viewer3D.tsx` | ビューアシェル（UI状態管理） |
| `ViewerControls.tsx` | 表示切替UI（カラーマップコントロール） |
| `types.ts` | 型定義（ViewerVisibility拡張） |
