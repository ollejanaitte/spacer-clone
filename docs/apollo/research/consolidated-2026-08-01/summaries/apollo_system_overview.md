# APOLLO System Overview

## 1. APOLLO全体構成

### Evidence

Apollo は「鋼橋の設計システム」の総称であり、次のサブシステムと市販アプリから構成される（MAN-021, p.7, §2-1-1）。

- Align（線形計算）
- Analyzer（構造解析）
- SuperDesigner（自動設計）
- SuperDrawing（自動製図）
- y-Mater（材料計算）
- MS-Office および AutoCAD

サブシステムは互いにデータリンクし、設計作業をシームレスに進めることができる（同頁）。

工事データは概ね次のフォルダに分かれる（MAN-021, p.27, §4-1(5)）。

```text
¥y-Design-Bridge
  └─ ¥工事名
       ├─ ¥Align   （線形データ）
       ├─ ¥Design  （設計データ）
       └─ ¥Draw    （図面データ）
```

## 2. サブシステム別責務

| system | 責務（Evidence） | 主な出典 |
|---|---|---|
| Align | 線形計算 | MAN-021 §2-1-1, §2-2-1 |
| Analyzer | 構造解析 | MAN-021 §2-1-1; MAN-002/007 格子解析 |
| SuperDesigner | 自動設計。MS-Access DB 中心＋設計アプリ群。RTF 計算書 | MAN-021 §2-1-2 |
| SuperDrawing | 自動製図。設計MDB読込、DWG/GSP、材料出力 | MAN-021 §2-3 |
| y-Mater | 材料計算。NPDATA.txt を読込 | MAN-021 §2-3-2 |
| 設計単体群 | 自動設計利用に加え単独利用可 | MAN-021 §3-1(4), §3-4 |

詳細列は `features/system_component_catalog.csv`。

## 3. SuperDesigner内部構成

### Evidence

- MS-Access のデータベースを中心に、設計対象ごとの設計アプリケーション群から構成（MAN-021, p.8, §2-1-2）。
- 構成図上の例示: 設計データの入力、ＲＣ床版の設計、鋼床版の設計、主桁の設計、横桁の設計、…、設計DB、RTF→MS-Word（同頁図）。
- 単体プログラム名称（MAN-021, p.23, §3-4）:

| 設計内容 | プログラム名称 |
|---|---|
| ＲＣ床版の設計 | Slab |
| 鋼床版の設計 | Stdeck |
| 床組断面力の計算 | Prefloor |
| 床組部材の設計 | Floor |
| 主桁断面の設計 | Girder |
| 汎用断面計算 | Section |
| Ｉ型断面計算 | Isection |
| 縦リブ断面計算 | Ribsection |
| 添接計算 | Splice |
| 圧縮補剛版の設計 | Ribchk |
| 支点上補剛材の設計 | Supstif |
| 中間補剛材の設計 | Stif |
| 支点ダイヤフラムの設計 | Sdia |
| 中間ダイヤフラムの設計 | Idia |
| 対傾構・横構の設計 | SwayLate |

Ribsection / Ribchk / Supstif / Stif / Sdia は一覧表の機能説明欄が空白（Evidence: 空白であること）。

非合成鈑桁コントロールでは、上記単体名とは別に「線形計算」「ハンチ計算」「解析データ作成」「断面計算と添接計算」等の**実行ボタン名**が並ぶ（MAN-002）。ボタン名と exe 名の1:1対応は資料上すべてが明示されてはいない → 一部 UNKNOWN。

## 4. 設計単体プログラム群

- 断面計算・添接計算・ＲＣ床版・床組設計などは自動設計以外に単独利用可（MAN-021, p.21）。
- Section: 適用/不可、新規作成ウィザード、rtf 計算書（MAN-061）。
- Splice: SuperDesigner メニューから起動、`.spl`、計算書を MS-Word 表示（MAN-063）。
- MAN-064 は Stage1 上 **StDeck**（鋼床版）。Splice ではない。

カタログ: `features/standalone_program_catalog.csv`。

## 5. データベースとファイル

| 形式 | 役割 | Evidence |
|---|---|---|
| `.alg`（原文「．ａｌｇ」） | Align 線形データ | MAN-021 p.12 |
| `.mdb` | 設計データベース（工事名.mdb） | MAN-021 p.17; MAN-002 |
| RTF | 計算書 | MAN-021 p.8, p.21; MAN-061 |
| DWG / GSP | 図面（AutoCAD or 中間ファイル） | MAN-021 §2-3-2 |
| NPDATA.txt | 材料データ → y-Mater | MAN-021 p.19 |
| `.stm` | Analyzer 入力データ名の一部として記載 | MAN-007 |
| `.spl` | Splice 単体データ | MAN-063 |

MS-Access のテーブル構造は資料に記載なし → UNKNOWN。

## 6. 処理順序

概要は `summaries/apollo_processing_sequence.md`。
非合成鈑桁ではコントロールが左上→右下の実行配置、青帯＝実行推奨、グレー＝上流未実行等で実行不可（MAN-002）。これは**操作ガイド**であり、計算理論上の必然依存と同一視しない（Interpretation と分離）。

## 7. 人間が変更・確認する箇所

### Evidence

- Align / 各設計プログラムでのデータ入力・確認
- 設計データ入力・変更（グレー項目は上流決定の旨、MAN-005）
- 計算書の MS-Word 後編集（MAN-021 p.21）
- SuperDrawing での CAD 修正は Draw 以外のフォルダで行う（上書き注意、MAN-021 §4-2-2）
- 単位系選択（自動変換なし、MAN-021 §4-2-1）
- 照査リスト（Excel）確認（MAN-021）

## 8. Phase 1に必要な構成

Phase 1（非合成・RC床版・鋼鈑桁・単純桁等）向けに、資料上必要度が高い構成:

| 要素 | 理由 |
|---|---|
| Align | 線形 |
| SuperDesigner + 設計MDB | 中核 |
| Analyzer + 断面力変換 | 格子解析・断面力 |
| Slab | RC床版 |
| Girder / Section / Isection / Splice | 主桁断面・添接 |
| Prefloor / Floor / SwayLate | 床組・対傾構・横構 |
| Supstif / Stif | 補剛材（コントロールに存在） |
| SuperDrawing | 図面（Phase1検証で必要なら） |
| y-Mater | 材料は Phase1 必須かは未判定（低〜中） |

Stdeck / 箱桁ダイヤフラム系は初期詳細対象外。

## 9. Evidence

- 本ファイル §1〜5,7 の出典付き記述
- `work/stage2_*_evidence.csv`（001〜005）
- `features/*_catalog.csv`

## 10. Interpretation

- 非合成鈑桁のボタン列は Phase1 の実務パイプラインの近似として使えるが、ボタン順≠絶対依存。
- Section/Splice 単体は自動設計内の「断面計算と添接計算」と機能領域が重なるが、同一プロセスかは未証明。
- SuperDrawing と y-Mater は Phase1「計算成立」より後段の成果物系。

## 11. Unknown

- Analyzer 断面力ファイルの物理形式
- Access テーブル定義
- 各コントロールボタンと単体 exe の完全マッピング
- y-Mater の出力・編集
- MAN-061 と MAN-062 の版関係
- Prefloor と「横桁設計」ボタンの関係の厳密性
