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

### 8. Pre-Decision #G: エントリポイント配置

Phase 3.6 は Phase 3.5 6 タブとは別階層のメニュー項目として起動する。別ウィンドウは採用しない。同一アプリ内 route として実装する。

理由: 別ウィンドウは状態管理・保存フローが複雑化する。同一 route であれば Phase 3.5 との UI 分離を保ちつつ既存アーキテクチャで表現可能。

### 9. Pre-Decision #H: 複数橋梁対応

データモデル上は 1 project に複数橋梁を保持できる構造を維持する。初期 UI は 1 橋梁中心の導線とし、複数橋梁編集を強調しない。

複数橋梁を跨ぐ diagnostics / export は本フェーズ非スコープとする。

### 10. Pre-Decision #I: 座標系 epoch は任意

水平座標系の epoch は任意入力とし、未入力の場合は Phase 3.5 draft エクスポート時に warning を出す。エクスポート自体は継続可能とする。

### 11. Pre-Decision #J: ジオイドモデルは任意

鉛直座標系のジオイドモデルは任意入力とし、未入力の場合は Phase 3.5 draft エクスポート時に warning を出す。エクスポート自体は継続可能とする。

### 12. Pre-Decision #K: fixture への実 PDF 値反映

M2 §6 のサンプル JSON に転記した Hランプ4号橋 横断面 1 の抽出値は、実装フェーズで fixture として使用してよい。ただし `REPORT09_2編-01_Hランプ4号橋_線形計算書.PDF` そのものはリポジトリに含めない。値のみコード化する。

### 13. Pre-Decision #L: `********` の初期分類

`********` を含むセルは、初期状態で `flags.notComputed = true` とする。

ユーザーが横断面編集画面のセルコンテキストメニューから `notApplicable` / `outOfRange` へ変更可能とする。UI 実装は PR-3.6-3a のスコープに含める。

### 14. Pre-Decision #M: PDF OCR は Phase 3.7 以降

PDF OCR、表抽出、半自動入力は Phase 3.6 の非スコープとする。Phase 3.7 以降で改めて判断する。Pre-Decision #C（新規 npm パッケージ導入禁止）の維持と整合する。

### 15. Pre-Decision #N: Phase 3.5 draft エクスポートは新規作成

Phase 3.6 から Phase 3.5 draft へのエクスポートは、既存 draft を上書きせず、新規 draft として作成する。既存 Phase 3.5 draft を保護する。

上書きが必要な場合はユーザーによる明示的な 2 段階確認（確認ダイアログ + 差分表示）を経ることを要件とする。実装フェーズで具体化する。

### 16. Pre-Decision #O: conversion log は別ファイル

Phase 3.5 adapter の conversion log は importer JSON 本体に含めず、別ファイル `<project>.conversion.log.json` として保存する。

理由: importer JSON の payload 肥大化を抑え、sourceRef の詳細は log 側に集約する。M5 §6 および M7 リスク項目と整合する。

### 17. Pre-Decision #P: 名前付き途中保存と再開機能

Phase 3.6 は「PDF を見ながら数値を写経」する作業を主目的とするため、入力途中で作業を中断・再開できる機能を必須とする。

- ユーザーは任意の入力時点で **名前を付けて JSON 保存**できる
- 保存された JSON は **後から一覧から呼び出し可能**
- 保存単位はプロジェクトを主とし、橋梁単位・横断面単位のバックアップは実装フェーズで判断する
- 保存ファイル拡張子は実装フェーズで確定するが、Phase 3.5 draft と混同しない拡張子とする
- 保存 JSON は M2 の `JipLinerImporterProject` スキーマに準拠する
- 自動バックアップは名前付き保存とは別系統とし、実装フェーズで間隔を決める
- 未確定の入力（バリデーション error 状態）でも名前付き保存を許可する（Draft 保存）
- 開き直したときは、最後に編集していた画面（プロジェクト → 橋梁 → 横断面編集 等）へ復帰する
