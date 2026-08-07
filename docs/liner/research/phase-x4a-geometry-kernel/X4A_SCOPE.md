# X4-A Scope

## 目的
既存LINER Geometry実装を監査・Canonical化し、Rule Engineが安全に利用できるGeometry Kernelを確立する。

## 対象
- frontend/src/liner/core/geometry/ (horizontal.ts, clothoid.ts, arc.ts, line.ts, vertical.ts, frame.ts)
- frontend/src/liner/core/ (types.ts, coordinate3d.ts, stationAtPoint.ts, vector.ts, tolerances.ts, elevationAt.ts, sampling.ts)
- backendの新規Geometry Adapter（必要最小限）

## 非対象
- 曲線長/拡幅/建築限界のproduction実装
- Y字橋/JCT/分岐線形
- 2D GUI / Drawing Engine / 3D
- Apollo production redesign
- 上部工設計ロジック
