# 検証テスト結果（Test Results）

実施日時: 2026-08-07（JST）
対象: 下部工計画・3Dモデリングツール 技術プロトタイプ
区分: 結果は本検証での事実。数値は概算・未検証・実務使用不可。

## 1. 総括

| カテゴリ | 結果 |
|---|---|
| データ（スキーマ）検証 | 12/12 PASS |
| 単体テスト（vitest） | 26/26 PASS |
| ブラウザ検証（Playwright） | 10/10 PASS |
| 作業分離 | 問題なし |

## 2. データ（JSON Schema）検証

`python3 verification/schema_validation.py` 実行結果（12/12 PASS）:

| 検証項目 | 期待 | 実績 |
|---|---|---|
| 正常データ検証(sample-project) | valid | PASS |
| 負の寸法の拒否 | invalid | PASS |
| ゼロ寸法の拒否 | invalid | PASS |
| 必須欠落(coordinateSystem欠落)の拒否 | invalid | PASS |
| 単位系不明の拒否 | invalid | PASS |
| 座標系不明の拒否 | invalid | PASS |
| schemaVersion不一致の拒否 | invalid | PASS |
| 未対応formTypeの拒否 | invalid | PASS |
| 未対応supportTypeの拒否 | invalid | PASS |
| support-interface 正常(反例あり) | valid | PASS |
| support-interface 反離なしでも可能 | valid | PASS |
| support-interface 座標系不明拒否 | invalid | PASS |

### B. JSON入出力（単体）
- 保存→再読込み一致: PASS（round-trip 一致）
- 不正JSON拒否: PASS
- 負寸法JSON拒否: PASS

## 3. 3Dジオメトリ（単体 26/26）

- 正常シーン生成: PASS
- 安定ID (P1-COLUMN-01, P1-CAP, P1-FOOTING, A1-BACKWALL, A1-WING-L, P1-BEARING-01, 杭ID): PASS
- 寸法変更後もID維持: PASS
- 柱天端 = 梁下面（Z接続）: PASS
- 支点座標変更で移動: PASS
- 斜角変更で回転: PASS
- 橋軸方向変更でグループ回転: PASS
- 上部工簡易外形配置: PASS
- 複数支承配置: PASS

## 4. 概算数量（単体）

- 柱体積 = 幅×奥行×高: PASS
- 杭体積 = πr²·L·n: PASS
- 杭総延長 = L·n: PASS
- 合計 = 各部材和: PASS

既定プロジェクト例（P1）:
- 柱体積 26.40 m³
- 合計コンクリート 222.48 m³（柱幅3mに変更後 235.68 m³）
- 杭総延長 80.00 m

※ 幾何概算。実務数量ではない。未検証・実務使用不可。

## 5. ブラウザ検証（10/10 PASS）

| 項目 | 結果 |
|---|---|
| 3D canvas 表示 | PASS |
| 状態表示「3D生成可能」 | PASS |
| 概算数量表示 | PASS |
| 寸法変更で再生成（体積変化） | PASS (222.48→235.68 m³) |
| 部材選択でID表示 | PASS (P1-COLUMN-01) |
| スクリーンショット保存 | PASS |
| JSエラーなし | PASS |
| JSON保存 | PASS (schemaVersion=0.1.0) |
| GLB出力 (glTF header, 41,544 bytes) | PASS |
| JSON再読込み | PASS |

### スクリーンショット
verification/screenshots/:
- prototype_3d_view.png （初期ビュー）
- prototype_skew.png （斜角20° 俯瞰）
- prototype_pick.png （部材選択）

## 6. エクスポート比較

| 項目 | glTF/GLB | STL | OBJ | 判定 |
|---|---|---|---|---|
| 部材ID保持 | node name（確認済） | 不可 | 限定的(Object) | GLB優位 |
| メタデータ | 可 | 不可 | 不可 | GLB優位 |
| 単位保持 | 可(meter) | 不可 | 不可 | GLB優位 |
| 座標保持 | 可 | 頂点のみ | 頂点のみ | GLB優位 |
| 必要度 | 第一候補 | 参考・数量 | 低 | 実装優先GLB |

GLB 出力実装: GLTFExporter(binary)。node.name に安定ID (P1-FOOTING,
P1-COLUMN-01, P1-CAP, P1-BEARING-01, A1-BACKWALL, ...) を確認。
STL/OBJ は方式比較のみとし、プロトタイプではGLBのみ実装した。

## 7. 既知の問題（UNRESOLVED / 制限）

- 上部工簡易外形は1枚の箱近似。ハンチなし。
- 杭配置は等間隔グリッド近似。実際の杭本数配置は検討必要。
- 斜角・曲線橋の超高（カント）は対象外。
- 翼壁は直壁の簡易箱。実橋の勾配形状は未対応。
- 単位系は SI 固定。別単位系は拒否。
- 反力・照査系は未実装（意図的にスコープ外）。
- glTF の単位は GLTFExporter 既定（m）を確認。単位メタデータの明示は今後。

## 8. 作業分離の確認

- LAB_ROOT 外への成果物書込み: なし（一時ファイルは /tmp/opencode のみ）
- spacer-clone 変更: なし（HEAD不変、差分は既存の3ファイルのみ）
- GitHub書込み: なし
- 詳細は final_report.txt 参照

## 9. Phase A 再現性再確認（2026-08-07）

- クリーン再現（rm -rf node_modules && npm ci）から全テスト再実行。
- 単体（vitest）: 26/26 PASS / 型チェック（tsc）: PASS / ビルド（vite）: 成功
- JSON Schema: 12/12 PASS / ブラウザ検証: 10/10 PASS / スクリーンショット3枚再生成
- GLB 安定ID: 期待16種すべて含む18 member node（再確認）
- 詳細は verification/reproducibility_report.md
