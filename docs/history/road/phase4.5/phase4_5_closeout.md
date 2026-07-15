# Phase 4.5 Closeout Audit

> Status: Completed with one known pre-existing lint limitation

## Scope / Objective

Phase 4.5 Step 8.1 から Step 8.8 までの実装完了状況を監査し、docs 不足のみを補完する。対象は Phase 4.5 の総合 closeout 判定であり、コード、テスト、設定、`package.json`、lockfile は変更しない。

## Delivered Capabilities

- Step 8.1 から Step 8.8 までの実装がコード上で成立している。
- frontend の `test` / `typecheck` / `build` は現時点で PASS している。
- Step 8.7 の versioned parity report JSON 契約と Node CLI が整備されている。
- Step 8.8 の browser-safe UI integration が実装済みで、ResultsPanel 上で semantic parity report を扱える。
- PR #134 と PR #135 は merge 済みである。

## JSON Contract

### Schema Version

- `schemaVersion` は `1.0.0` を固定値として扱う。

### Deterministic Rules

- parity report のシリアライズは既存の deterministic serializer を再利用する。
- 配列や diagnostics は canonical order に整列される。
- `schemaVersion` 以外の変動要素を報告 JSON に注入しない。
- 同一入力では byte-identical な出力を維持する。

### generatedAt Policy

- `generatedAt` は CLI / UI のどちらでも必須メタデータとしては採用しない。
- 監査上の方針として、再現性を優先し、生成時刻は JSON へ埋め込まない。
- そのため report は日時に依存せず、再実行時も同一内容を返す。

## CLI

### Usage

```bash
npm run parity:cli -- \
  --left path/to/left-project.json \
  --right path/to/right-project.json \
  [--output path/to/report.json] \
  [--pretty]
```

### Output

- `--output` なし: JSON report を `stdout` に出力する。
- `--output` あり: report をファイルに保存し、標準出力には保存通知を出す。
- 失敗時の詳細は `stderr` に出す。

### Exit Codes

| Code | Meaning |
| --- | --- |
| `0` | equivalent |
| `1` | different |
| `2` | indeterminate |
| `3` | invalid input / invalid `ProjectModel` / invalid report |
| `4` | unexpected internal error |
| `64` | usage error |

## UI

- 左側ソースは current `ProjectModel` を使う。
- 右側ソースは local JSON file を読み込む。
- 比較フローは file select → compare → summary / diagnostics / preview / copy / download の順で進む。
- status は idle / equivalent / different / indeterminate / invalid を表示する。
- diagnostics は severity, code, path, message をそのまま可視化する。
- JSON export は copy と download の両方を提供する。
- preview は report JSON を readonly textarea で確認できる。

## Browser / Node Boundary

- Step 8.8 の UI は browser-safe である。
- `ResultsPanelSemanticParity` は browser から直接使える UI コンポーネントとして実装されている。
- Node CLI を browser UI から import しない。
- Node 側の parity CLI と browser 側の report viewer は同じ deterministic serializer / report contract を共有するが、実行境界は分離されている。

## Test Evidence

- frontend の `test` / `typecheck` / `build` が PASS 済み。
- Step 8.7 の CLI tests で help, version, usage error, invalid input, exit code mapping, deterministic output, output file, stdout / stderr separation を検証済み。
- Step 8.8 の UI tests で compare, stale state, clear/reset, copy, download, invalid file handling を検証済み。

## Known Limitations

- リポジトリに既知の lint failure が残っている。原因は `src/liner/importer/sample/builtInSampleDataset.ts` の既存 TODO marker であり、Phase 4.5 の今回範囲では修正しない。
- browser clipboard API が使えない環境では copy が失敗しうる。
- UI は local file comparison を前提としており、remote source の直接読込は扱わない。

## Deferred Work

- lint の既存 TODO marker の解消。
- 追加の source types や remote input の拡張。
- 大規模 report に対する UI のページングや仮想化の強化。

## Acceptance Decision

Phase 4.5 は完了扱いにできる。実装は Step 8.1 から Step 8.8 まで揃っており、既存の frontend 品質チェックも PASS しているため、機能的な closeout 条件は満たしている。

ただし lint の既存 TODO marker は継続課題として明記し、Phase 4.5 完了の判定からは切り離す。

## Git References

- PR #134 — Step 8.7 parity report JSON contract / Node CLI
- PR #135 — Step 8.8 ResultsPanel parity UI integration

## Next Phase Recommendation

- lint の既存 TODO marker を別フェーズで解消する。
- Phase 5 以降では、必要に応じて report viewer の大型化対策と source 拡張を検討する。
