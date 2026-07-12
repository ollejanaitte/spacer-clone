# Phase 4.5 Step 8.8 — ResultsPanel Semantic Parity UI Integration

> Status: Implemented

## Scope / Objective

ResultsPanel から semantic parity report を browser-safe に扱えるようにし、current `ProjectModel` を left、local JSON file を right として比較できる UI を提供する。UI は既存の deterministic parity report contract を消費し、Node CLI とは分離した browser integration とする。

## Delivered Capabilities

- `ResultsPanelSemanticParity` による parity UI integration を実装。
- current `ProjectModel` を left source に固定。
- local JSON file を right source として読み込み。
- compare, summary, diagnostics, preview, copy, download を提供。
- stale state を検出し、right side の再読み込み後に report の古さを示す。
- invalid JSON / invalid `ProjectModel` の入力エラーを UI で表示。

## JSON Contract

### Schema Version

- `schemaVersion` は `1.0.0` を使用する。

### Deterministic Rules

- deterministic serializer の再利用を前提とする。
- report JSON の canonicalization は既存 serializer 側で担保する。
- UI 側で独自の JSON serializer を新設しない。
- report export は copy / download のどちらでも同一内容になる。

### generatedAt Policy

- `generatedAt` は UI export の再現性を壊すために導入しない。
- report 表示と export は日時に依存しない。

## CLI

Step 8.8 は browser UI の文脈であり、Node CLI を import しない。

- usage: なし
- output: ResultsPanel 内の summary / diagnostics / preview / export
- exit codes: なし

Node CLI 側のファイルや entrypoint は参照せず、既存の browser runtime だけで完結させる。

## UI

### Left / Right Source

- left source: current `ProjectModel`
- right source: local JSON file
- left は生成済みモデル、right はユーザーが選択した比較対象として扱う

### Comparison Flow

1. right JSON file を選択する。
2. compare を実行する。
3. summary と diagnostics を表示する。
4. preview で report JSON を確認する。
5. copy または download で JSON を出力する。

### Status

- idle
- equivalent
- different
- indeterminate
- invalid

### Diagnostics

- severity
- code
- path
- message

### JSON Export

- copy: clipboard へ JSON をコピーする。
- download: `.parity-report.json` 形式で保存する。
- preview: readonly textarea で report JSON を表示する。

## Browser / Node Boundary

- ResultsPanel の parity UI は browser-safe 実装に限定する。
- Node CLI 実装を browser UI に依存させない。
- browser 側では `ResultsPanelSemanticParity` と既存 report serializer だけを使う。

## Test Evidence

追加したテスト範囲は以下。

- right file の読み込みと valid / invalid 分岐
- comparison 実行時の summary / diagnostics 表示
- stale state の表示
- copy / download アクション
- clear / reset 動作
- invalid JSON / invalid ProjectModel のエラー表示

## Known Limitations

- local file 入力のみ対応。
- clipboard API が利用できない環境では copy が失敗しうる。
- 大きな report は textarea 表示が中心で、専用 paging はない。

## Deferred Work

- remote file source の追加。
- 大規模 report の仮想化。
- 2 モデル比較ビューとの統合拡張。

## Acceptance Decision

Step 8.8 は完了扱いでよい。browser-safe UI integration が成立しており、current ProjectModel / local JSON file の比較、summary / diagnostics / preview / copy / download、そして deterministic serializer の再利用が満たされている。

## Git References

- PR #134 — Step 8.7 parity report JSON contract / Node CLI
- PR #135 — Step 8.8 ResultsPanel Semantic Parity UI

## Next Phase Recommendation

- report viewer の大型化対策を後続フェーズで検討する。
- 必要になれば ResultsPanel 以外の比較導線を追加する。
