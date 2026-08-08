# Phase X4-B — LINER Alignment Solver

**目的:** X4-Aで確立したCanonical Geometry Kernelを唯一の幾何計算基盤として利用し、
LINERの「1本の道路中心線Alignment」を安全に組み立て・評価するAlignment Solverを確立する。

## スコープ
- canonical Alignment data model
- ordered geometry element sequence
- element start/end stationのdeterministic計算
- station→element lookup
- station→XY / tangent / curvature評価
- boundary continuity検証
- alignment-level trace
- X3 Rule Engine / Road→Bridge contract接続
- Project Replay検証

## 非対象
- 複数中心線 / 分岐 / Y字橋 / JCT / Alignment Graph
- 必要曲線長を決める設計Rule（NEEDS_RESEARCH）
- 拡幅Rule / 建築限界Rule
- GUI大規模改修 / Drawing Engine / 3D / Apollo redesign
- 上部工・SPACER解析

## 方針
- Geometry数式はX4-A Kernelのみ利用（backend/rule_engine/geometry/）
- 二重実装禁止
- X4-A canonical APIの破壊禁止

## Step構成（実行結果）
| Step | 内容 | ブランチ | PR | 状態 |
|------|------|----------|-----|------|
| P00 | Existing Alignment Audit / Scope Freeze | liner-x4b-p00-audit | #529 | MERGED |
| P01 | Alignment Model / Builder | liner-x4b-p01-model | #531 | MERGED |
| P02 | Station Progression / Element Lookup | liner-x4b-p02-station-lookup | #532 | MERGED |
| P03 | Alignment Evaluation | liner-x4b-p03-evaluation | #534 | MERGED |
| P04 | Continuity / Semantic Points | liner-x4b-p04-continuity | #535 | MERGED |
| P05 | Rule Engine / Road→Bridge Adapter | liner-x4b-p05-adapters | #536 | MERGED |
| P06 | Project Replay / Regression | liner-x4b-p06-verification | #538 | MERGED |
| P07 | Completion / X4-C Gate | liner-x4b-p07-x4c-gate | 本PR | 実行 |

## 完了報告
- [X4-C Gate Report](./X4C_GATE_REPORT.md)