# GEOMETRY_ENGINE_BOUNDARY — Geometry Engine境界

## 入力（Geometry Engineが受け取る）
- 線形要素（直線S/円R/クロソイドA）
- 測点定義
- 縦断勾配・横断勾配
- 断面構成（車線・路肩・中央帯）
- ピア・スパン定義

## 出力（Geometry Engineが生成する）
- 座標（X/Y/Z）
- 測点値
- 格点間距離
- 張り出し長
- 断面高さ

## 非責務（Geometry Engineが行わない）
- 基準値の照査
- 設計ルールの評価
- 図面生成
- 警告出力
