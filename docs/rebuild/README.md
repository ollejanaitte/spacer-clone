# Rebuild（統合システム再構築）

このディレクトリは、現行 `spacer-clone`（旧システム・安定版）を安全に保全した上で、
新しい**統合道路・橋梁設計システム（Project System）**をゼロベースで開発するための
方針・アーキテクチャ・運用ルールを管理する場所です。

**Authority:** REBUILD POLICY / R0
**Status:** ACTIVE（Phase R0 確定済み。R1 以降の実装は本ポリシーに従う）
**Governing baseline:** origin/main @ `42448712c44868855a247b6b947c3e446473fecd`

## 原則

1. **旧システムを安全に残す**: 現行 `main` は旧システム安定版・移植元・比較対象。
2. **新しい建物を別worktreeで建てる**: 新開発領域は
   `/home/masaharu/Projects/spacer-clone-next`（branch: `rebuild/integrated-system`）。
3. **旧コードの丸ごとコピー禁止**: 旧資産は機能単位で
   KEEP / PORT / REWRITE / RETIRE に分類して選別する。
4. **Project / Save / Load を中核**: 新システムは Project System を最上位とする。
5. **未完成の新システムは main へ統合しない**: Acceptance Gate 通過後のみ統合する。

## 文書インデックス

| 文書 | 内容 |
| --- | --- |
| [R0-01_baseline.md](R0-01_baseline.md) | 正規baseline記録（SHA・環境） |
| [R0-02_branch_worktree.md](R0-02_branch_worktree.md) | 新branch / worktree構成 |
| [R0-03_separation_policy.md](R0-03_separation_policy.md) | 新旧システム分離方針 |
| [R0-04_integrated_architecture.md](R0-04_integrated_architecture.md) | 新統合システム基本アーキテクチャ |
| [R0-05_project_system_boundary.md](R0-05_project_system_boundary.md) | Project System 責任境界 |
| [R0-06_save_load_policy.md](R0-06_save_load_policy.md) | Project / Save / Load 基本方針 |
| [R0-07_git_workflow.md](R0-07_git_workflow.md) | Git / branch / PR / merge 運用方針 |
| [R0-08_asset_classification.md](R0-08_asset_classification.md) | KEEP / PORT / REWRITE / RETIRE 方針 |
| [R0-09_r1_start_conditions.md](R0-09_r1_start_conditions.md) | Phase R1 開始条件 |
| [Phase_R0_再構築方針_新開発環境_最終報告書.txt](Phase_R0_再構築方針_新開発環境_最終報告書.txt) | Phase R0 最終報告書 |

## 用語

- **旧システム**: 現行 `main`（`/home/masaharu/Projects/spacer-clone`）。
- **新システム**: `rebuild/integrated-system`
  （`/home/masaharu/Projects/spacer-clone-next`）で開発する統合Project System。
- **Project System**: 業務（Project）を最上位に置き、道路・地形・橋梁・下部工・上部工・
  FEM・CIM・成果品を接続する新統合システムの基盤。
