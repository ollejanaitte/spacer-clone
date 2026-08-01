# Stage 0 Source Preservation Report

## Verdict

```text
APOLLO_STAGE0_SOURCE_PRESERVATION_VERDICT: COMPLETE
```

## Evidence

1. 原本ディレクトリが存在する。
   パス: `source://apollo/ユーザーズマニュアル`

2. 拡張子 `.pdf` / `.PDF` のファイルは **65 件**。
   出典: Grok 独自 `find`、MiMo `pdf_file_list.csv`（集合一致）

3. 相対パス・ファイル名・サイズ一覧を作成した。
   出典: `manual-research/inventory/pdf_file_list.csv`
   抜き取り照合（サイズ一致）:
   - `01_コンクリート床版系鈑桁/01_非合成鈑/Grider_I_00.pdf` → 136181 bytes
   - `02_コンクリート床版系箱桁/01_非合成箱/Girder_Box_11.pdf` → 601820 bytes
   - `01_鋼橋自動設計システム_APOLLO_ユーザーズマニュアル_SuperDesigner_鋼橋の自動設計製図システム.pdf` → 1369497 bytes
   - `単体アプリ/Section/マニュアル(断面計算).pdf` → 970657 bytes

4. SHA-256 を全 65 件算出。UNKNOWN=0。
   出典: `manual-research/inventory/pdf_sha256.txt`
   独立再計算（Python / `sha256sum`）で 4 件一致。

5. ページ数・暗号化・テキスト抽出可否を全 65 件取得。
   出典: `manual-research/inventory/pdf_metadata.csv`
   - `encrypted=no`: 65
   - `text_extractable=yes`: 65
   - `readable=yes`: 65
   - ページ数: min=2, max=60, sum=1121
   - 暗号化判定手段: `pdfinfo` の `Encrypted:` 行（`qpdf` 未インストール）

6. 完全一致重複（同一 SHA-256）: **0 グループ**。
   出典: `manual-research/inventory/duplicate_candidates.csv`（ヘッダーのみ）

7. 読み取り不能 PDF: **0 件**（`readable=no` なし）。

8. 原本 size/mtime は作業前後で変化なし（baseline 照合 CHANGED=0）。

9. ディレクトリ別 PDF 件数:

| トップパス | 件数 |
|---|---:|
| `01_コンクリート床版系鈑桁` | 20 |
| `02_コンクリート床版系箱桁` | 19 |
| `03_鋼床版鈑桁箱桁` | 19 |
| `単体アプリ` | 6 |
| （ルート直下 PDF） | 1 |
| **合計** | **65** |

10. 合計ファイルサイズ: 49,340,147 bytes（約 47.1 MiB）。
    出典: `pdf_file_list.csv` の `file_size_bytes` 合計

## Interpretation

- Phase 1 高優先ディレクトリ（`01_非合成鈑`、`単体アプリ`、SuperDesigner PDF）は原本内に存在し、Stage 1 以降の棚卸し対象として機械的に到達可能である。
- 完全一致重複が無いため、Stage 1 の Manual ID は当面「1 PDF = 1 Manual ID」で採番可能と見込まれる（版関係の判定は Stage 1）。

## Unknown / Blocking

| ID | 内容 | 影響 | Blocking? |
|---|---|---|---|
| U-S0-001 | `qpdf` 未導入のため、暗号化詳細（権限ビット等）は `pdfinfo` の Yes/No のみ | Stage 0 完了には非 Blocking。全件 `Encrypted: no` | No |
| U-S0-002 | 原本内に非 PDF が 1 件: `単体アプリ/Splice/計算書例(添接計算).doc` | Stage 0 の PDF 保全対象外。Stage 1 で文書扱いを判断 | No |
| U-S0-003 | `text_extractable=yes` は先頭1ページに非空白文字があることのみ。全文 OCR 品質・図中文字は未評価 | Stage 1 目次抽出で個別確認 | No |
| U-S0-004 | ファイル名の類似（例: `マニュアル(断面計算).pdf` と `マニュアル(鋼橋の断面計算).pdf`）は内容版関係を意味しない。ハッシュは不一致 | Stage 1 revision matrix | No |

## 成果物一覧

| ファイル | 役割 |
|---|---|
| `manual-research/inventory/pdf_file_list.csv` | 相対パス・ファイル名・サイズ |
| `manual-research/inventory/pdf_sha256.txt` | SHA-256 |
| `manual-research/inventory/pdf_metadata.csv` | ページ数・暗号化・抽出可否・可読性 |
| `manual-research/inventory/duplicate_candidates.csv` | 完全一致重複候補 |
| `manual-research/logs/stage0_execution_log.md` | 実行・検収ログ |
| `manual-research/summaries/stage0_source_preservation_report.md` | 本レポート |

## 原本保全確認

- 変更・移動・削除・リネーム・上書き: **なし**
- baseline 差分: **0**

## Stage 0 完了条件チェック

| 条件 | 結果 |
|---|---|
| PDF 件数 | OK（65） |
| 相対パス一覧 | OK |
| ファイルサイズ | OK |
| SHA-256 | OK |
| ページ数 | OK |
| 暗号化状態 | OK（pdfinfo） |
| テキスト抽出可否 | OK（先頭ページ試験） |
| 完全一致重複 | OK（0件） |
| 読み取り不能 | OK（0件） |
| 原本未変更 | OK |
| 必須成果物 | OK |

## 次 Stage への引き渡し

Stage 1（マニュアル棚卸し）へ進んでよい。
入力として本 Stage の inventory 4 ファイルを使用する。
