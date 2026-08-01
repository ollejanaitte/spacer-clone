# APOLLO Processing Sequence

## 仮説フロー（検証対象）

```text
線形条件
  → Align
  → 線形データ (.alg)
  → SuperDesigner（設計DB .mdb）
  → 設計アプリケーション群
  ↔ Analyzer（断面力連携）
  → 計算書 (RTF)
  → SuperDrawing
  → 製図データ (DWG/GSP)
  → 材料データ (NPDATA.txt)
  → y-Mater
```

各矢印の確認結果:

| 接続 | 判定 | Evidence 要約 | 出典 |
|---|---|---|---|
| 線形条件 → Align | Evidence | Align で基本データより作成開始 | MAN-021 §2-2-1 |
| Align → 線形データ | Evidence | 拡張子．ａｌｇ | MAN-021 p.12 |
| 線形データ → SuperDesigner | Evidence | 既存線形取込 / 制御画面から線形計算 | MAN-021 §2-2-2; MAN-002 |
| SuperDesigner → 設計DB | Evidence | MS-Access に設計データ保存、工事名.mdb | MAN-021 §2-1-2, §3-1; MAN-002 |
| 設計アプリ群実行 | Evidence | 制御ボタン群（線形・ハンチ・床版・主桁…） | MAN-002 |
| SuperDesigner → Analyzer 入力 | Evidence | 解析データ作成で Analyzer データ自動生成 | MAN-002; MAN-007 |
| Analyzer → 解析実行 | Evidence | 構造解析ボタンで Analyzer 実行 | MAN-002; MAN-007 |
| Analyzer → SuperDesigner 断面力 | Evidence | 断面力変換で結果を自動設計へ読込 | MAN-002; MAN-007 |
| 受け渡し物理形式 | **UNKNOWN** | `.stm` は入力データ名として言及。結果形式の仕様は未記載 | MAN-007 |
| SuperDesigner → 計算書 | Evidence | RTF、Word 後編集可 | MAN-021 |
| 設計DB → SuperDrawing | Evidence | 工事名．ｍｄｂ選択 | MAN-021 §2-3-2 |
| SuperDrawing → DWG/GSP | Evidence | 形式選択・変換・Draw 出力 | MAN-021 §2-3, §4-2-2 |
| SuperDrawing → NPDATA.txt | Evidence | 材料出力 | MAN-021 p.19 |
| NPDATA → y-Mater | Evidence | y-Mater が読込可能 | MAN-021 p.19 |
| y-Mater → （成果） | **UNKNOWN** | 出力形式未記載 | — |

## 非合成鈑桁コントロール上の操作順序（Evidence）

MAN-002: 左上から右下へ実行する配置。青帯＝実行推奨。グレー＝上流未実行等で実行不可。

大ブロック（ボタン分類）:

1. 基本データ作成（線形計算 → ハンチ計算 → 設計データ入力・変更 → 基本形状作成）
2. 格子解析（解析データ作成 → 構造解析 → 断面力変換 → 荷重強度図 / 格子結果出力）
3. ＲＣ床版（ＲＣ床版、支点補強筋）
4. 主桁設計（断面計算と添接計算、たわみ剛比）
5. 床組設計（横桁設計、対傾構･横構）
6. 主桁補剛材（支点補剛材、補剛材、ラップ照査）
7. 全体鋼重（鋼重計算）
8. 疲労照査
9. ユーティリティ（照査リスト）

### Interpretation

上記は UI ガイドに基づく推奨フローであり、すべての枝分かれ・再実行条件は未整理。

### Unknown

- 各ボタン失敗時の必須再実行集合
- Analyzer 結果と設計断面力のフィールド対応の全体（MAN-062 に局所座標系対応の記載はあるが網羅ではない）
