# Cross Section Canonicalization Plan

## 正本（Source of Truth）優先順
1. **frontend/schema/types.ts** — 幅員・横断勾配・幅員変化点のdomain model（KEEP_AS_CANONICAL）
2. **frontend/core/width/widthResolution.ts** — 幅員解像（resolveWidthAtDistance, resolveStationOffsetLines）
3. **frontend/core/grid/crossfallResolution.ts** — 横断勾配状態解像 + offset別delta_z
4. **frontend/core/vector.ts** — offsetPoint / angleToNormal（local frame正本）
5. **frontend/core/elevationAt.ts** — 縦断標高evaluator（grade / parabolic）
6. **backend Alignment Solver (X4-B)** — station pose（center XY / tangent / curvature）
7. **backend Geometry Kernel (X4-A)** — Vec2D等低レベル型

## Canonical数式
- **XY**: `point_xyz.xy = center_xy + normal(azimuth) * offset`（offsetPoint, normal=(-sin,cos)）
- **crossfall delta_z**: `delta_z = -(slopePercent/100) * (offset - pivot_offset)`（offset<0 → leftSlope、>0 → rightSlope、pivot±tolerance内 → 0）
- **z**: `z = center_elevation + template_elevation + delta_z`
- **width解像**: piecewise-constant（直前の幅員変化点が基準、線形補間はしない）

## backend正本化方針
X4-Bに倣い、backendにcanonical Cross Section Generatorを新規に配置:
```
backend/rule_engine/crosssection/
  contract.py    Request / Segment / Point / Result / Trace 型
  width.py       width評価（explicit input + 既存方式のhold）
  crossfall.py   crossfall評価（explicit input + resolveCrossfallOffset互換）
  geometry.py    local→global XYZ / edge / section point生成（Alignment Solver + Kernel API のみ使用）
  adapters.py    Rule Engine / Road→Bridge接続
```
既存frontendの数式をlockし、backendに同一のcanonical helperとして集約。
**単一canonical helper**のみが数式を持つ。

## 重複除去プラン
| group | 現状 | 処置 |
|-------|------|------|
| crossfallΔz | frontend 2箇所 (crossSectionZMerge.applyCrossSlope / crossfallResolution.resolveCrossfallOffset) | backend canonical helperへ集約。frontendはWRAP化（将来migrate） |
| elevation二度 | elevationAt.ts / verticalSampling.ts | backendではelevationの再実装をしない。explicit input + frontend adapter利用 |

## 対象外・DEFER
- Vertical Alignment Solver（backend新設せず、center_elevationはexplicit input）
- 設計Rule（幅員・crossfall・縦断勾配の自動決定）