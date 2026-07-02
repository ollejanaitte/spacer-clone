# Phase 3.6 Master Pre-Decision Document

対象: Phase 3.6 JIP-LINER Importer  
作成日: 2026-07-02  
位置づけ: Phase 3.5 LINER Setup Tab とは独立した PDF 写経入力モジュールの設計判断集

## 0. 確定済み UI 方針

1. 既存 6 タブとは全く別物の入力 UI として作る。タブ内に組み込まない。並列画面として独立させる。
2. UI 単位は「PDF 1 ページ = 1 画面」の原則。
3. 画面遷移はウィザード式: `プロジェクト -> 橋梁 -> 基準ライン/橋軸線マスタ -> 横断面リスト -> 横断面編集 -> ピア/スパン確認 -> Phase 3.5 draft へのエクスポート`
4. 入力方式は「PDF の値を写経」を主体とする。平面要素、縦断要素、横断勾配定義も補助入力として保持できる構造にする。
5. 未定義値 `********` は `null` + `flags` で状態を保持する。
6. 角度は `{deg, min, sec}` オブジェクトで保持し、十進度と元表記文字列も併記する。
7. 座標系は水平（測地系 + エポック + 系番号）と鉛直（標高基準 + ジオイド）を分離する。
8. トレーサビリティのため各データに `sourceRef`（PDF ページ・行・列・入力時刻）を持つ。

## 1. Pre-Decision #A: 既存 6 タブ改変禁止

Phase 3.6 は Phase 3.5 のライン / 測点 / 高さ / 縦断 / 横断 / 確認図タブを改変しない。タブ追加もしない。

Phase 3.6 が Phase 3.5 に接続する唯一の正規経路は、Phase 3.6 側の adapter が生成する `liner.domainDraft` vNext 相当データである。変換責務は Phase 3.6 側が持ち、Phase 3.5 側の UI、状態管理、pipeline へ importer 固有概念を持ち込まない。

## 2. Pre-Decision #B: 独立 JSON ファイル

Phase 3.6 データは Phase 3.5 draft と別ファイルで保存する。

推奨拡張子や保存場所は実装フェーズで決定するが、論理モデルは `JipLinerImporterProject` として独立し、Phase 3.5 の `project.liner.domainDraft` を直接編集しない。Phase 3.5 draft への反映は、ユーザーが明示的に「エクスポート」を実行した場合のみ行う。

## 3. Pre-Decision #C: 新規 npm パッケージ導入禁止

本フェーズは新規 npm パッケージ導入を前提にしない。UI、バリデーション、ファイル I/O、プレビューは既存の依存関係と標準 API の範囲で設計する。

PDF OCR、PDF パーサ、表抽出ライブラリの導入は Phase 3.6 では扱わない。将来の半自動入力検討時に別 Phase として判断する。

## 4. Pre-Decision #D: エントリポイント方針

Phase 3.6 はメニューから起動する独立画面群とし、Phase 3.5 の 6 タブと同じ階層には置かない。

想定導線は `LINER Importer` または `JIP-LINER PDF 入力` のような独立メニュー項目である。最終名称と配置は M7 の確認事項とする。

## 5. Pre-Decision #E: バージョニング

Phase 3.6 の importer schema version は以下で開始する。

```text
liner.importerSchemaVersion = "0.1.0"
```

これは Phase 3.5 の `liner.schemaVersion` および `liner.draftSchemaVersion` とは別系統で管理する。

## 6. Pre-Decision #F: 片方向変換のみ

Phase 3.6 から Phase 3.5 vNext draft への変換は片方向のみとする。

Phase 3.5 draft から Phase 3.6 importer JSON へ戻す逆変換、または JIP-LINER `.LIN` 形式や PDF 帳票へ戻す変換は本フェーズの非スコープである。

## 7. Codex への基本指示

- 本文書を Phase 3.6 設計作業の最上位判断として扱う。
- Phase 3.5 の既存 6 タブ、N1〜N7、Master Pre-Decision を変更しない。
- 実装コード、テストコード、実 JSON Schema ファイルを作成しない。
- 判断に迷う場合は、PDF 写経入力 UI と Phase 3.5 汚染防止を優先する。
- 新規 npm パッケージ、Feature Flag、`.LIN` 直接読込、逆変換を前提にしない。
- 実 PDF の表記と設計文書の仮定が合わない場合は作業を止め、織田さんへ報告する。

