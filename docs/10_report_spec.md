# 10 Report Specification

## 1. 目的

MVPにおける解析結果のJSON/CSV出力仕様を定義する。JIP-SPACERの帳票ビューア概念は参考にするが、MVPではPDF帳票生成、HTML帳票生成、テンプレート編集、独自拡張子互換は扱わない。

## 2. 対象範囲

- 結果JSON出力。
- 変位CSV。
- 反力CSV。
- 部材端力CSV。
- 解析概要、警告、エラーの出力。

## 3. 非対象範囲

- 帳票テンプレート編集。
- PDF帳票生成。
- HTML帳票生成。
- DXF出力。
- JIP-SPACER帳票拡張子互換。
- 影響線、移動荷重、固有値、応答スペクトル専用帳票。
- 温度荷重、プレストレス専用帳票。

## 4. 出力仕様

### JSON出力

`docs/06_result_schema.md` の結果JSONをそのまま出力する。

ルール:

- 数値はJSON number。
- 表示用丸めを行わない。
- `warnings` と `errors` を含める。

### displacements.csv

ヘッダー:

```text
resultCaseId,nodeId,ux,uy,uz,rx,ry,rz
```

### reactions.csv

ヘッダー:

```text
resultCaseId,nodeId,fx,fy,fz,mx,my,mz,constrainedDofs
```

### member_end_forces.csv

ヘッダー:

```text
resultCaseId,memberId,end,fx,fy,fz,mx,my,mz
```

`end` は `I` または `J`。

CSV出力でもケース識別子は `resultCaseId` を使う。MVPでは `resultCaseId = loadCaseId` とする。将来の組合せケース対応時もCSV列名は `resultCaseId` のまま維持する。

## 5. エラー処理

- 解析失敗時もエラー情報をJSON/CSV出力で扱える。
- 結果配列が空でもCSVヘッダーは出力できる。
- 非有限値があれば出力生成を失敗させ、`REPORT_ERROR` を返す。
- ファイル書込失敗はUI/APIに表示する。

## 6. テスト観点

- 成功結果JSONから3種CSVを生成できる。
- CSVヘッダーが仕様通りである。
- 部材端力はI端、J端の2行に展開される。
- エラー結果でもJSONに `errors` が含まれる。
- JSON数値が文字列化されない。

## 7. 完了条件

- UIまたはAPIからJSON/CSVを出力できる。
- `docs/06_result_schema.md` と矛盾しない。
- 出力がMVP対象結果に限定されている。
- `docs/12_quality_gate.md` のJSON SchemaとAPIテスト基準を満たす。
