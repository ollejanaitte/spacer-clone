# STEP-1 P01 — Vertical Geometry Test Vectors（設計）

Step2 実装時の unit テストに使う手計算オラクル。solver 実装から独立。

## TV-V-01: 単一 grade 区間
- 区間: [0.0, 100.0], startElevation=10.0, grade=+0.02
- station=50.0 → elevation = 10.0 + 0.02*50 = **11.0**
- station=100.0 → elevation = **12.0**
- grade = 0.02（全点）

## TV-V-02: grade 区間（負勾配）
- 区間: [0.0, 80.0], startElevation=25.0, grade=-0.03
- station=40.0 → 25.0 - 0.03*40 = **23.8**
- 範囲外 station=81.0 → RangeError

## TV-V-03: parabolic 上に凸（crest）
- 区間: [0.0, 200.0], startGrade=+0.03, endGrade=-0.03, startElevation=5.0
- Δg/L = (-0.03-0.03)/200 = -0.0003
- y(x) = 5.0 + 0.03x - 0.00015x²
- station=100.0 → 5.0 + 3.0 - 1.5 = **6.5**（頂点）
- station=0 → 5.0, station=200 → 5.0+6.0-6.0=**5.0**
- grade(100)= 0.0, curvature = -0.0003 (1/m)

## TV-V-04: parabolic 下に凸（sag）
- 区間: [0.0, 100.0], startGrade=-0.02, endGrade=+0.02, startElevation=8.0
- Δg/L = 0.04/100 = 0.0004
- y(50) = 8.0 -1.0 + 0.5*0.0004*2500 = 8.0 -1.0 +0.5 = **7.5**
- curvature = +0.0004 (1/m)

## TV-V-05: 区間境界連続性（G0）
- grade区間[0,100]→parabolic[100,200] の境界 station=100 で両者の elevation が一致
  （parabolic の startElevation を grade区間の endElevation に揃えて構築）

## TV-V-06: 重複・欠落 validation
- 要素区間が被覆しない / 重複する → validation error
- length ≤ 0 → error
- grade 非有限 → error

## TV-V-07: RoadGeometryAPI 統合
- HCL 直線（azimuth 0, length 164.2476）+ 縦断 grade 区間 [0,164.2476] start=17.6595, grade=0.0
- station=0 → Z=17.6595, station=32.1547 → Z=17.6595（flat）
- ※ PDF横断面の設計標高と同一値になることを replay（P06）で確認

## TV-V-08: 金沢IC Aランプ橋 縦断（後日実測値で確定）
- i=6.000% 区間 → VCL=100 → i=0.100% 区間
- 詳細数値は Step2 で現地資料/サンプル計算書と照合して fixture 化
- 本項目は現時点 UNKNOWN（根拠不足は勝手に確定しない）
