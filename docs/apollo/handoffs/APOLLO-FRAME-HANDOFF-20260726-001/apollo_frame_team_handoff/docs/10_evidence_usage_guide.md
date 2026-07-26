# 10 — Evidence Usage Guide

## 目的

READY 69 件を支える Evidence PNG の正しい利用方法を定める。

## 基本原則

| 原則 | 説明 |
|------|------|
| 確認用 | 条文所在・画面所在の確認。OCR だけで数値確定しない |
| 原本代替ではない | 全ページコピーではなく、要件に必要なページのみ |
| 編集禁止 | 画像の加工・トリミングによる意味変更をしない |
| 再配布制限 | 社外・外部クラウドへの不要アップロード禁止 |

## 索引

`evidence/index.csv` 列:

- `evidence_id` — 一意 ID
- `package_relative_path` — パッケージ内パス（例: `evidence/images/...png`）
- `source_document_id` — DOC-RBS-I, DOC-RBS-II, MAN-* 等
- `source_pdf_page` — PDF ページ
- `feature_id`, `requirement_id`, `validation_rule_id` — トレーサビリティ
- `topic` — 要件トピック
- `sha256` — 整合性検証用

## READY requirement との対応

```text
RDY-xxx → REQ-5C-xxxx → VAL-REQ-5C-xxxx → evidence/images/*.png
```

候補リンク: `work/frame_handoff_ready_link_candidates.csv`（調査側作業用）

## 出典 ID

- **DOC-RBS-I / DOC-RBS-II:** 道路橋示方書関連調査資料（原本非同梱）
- **MAN-xxx:** APOLLO マニュアル ID（原本 PDF 非同梱）

表紙・奥付で確認した版は `source_edition` に記録。Target としては **NOT_SELECTED**。

## OCR 誤認

Evidence は 300dpi PNG。OCR 誤認の可能性がある。数値・式は画像目視と一次資料で監督確認する。

## 画像だけで不足する場合

- 前後ページの文脈が必要 → OPEN / UNKNOWN として記録し追加抽出を依頼
- JIS 条文が必要 → JIS GAP バケットへ

## 検収

Grok は最低 25 画像をカテゴリ別に直接確認する（RC 床版、主桁、添接、荷重・解析、材料等）。

## ライセンス

詳細: `docs/11_source_and_license_notes.md`。受領組織内での利用権限を確認すること。
