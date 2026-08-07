# X2 Scope — Rule Engine Specification

## 目的
READY_FOR_X2 18件のRuleを100%仕様化し、X3で実装着手可能な状態にする。

## 対象
- READY_FOR_X2: 18件（正式仕様化）
- NEEDS_RESEARCH: 2件（未確定部分を明記、X3対象外）
- BLOCKED: 1件（Block理由のみ記録）

## 除外
- Rule Engine本体のコード実装
- Geometry Engine実装 / GUI実装
- 曲線橋 / Y字橋 / JCT / Apollo / SPACER / 上部工 / 3D実装

## OPEN Conflict 2件

| ID | Rule | 内容 | 分類 | 対応 |
|----|------|------|------|------|
| CL-001 | RO-027 縦断勾配 | 橋梁6% vs 規定値5〜8% | NON_BLOCKING | 橋梁設計速度V=40では6%は規定内。X2仕様化継続可 |
| CL-002 | RO-031 横断勾配 | 橋梁5% vs 規定値1.5〜2.0% | NON_BLOCKING | 曲線部片勾配(R=160)のため5%は合理的。第16条の範囲内 |
