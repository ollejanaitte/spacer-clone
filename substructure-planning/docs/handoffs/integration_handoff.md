# Phase B 統合ハンドオフ（integration_handoff）

日時: 2026-08-07（JST）
作成: 現場監督兼実装検証責任者
前提: Phase A 完了済み。本作業（LAB 内）は spacer-clone 無変更・GitHub 書込みなしで実施した。

## 1. 開始条件（全て満たすとPhase Bを開始）
- [ ] Phase A PASS（判定済み）
- [ ] LINER 統合作業完了（PR#443 merge 済み = f1107b5 確認済み）
- [ ] origin/main を fetch 済み
- [ ] origin/main 最新 SHA 取得済み（f1107b541ee45b6589b2ad9da2b4c045a8901310）
- [ ] 競合ブランチ・worktree がないこと
- [ ] 最新 main を基準に再検証（rebase 必要）

## 基準・制約
- 正本 = origin/main = f1107b5。古い main を基準にした commit/push/PR は禁止。
- checkout 作業先 br (b6775dd, docs/…) は origin/main より古い。Phase B では最新 main から新しい worktree を作る。
- AGENTS.md の破壊禁止（git clean / checkout -- / reset hard / force push / wildcard add）を遵守。

## 統合対象（substructure-planning-lab から）
- schemas/substructure/*.schema.json（5種）+ examples/sample-project.json
- substructure-planning/{docs,verification,prototype,README}
- 詳細: integration_manifest.csv（全44行）参照。node_modules/dist/キャッシュは除外。

## 競合確認（Phase A 時点）
- main 側に substructure/ 関連の衝突なし（逆パターン: 既存 foundation ユーティリティは正常化 util のため無関係）。
- 実際の統合時は commit 前の `git diff` で再確認し、docs/schemas/frontend/backend/shared/package*.yarn の変更があれば自動解決せず停止。

## 最終報告に書くべきフィールド
LINER_MAIN_SHA / SUBSTRUCTURE_BASELINE_SHA / BASELINE_EQUALS_LATEST_MAIN /
REBASE_REQUIRED / MERGE_CONFLICT_DETECTED / PHASE_B_START_AUTHORIZED
（現時点: BASELINE_EQUALS_LATEST_MAIN=YES, MERGE_CONFLICT_DETECTED=NO, PHASE_B_START_AUTHORIZED=NO※別フェーズで指示があって初めて変更）

## 停止基準
- typecheck / test 失敗
- 想定外の staged / status 変化
- 依存関係が想定と異なる
いずれかで即停止して報告。