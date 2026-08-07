# Phase C1 スコープ定義書

## 1. 目的

Phase C1 は、上部工（Apollo）3D モデルと下部工 3D モデルを同一座標系に統合し、さらに下部工の 2D 平面投影を LINER 平面図へ Overlay 表示するための設計・実装フェーズである。

本フェーズでは「道路示方書に基づく正式な下部工設計」は行わず、形状生成と配置・表示の統合に焦点を当てる。

## 2. スコープ（実装対象）

### 2.1 下部工 3D 形状生成（substructure-planning の frontend 統合）

| 要素 | 内容 |
|------|------|
| 橋脚（単柱式RC） | 柱 + 張出梁（キャップ）の BoxGeometry 生成 |
| 橋台（逆T式） | 壁 + 左右翼壁の BoxGeometry 生成 |
| フーチング（直接基礎・杭基礎） | 矩形フーチング BoxGeometry 生成 |
| 杭（場所打ち杭） | 円柱 CylinderGeometry グリッド配置 |
| 支承・支承座 | 台上の矩形 BoxGeometry 生成 |
| 上部工簡易外形 | 全支点を覆う envelope BoxGeometry（Overlay用） |

### 2.2 上部工＋下部工 3D 統合表示

- Apollo 上部工 3D と下部工 3D を同一 Three.js Scene に配置
- 線形座標に基づく支点位置での下部工配置
- 直橋・斜橋・単純曲線橋での配置一致
- 既存 Viewer3D / ThreeViewport を拡張して統合表示
- SceneGroups への下部工グループ追加

### 2.3 LINER 平面図への下部工 Overlay

- 下部工の 2D 平面投影図形（橋脚・橋台・フーチング・杭・支承）を生成
- 既存 LINER DrawingDocument の独立レイヤとして Overlay
- 直橋・斜橋・曲線橋での投影一致

### 2.4 座標系・配置方式

- LINER 線形（alignment）を正本とする支点座標決定
- station / offset / skew angle による座標計算
- 局部座標系（tangent / transverse）から世界座標への変換
- 上部工・下部工で統一座標系（x-longitudinal / y-transverse / z-up）

### 2.5 Stable ID 共有

- 3D / 2D / JSON 間で同一部材を追跡可能な Stable ID 体系
- 既存 StableEntityId 契約（namespace / UUID / entityKind）との整合
- substructure 用 namespace の追加定義

### 2.6 保存・読込・GLB 出力

- 下部工データの JSON 保存（project.json 内 substructure 拡張）
- 既存 GLB 出力との整合性維持
- substructure-planning 側 prototype の GLB 出力互換保持

### 2.7 テスト自動化

- 3D 形状生成の Unit Test（Vitest）
- 2D 平面投影の一致確認
- LINER 回帰試験の通過維持
- 直橋・斜橋・曲線橋の Golden Case 整備

## 3. 非スコープ（Phase C1 では実装しない）

- 道路橋示方書による正式下部工設計
- 耐震照査（震度法・修正震度法・動的解析）
- 杭支持力照査（鉛直・水平）
- 地盤ばね設定
- RC 曲げ・せん断照査
- 配筋設計
- 詳細数量計算（鉄筋量・型枠面積等）
- 詳細設計計算書
- 橋脚・橋台の正式詳細図（CAD 図面）
- IFC 等の高度 BIM 連携
- 多柱式橋脚・門型ラーメン橋脚
- 鋼管杭・PHC 杭等の杭種対応
- 直接基礎（杭なし）の詳細設計
- 曲線橋の超高等機能（立体曲線・変化断面）
- 道路標示・注釈・寸法線の正式図面化
- 下部工単独で完結する設計 UI（substructure-planning 現行 prototype を代替するものではない）

## 4. 完了条件

Phase C1 の完了は以下の 10 条件をすべて満たすこととする。

| # | 条件 | 確認方法 |
|---|------|----------|
| 1 | LINER 線形座標から全支点位置が計算できる | 自動テスト＋手動確認（直橋/斜橋/曲線橋） |
| 2 | Apollo 上部工と下部工が同一 Three.js Scene に配置される | Viewer3D で表示確認 |
| 3 | 橋脚・橋台・フーチング・杭・支承が 3D 生成される | Scene で選択可能＋Stable ID 表示 |
| 4 | 上部工＋下部工全体が橋梁 3D として表示される | Viewer3D スクリーンショット確認 |
| 5 | 下部工データから 2D 平面形状が生成される | DrawingDocument 内で確認 |
| 6 | LINER 平面図に下部工が Overlay 表示される | SVG 出力または DrawingDocument で確認 |
| 7 | 直橋・斜橋（30°）・単純曲線橋（R=300）で 3D/2D が一致する | Golden Case テスト通過 |
| 8 | JSON 保存・読込・既存 GLB 出力が維持される | 回帰テスト通過 |
| 9 | 既存 LINER・Apollo・Spacer の全テストが通過する | `npm run test:all` 通過 |
| 10 | PR レビュー完了後 main へマージされる | GitHub PR マージ完了 |