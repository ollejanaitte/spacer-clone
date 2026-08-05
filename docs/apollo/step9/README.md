# STEP 9 — 連続橋設計計算書整備および曲線橋実装前調査・仕様凍結

> **Authority:** PHASE 1 INVESTIGATION RECORD (documentation-only)

## STEP 9 の名称

STEP 9: **連続橋設計計算書整備および曲線橋実装前調査・仕様凍結**

## STEP 9 の目的

1. 連続橋（continuous girder）の設計計算書を今後整備するための現状を、既存実装・既存テスト・既存設計資料・既存出力機能の証拠をもとに調査・整理する。
2. 計算書の章構成・出力範囲の仕様を凍結する。
3. 計算書用 Report Model の仕様を凍結する。
4. 非数値プレビューを実装する。
5. 計算書の出力および検証を行う。
6. 曲線橋の既存線形・座標系・3D機能を調査する。
7. 曲線橋の適用範囲・データモデル・座標契約を凍結する。
8. 曲線橋の非数値3D垂直スライス実装計画を立てる。
9. 曲線橋数値解析への移行可否を判定する。

## STEP 9 内で今後想定されるフェーズ一覧

| Phase | 名称 | 説明 |
|-------|------|------|
| Phase 1 | 連続橋設計計算書の現状調査 | 本実施フェーズ。実装・数値計算式追加・解析機能変更・UI変更・PDF出力は行わない。 |
| Phase 2 | 連続橋設計計算書の章構成・出力範囲の仕様凍結 | 計算書章構成と出力範囲を凍結する。 |
| Phase 3 | 連続橋計算書用 Report Model の仕様凍結 | 計算書データモデルを凍結する。 |
| Phase 4 | 連続橋の非数値計算書プレビュー実装 | 非数値レポートのプレビューを実装する。 |
| Phase 5 | 連続橋の計算書出力および検証 | プレビュー／HTML／PDF等の出力と検証を行う。 |
| Phase 6 | 曲線橋の既存線形・座標系・3D機能調査 | 曲線橋の既存機能を調査する。 |
| Phase 7 | 曲線橋の適用範囲・データモデル・座標契約凍結 | 曲線橋のデータモデルを凍結する。 |
| Phase 8 | 曲線橋の非数値3D垂直スライス実装計画 | 曲線橋3D垂直スライスの実装計画を立てる。 |
| Phase 9 | 曲線橋数値解析への移行可否判定 | 曲線橋数値解析への移行を判定する。 |

> このフェーズ構成は Phase 1 時点の暫定案であり、Phase 1 の調査結果により見直し可能である。

## 今回実施する Phase 1 の位置づけ

STEP 9 のうち **Phase 1 のみ**を実施する。

Phase 1 では以下を **実施しない**：

- 実装
- 数値計算式の追加
- 解析機能の変更
- UI 変更
- PDF 出力機能の実装

Phase 1 は **文書調査**であり、既存実装・既存テスト・既存設計資料・既存出力機能を調査し、証拠をもとに現状を整理する。

## 作業方針

### main ブランチ直接編集方針

- 作業ブランチの新規作成禁止
- worktree の新規作成禁止
- detached HEAD での作業禁止
- Pull Request 前提の作業禁止
- `main` 以外へのコミット／push 禁止
- force push 禁止
- rebase / reset / revert / git clean 禁止
- `git checkout -- <file>` / `git restore <file>` 禁止
- 依存関係の追加・更新禁止
- lockfile 変更禁止
- production code の変更禁止
- 数値解析コードの変更禁止
- 既存テストの期待値の変更禁止
- `git add` は対象パスを個別に明示する
- 未追跡ファイルの削除禁止
- 既存ファイルの無断削除禁止

### 小刻み commit・push 方針

- サブステップごとに 1 commit とする
- commit 直後に origin/main へ push する
- 複数サブステップを 1 コミットにまとめない

### 数値設計未承認状態の維持

- 計算書に正式な解析結果・照査結果・合否判定を掲載しない
- 数値設計承認が得られていないため、Number結果の出力を禁止する

### 正式解析を行わない

- Phase 1 は調査・文書化フェーズであり、数値解析を実行しない

### 曲線橋は今回の Phase 1 対象外

- 曲線橋調査は STEP 9 Phase 6 以降で実施する
- Phase 1 は連続橋設計計算書の現状調査のみ

## Preflight 結果

| 項目 | 値 | 結果 |
|------|-----|------|
| 作業場所 | /home/masaharu/Projects/spacer-clone | OK |
| 現在ブランチ | main | OK |
| working tree | clean | OK |
| local HEAD SHA | cec0ab326e4e9400d6b6b98efac7602b7652e02d | OK |
| origin/main SHA | cec0ab326e4e9400d6b6b98efac7602b7652e02d | OK |
| local == origin/main | true | OK |
| 未追跡ファイル | none (clean) | OK |
| 進行中の merge/rebase/cherry-pick | none | OK |

## Phase 1 の成果物一覧

```text
docs/apollo/step9/
├── README.md
└── phase1_continuous_bridge_report_inventory/
    ├── README.md
    ├── 01_repository_baseline.md
    ├── 02_existing_documents_inventory.md
    ├── 03_existing_implementation_inventory.md
    ├── 04_existing_test_inventory.md
    ├── 05_current_output_capability.md
    ├── 06_report_data_source_map.md
    ├── 07_numeric_authorization_boundary.md
    ├── 08_gap_analysis.md
    ├── 09_phase2_recommendation.md
    ├── evidence_matrix.csv
    └── completion_report.md
```
