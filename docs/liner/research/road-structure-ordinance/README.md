# 道路構造令 目次リバースエンジニアリング（Road Structure Ordinance TOC Research Map）

**目的:** ローカルの「道路構造令の解説と運用（令和3年3月）」PDFの**目次だけ**を読み解き、
今後の道路線形・道路幾何・橋梁連携ソフトウェア（LINER/spacer-clone-liner）開発に使える
調査地図（Research Map）を作成する。

**対象:** 目次解析・調査計画作成のみ。本文の全条文解析・数値ルール実装・GUI/曲線橋/上部工/3D実装は開始しない。

## 成果物一覧

| ファイル | 内容 |
| --- | --- |
| `README.md` | 本ファイル（目次） |
| `SOURCE_INFO.md` | 情報源PDFの識別情報（パス・サイズ・SHA256・ページ数等） |
| `TOC_RAW.txt` | 目次ページの生OCRテキスト（PDFページ6-11, RapidOCR） |
| `TOC_NORMALIZED.md` | 目次を正規化したマークダウン（L1〜L4） |
| `TOC_TREE.md` | 目次の階層ツリー |
| `TOC_INDEX.csv` | 目次全項目の機械可読インデックス（346行・16列） |
| `SOFTWARE_RELEVANCE_MATRIX.csv` | ソフトウェア開発観点の分類マトリクス（232行） |
| `RULE_ENGINE_CANDIDATES.csv` | 将来Rule Engine候補（23件, 全行 requires_body_review=YES） |
| `ROAD_PROJECT_MAPPING.md` | 実案件資料（西知多道路・東海JCT）との接続候補 |
| `BODY_RESEARCH_PRIORITY.md` | 本文解析優先順位（Priority A/B/C, Phase RO-1〜RO-10） |
| `NEXT_PHASE_PLAN.md` | 本文完全解析の次フェーズ計画（自動開始しない） |
| `FINAL_REPORT.md` | 最終報告書（検証判定含む） |

## 情報源の重要情報

- ファイル: `道路構造令の解説と運用_令和3年3月.pdf`（~/Projects 直下）
- SHA256: `a6838c6f4f584aa0122366b3ab9bf1d171cf2f82bfc7ed7c24da085b256a5e67`
- PDFページ数: 385（印刷ページ番号は最大717まで確認）
- テキスト層なし（スキャンPDF）のため、目次抽出は **ページ画像 + OCR（RapidOCR）** を目次ページのみに実施
- 目次ページ: PDFページ 6〜11

## 目次構造の概要

```
道路構造令（法令本体 第1条〜42条+）
道路構造令施行規則
Ⅰ 総説（仮称）
  └ 1-1 本書の目的 / 1-2 道路構造令の趣旨 / 1-3 用語の定義
Ⅱ 道路の計画・設計の考え方
  └ 第1章 概説 / 第2章 道路の機能確保 / 第3章 地域の状況 / 第4章 配慮事項
Ⅲ 道路の構造
  └ 第1章 道路の区分と設計速度、設計車両
    第2章 横断面の構成
    第3章 線形・視距（← LINER数値コアに最重要）
    第4章 平面交差
    第5章 立体交差（IC/JCT・ランプ）
    第6章 鉄道等との交差
    第7章 自転車専用道路等・歩行者専用道路・歩車共存道路等
    第8章 土工、舗装、道路構造物（8-5 橋・高架が橋梁連携で重要）
    第9章 道路の附属施設
    第10章 雑則（特例）
主要参考図書
```

## 本書の扱い（制約）

- PDF原本をリポジトリへコピーしない（識別情報のみ記録）。
- `~/Projects/spacer-clone`（上部工実装環境）は変更禁止。
- Git commit / push / PR / merge は行わない。
- 詳細は `FINAL_REPORT.md` 参照。
