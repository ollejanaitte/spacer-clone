# 08 UI Specification

## 1. 目的

React UIのMVP画面構成と操作仕様を定義する。MVPでは最小限のWeb UIに限定し、入力、検証、解析実行、結果確認、JSON/CSV出力を扱う。

## 2. 対象範囲

- Toolbar。
- Tree。
- 3D View。
- Property Panel。
- Results / Errors / Log。
- 節点表、部材表、材料表、断面表、支点表、荷重表。
- 解析実行。
- 結果表示。
- JSON/CSV出力操作。

## 3. 非対象範囲

- CADライクな図面編集。
- ドラッグによる部材作成。
- 複数ウィンドウUI。
- 帳票テンプレート編集。
- DXF出力操作。
- 影響線、移動荷重、固有値、応答スペクトル等のMVP外機能画面。
- 単位選択、単位変換。
- ライセンス管理画面。

## 4. 全体レイアウト

```text
┌───────────────────────────┐
│ Toolbar                   │
├──────────┬────────────────┤
│ Tree     │ 3D View        │
│          │                │
├──────────┴────────────────┤
│ Property Panel            │
├───────────────────────────┤
│ Results / Errors / Log    │
└───────────────────────────┘
```

実装では画面幅に応じてTree、3D View、Property Panelの配置を調整してよい。ただし、主要領域の責務はこの構成に従う。

## 5. Toolbar

操作:

- 新規。
- 開く。
- 保存。
- 検証。
- 解析実行。
- JSON出力。
- CSV出力。
- サンプル読込。

表示:

- プロジェクト名。
- 未保存状態。
- 検証状態。
- 解析状態。

## 6. Tree

項目:

- Project。
- Nodes。
- Members。
- Materials。
- Sections。
- Supports。
- Load Cases。
- Nodal Loads。
- Member Loads。
- Analysis Settings。
- Results。

選択時の動作:

- 対応する表または詳細をProperty Panelに表示する。
- エンティティを選択した場合、3D Viewでハイライトする。

## 7. 3D View

`docs/09_3d_view_spec.md` に従う。

- 入力モデルを線表示する。
- 選択中エンティティをハイライトする。
- 解析結果がある場合、選択中の `resultCaseId` の変形図を表示する。
- MVPでは `resultCaseId = loadCaseId` とする。

## 8. Property Panel

- 選択中エンティティの詳細を表示する。
- 表で編集しにくい項目を編集できる。
- 検証エラーを項目単位で表示する。
- 部材長などの算出値は読み取り専用で表示してよい。

## 9. Results / Errors / Log

タブ:

- Results。
- Errors。
- Warnings。
- Logs。

Errors:

- API/Validation/Engineの構造化エラーを表示する。
- クリックで関連テーブル行へ移動する。

Results:

- 解析概要。
- 変位表。
- 反力表。
- 部材端力表。
- `resultCaseId` フィルタ。

## 10. 入力表

共通機能:

- 行追加。
- 行削除。
- セル編集。
- ID重複表示。
- 参照候補の選択。
- SI固定単位の表示。

MVPはSI固定で単位変換を行わない。UIには列見出しや補助表示として単位を表示してよいが、単位選択UIは作らない。

### 節点表

- `id`
- `x`
- `y`
- `z`
- `label`

座標単位はm。

### 部材表

- `id`
- `nodeI`
- `nodeJ`
- `materialId`
- `sectionId`
- `orientationVector`
- `label`

MVPでは `orientationVector` のみ対応する。`orientationNode` は入力項目として表示しない。

### 材料表

- `id`
- `name`
- `elasticModulus`
- `poissonRatio`
- `density`

MVPでは `shearModulus` を入力しない。解析エンジンが以下で内部算出する。

```text
G = E / (2(1+ν))
```

### 断面表

- `id`
- `name`
- `area`
- `iy`
- `iz`
- `j`

### 支点表

- `nodeId`
- `ux`
- `uy`
- `uz`
- `rx`
- `ry`
- `rz`

### 荷重表

Load Cases:

- `id`
- `name`
- `type`

Nodal Loads:

- `id`
- `loadCaseId`
- `nodeId`
- `fx`
- `fy`
- `fz`
- `mx`
- `my`
- `mz`

Member Loads:

- `id`
- `loadCaseId`
- `memberId`
- `coordinateSystem`
- `type`
- `wx`
- `wy`
- `wz`

## 11. 解析実行

- 検証状態を表示する。
- 検証エラーがある場合は実行をブロックする。
- 解析対象の `loadCases` を表示する。
- 実行中状態を表示する。
- 完了後に結果概要へ移動できる。
- 解析入力不正による失敗はHTTPエラーではなく、結果JSONの `analysisSummary.status: "failed"` として扱う。

## 12. 結果表示

- `resultCaseId` でフィルタできる。
- MVPでは `resultCaseId = loadCaseId` とする。
- 節点ID、部材IDでフィルタできる。
- 変形図表示のON/OFFを切り替えられる。
- JSON出力できる。
- CSV出力できる。

解析APIはCSVを返さない。MVPではUIが結果JSONからCSVを生成してよい。将来のReport APIが追加された場合は、そのAPIを使う実装に差し替えてよい。

## 13. エラー処理

- 入力中の軽微な未入力は警告表示し、保存は許可してよい。
- 解析実行前の検証エラーは実行をブロックする。
- API通信失敗は下部ログとエラーパネルに表示する。
- project検証エラーはHTTP 200 + `valid: false` として通常フローで扱う。
- 解析失敗はHTTP 200 + `analysisSummary.status: "failed"` として結果パネルに表示する。
- エラーはブラウザconsoleだけに出してはならない。
- `NaN` や空文字を数値としてAPIへ送らない。

## 14. テスト観点

- UIビルドが成功する。
- 各入力表が表示される。
- 部材表に `orientationNode` が表示されない。
- 材料表に `shearModulus` が表示されない。
- 単位選択UIが存在しない。
- 行追加、編集、削除ができる。
- 不正参照が画面に表示される。
- 解析実行ボタンが検証エラー時に無効または失敗表示になる。
- 成功結果の変位、反力、部材端力表が表示される。
- 結果が `resultCaseId` でフィルタできる。
- 3Dビュー選択とプロパティパネルが連動する。

## 15. 完了条件

- MVPの全入力項目をUIから作成・編集できる。
- API検証と解析実行に接続できる。
- 結果表を表示できる。
- UI側CSVエクスポートが結果JSONから生成できる。
- MVP外機能の操作入口が有効状態で存在しない。
- `docs/04_input_schema.md`、`docs/07_api_spec.md`、`docs/09_3d_view_spec.md` と矛盾しない。
- `docs/12_quality_gate.md` のUIビルド基準を満たす。
