# 検証テスト計画（Test Plan）

区分: PROPOSED。検証対象は「下部工計画・3Dモデリング」の技術検証であり、
正式な設計照査ではない。
NUMERIC_DESIGN_AUTHORIZATION: NOT_GRANTED
PRODUCTION_USE_AUTHORIZATION: NOT_GRANTED

## 1. 検証カテゴリ

| カテゴリ | 実施方法 | 成果物 |
|---|---|---|
| A. 作業分離 | 事後確認 | final_report, git status |
| B. データ（スキーマ検証） | python jsonschema | verification/schema_validation.py |
| C. 3Dジオメトリ | vitest 単体 | tests/geometry, geometryCoords |
| D. 概算数量 | vitest 単体 | tests/quantity |
| E. エクスポート | ブラウザ+GLB解析 | tests/browser_verify + GLB確認 |
| B(入出力) / UI | ブラウザ検証 (Playwright) | tests/browser_verify |

## 2. 検証項目と手順

### A. 作業分離
- A1: LAB_ROOT外にファイルを作っていない → 事後 ls / find
- A2: spacer-clone を変更していない → git status 比較（前後SHA）
- A3: GitHub書込みを行っていない → 操作記録確認

### B. データ（JSON Schema）
- B1: 正常データ検証（sample-project）→ schema_validation.py
- B2: 必須項目欠落時の拒否 → "coordinateSystem欠落"
- B3: 負の寸法の拒否 → validation.test / schema_validation
- B4: ゼロ寸法の拒否 → 同上
- B5: 単位系不明時の拒否 → unitSystem=imperial
- B6: 座標系不明時の拒否 → coordinateSystem=y-up-drop
- B7: 未対応構造形式の拒否 → formType, supportType
- B8: schemaVersion不一致時の処理 → 拒否
- B9: JSON 保存→再読込み一致 → projectIO.test, browser_verify

### C. 3D
- C1: 柱寸法変更で再生成 → browser (体積変化)
- C2: 梁寸法変更で再生成 → geometry / browser
- C3: フーチング寸法変更で再生成 → geometry
- C4: 杭径・杭本数・杭間隔変更で再生成 → geometry(piles)
- C5: 橋軸方向変更時の回転 → geometryCoords
- C6: 斜角変更時の回転 → geometryCoords
- C7: 支点座標変更時の移動 → geometryCoords
- C8: 複数支承配置 → geometryCoords
- C9: 上部工簡易外形との接続 → geometryCoords (SUPERSTRUCTURE-ENVELOPE)
- C10: 保存後の再読込み一致 → projectIO round / browser 再読込
- C11: 安定ID維持 (P1-COLUMN-01 等) → geometry.test

### D. 概算数量
- D1: 柱体積 = w*d*h → quantity.test
- D2: 梁体積 → quantity.test
- D3: フーチング体積 → quantity.test
- D4: 杭体積 = πr²·L·n → quantity.test
- D5: 合計コンクリート体積 → quantity.test
- D6: 杭総延長 = L·n → quantity.test
- 全て幾何概算、実務数量ではない旨を明記。

### E. エクスポート
- E1: glTF/GLB 検証 → browser_verify GLB 出力(glTF header)
- E2: STL 検証 → 候補実装（未実装・比較のみ）
- E3: OBJ 必要性評価 → 調査のみ
- E4: 部材ID保持可否 → GLB node name 確認
- E5: 単位保持可否 → GLB unit (expected meter) 検討
- E6: 座標保持可否 → GLB 座標検討

### 実行コマンド
- データ検証: `python3 verification/schema_validation.py`
- 単体テスト: `cd prototype && npm test`（vitest）
- ブラウザ検証: 事前に dev サーバ起動→ `node tests/browser_verify.mjs`
- スクリーンショット: verification/screenshots/