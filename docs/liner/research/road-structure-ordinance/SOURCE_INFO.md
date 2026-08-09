# SOURCE INFO — 道路構造令の解説と運用（令和3年3月）

本フェーズ（目次リバースエンジニアリング）で使用した一次情報源の識別情報を記録する。

## 1. ファイル識別情報

| 項目 | 値 |
| --- | --- |
| SOURCE_FILE_NAME | 道路構造令の解説と運用_令和3年3月.pdf |
| SOURCE_ABSOLUTE_PATH | ~/Projects/道路構造令の解説と運用_令和3年3月.pdf |
| SOURCE_FILE_SIZE | 227,041,364 bytes (約227 MB) |
| SOURCE_SHA256 | `a6838c6f4f584aa0122366b3ab9bf1d171cf2f82bfc7ed7c24da085b256a5e67` |
| SOURCE_PAGE_COUNT | 385 (PDF物理ページ) |
| SOURCE_PUBLICATION_DATE | 令和3年3月31日（奥付より：改訂版第1刷発行） |
| SOURCE_FILE_MTIME | 2026-08-07 15:42:34 +0900 |

## 2. PDFメタデータ（pdfinfo）

- Title: `道路構造令の解説と運用`（PDFメタデータは文字化け: `<93B998488D5C91A297DF82CC89F090E082C6895E9770816997DF986133944E338C8E816A2E786264>`）
- Author: 公益社団法人日本道路協会（PDFメタデータは文字化け）
- Creator: PScript5.dll Version 5.2.2
- Producer: Acrobat Distiller 26.0 (Windows)
- CreationDate / ModDate: 2026-08-07 13:45:07 JST
- Pages: 385
- Encrypted: no
- Page size: A4 (595.22 x 842 pts)
- Optimized: yes
- PDF version: 1.6

## 3. 原本の物理構成（判明分）

- PDF 1〜11ページ : 表紙・序・まえがき・編者一覧・目次（1ページ = 印刷1ページ）
- PDF 6〜11ページ : 目次（本フェーズの解析対象範囲）
- PDF 12ページ〜 : 道路構造令（法令本文）開始
- 印刷ページ番号はPDFページ番号と異なる。本文はPDF 12ページ以降、おおむね2-up（見開き2印刷ページ/1PDFページ）スキャンと推定。
- 印刷ページ番号の最大値: 717（主要参考図書領域のフッター `—716—` `—717—` をPDF 383ページで確認）

## 4. テキスト層の有無

- `pdftotext -layout` ではテキストを抽出できず（0文字）。
- 本PDFはスキャン画像PDF（テキスト層なし）であることを確認。
- そのため、目次抽出は **ページ画像レンダリング + OCR（RapidOCR onnxruntime）** を目次ページに限定して実施した。

## 5. 原本の取り扱い

- 本PDFは**読み取り専用**として扱う。
- リポジトリへのコピー、Git add、GitHubへのpushは行わない。
- 本資料にはファイル情報のみを記録する。
- ページ画像・分割PDFはリポジトリに収録しない（作業用画像はすべて `/tmp` に生成し破棄対象）。
