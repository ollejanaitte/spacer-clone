# 結果表示・図化・帳票アーキテクチャ調査

## 1. 目的

解析結果を画面表示、図化、帳票、エクスポートへ展開する際の責務分離を整理し、本プロジェクトで採用するアーキテクチャの理由を記録する。

本調査は設計確定済み内容の反映であり、実装、UI変更、API変更、ライブラリ追加は行わない。

## 2. 採用アーキテクチャ

結果表示は以下の流れとする。

```text
Result
↓
ViewModel
↓
Viewer
```

帳票・図面出力は以下の流れとする。

```text
Result
↓
Drawing Model
↓
Report Model
↓
Export
```

結果スキーマ全体では以下の関係とする。

```text
Solver
↓
Result Schema
↓
ViewModel

Report Model

Drawing Model
```

## 3. 採用理由

### 3.1 Result Schemaを純粋な解析結果に限定するため

`Result Schema` はソルバが返す解析結果の永続的な受け渡し形式である。したがって、以下のような表示・操作・見た目に依存する状態は含めない。

- 表示倍率
- 表示色
- 線幅
- フォントサイズ
- カメラ状態
- UI状態

これらは `ViewModel`、`Drawing Model`、`Report Model`、または各Viewerの状態として扱う。

### 3.2 表示と帳票の目的が異なるため

画面表示は対話的な確認を目的とし、選択、フィルタ、スケール、強調表示などを扱う。一方、帳票・図面出力は再現性のある出力を目的とし、用紙、表、図面要素、注記、エクスポート形式を扱う。

そのため、画面表示は `ViewModel` を経由し、帳票・図面は `Drawing Model` と `Report Model` を経由する。

### 3.3 動的解析・影響線解析との拡張整合を保つため

固有値解析、応答スペクトル解析、影響線解析は通常の静的解析よりも結果種別が多い。`Result Schema` に以下を定義し、派生モデル側で表示・出力用途へ変換する。

- 固有値解析: 固有値、固有周期、振動数、刺激係数、有効質量比
- 応答スペクトル解析: SRSS、CQC、モード別結果、合成結果
- 影響線解析: 節点変位、反力、断面力

## 4. 文書間の役割

| 文書 | 役割 |
| --- | --- |
| [result-schema.md](../design/result-schema.md) | ソルバ出力としての解析結果スキーマを定義する。 |
| [result-visualization.md](../design/result-visualization.md) | ResultからViewModelを作り、Viewerへ渡す表示設計を定義する。 |
| [report-drawing-output.md](../design/report-drawing-output.md) | ResultからDrawing Model、Report Model、Exportへ展開する帳票・図面設計を定義する。 |

## 5. 結論

本プロジェクトでは、解析結果そのものを `Result Schema` に閉じ込め、表示・図化・帳票の都合を派生モデルへ分離する。これにより、ソルバ出力の安定性、Viewerの自由度、帳票出力の再現性を同時に確保する。
