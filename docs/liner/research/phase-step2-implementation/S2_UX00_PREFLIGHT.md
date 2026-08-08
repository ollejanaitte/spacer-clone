# STEP-2 S2-UX00 — Preflight / Implementation Freeze / Baseline

## Baseline（再確認）
- origin/research/liner-r1-planning @ 08b7163ebd274e2f6b47b5ff08ebf5dc86b98d8d
- origin/main @ f8a99ef（X4系・Step1系・UX系は未統合。Step2はresearch側を正規baseline）
- backend 全体: 943 passed（退行なし確認済み）

## 正本設計書（FROZEN）
| 領域 | 正本 | 状態 |
|------|------|------|
| Vertical Geometry | STEP1_P01_VERTICAL_GEOMETRY.md + TEST_VECTORS | FROZEN |
| Road Rules | STEP1_P02_ROAD_RULES.md | FROZEN |
| Bridge Geometry | STEP1_P03_BRIDGE_GEOMETRY.md | FROZEN |
| Output | STEP1_P04_OUTPUT.md | FROZEN |
| 3D Contract | STEP1_P05_3D_CONTRACT.md | FROZEN |
| Project Replay | STEP1_P06_REPLAY.md | FROZEN |
| Step2 計画 | STEP1_P07_STEP2_PLAN.md + UX_P09_PLAN_REVISION.md | FROZEN |
| 模式図UX | UX_P01〜P06（画面別・live preview・error） | FROZEN |
| Backend-UI 契約 | UX_P08_CONTRACT.md | VERIFIED |

## 実装順序（S2-UX 正本に従う）
S2-UX01 vertical → UX02-05 rules → UX06 rule adapter →
UX07-10 bridge → UX11-13 output → UX14 3D payload →
UX15-16 replay → UX17 diagram contract → UX18 final gate

## 実装方針（freeze）
- FROZEN 仕様を正本とし、仕様の再設計をしない
- 既存 X4-A/B/C/D を再実装しない・破壊しない（最小差分）
- production expected 値を production code から自己生成しない
- 実資料・Golden Master を正解値として扱う
- 1 PR = 1 責務、小 PR で段階 merge

## 仕様問題発見時の手順
production code → Step1設計書 → UX再設計書 → JIP-LINER/実計算書/基準 →
影響範囲整理 → DESIGN_AMENDMENT_NEEDED 判定。
必要なら小さな design amendment PR → merge → implementation PR。

## Critical Uncommitted Data
- docs/liner/research/road-structure-ordinance/（untracked, Rule根拠。参照はするが本Phaseでは track しない）

## COLLISION / 保護対象
- Apollo STEP10 / substructure / Reference Bridge の並行作業を壊さない
- frontend/src/liner 既存機能を壊さない（本Phaseで大きく改変しない）
