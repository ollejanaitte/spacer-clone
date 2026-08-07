# X0_SCOPE — Phase X0 スコープ定義

## 1. 目的

将来の「LINER設計ルールエンジン」構築のためのドキュメント資産台帳を構築する。
Phase X0 では資料の棚卸し・正本化・優先順位付けに留め、本文解析（X1以降）は行わない。

## 2. 対象カテゴリ

- 道路構造令・道路設計基準・設計要領
- 道路詳細設計報告書・線形計算書・平面図・縦断図・横断図
- 交差点設計・ランプ設計・JCT設計資料
- 橋梁一般図・設計計算書・上部工設計計算書・鈑桁/箱桁資料
- 線形・桁配置関連資料
- JIP-LINER / JIP-SPACER / Apollo（Align・Analyzer・SuperDesigner・SuperDrawing）マニュアル
- CAD/DXF/DWG・LIN/DAT等の設計データ・サンプルデータ
- 既存調査成果物（research outputs）

## 3. 対象ファイル形式

対象: PDF / DOC / DOCX / XLS / XLSX / CSV / TXT / MD / DXF / DWG / LIN / DAT / JSON / XML / ODP

原則除外:
```
.git/**
node_modules/**
dist/**
build/**
coverage/**
.cache/**
.tmp/**
仮想環境(.venv/__pycache__)
dependency vendor
OS一時ファイル
コンパイル生成物
legacy-archive 内の node_modules 等の依存物
```

## 4. 探索ソースルート

`X0_SOURCE_ROOTS.md` 参照（SR-01〜SR-06）。

## 5. 評価基準

- `document_type`: STANDARD / REGULATION / GUIDELINE / MANUAL / SOFTWARE_MANUAL /
  ROAD_ALIGNMENT_CALCULATION / ROAD_DRAWING / ROAD_DESIGN_REPORT / BRIDGE_CALCULATION /
  BRIDGE_DRAWING / BRIDGE_DESIGN_REPORT / SAMPLE_DATA / SOFTWARE_DATA / CAD_DATA /
  RESEARCH_OUTPUT / REFERENCE / UNKNOWN
- 関連度（road/bridge/liner/spacer/apollo/rule_engine）: DIRECT / SUPPORTING / FUTURE /
  REFERENCE_ONLY / NONE / UNKNOWN
- 優先順位: P0（ルール・実案件再現・LINERコア）/ P1（道路幾何・橋梁配置・計算検証）/
  P2（将来・上部工・解析連携）/ P3（参考） / UNKNOWN

## 6. やらないこと（Phase X0）

- 道路構造令・道示等の本文完全解析
- 全PDFのOCR・全ページ画像化
- 数式の完全抽出
- Rule Engine実装 / LINER計算ロジック変更 / GUI・曲線橋・Y字橋・JCT・Apollo・上部工・
  SPACER・3D・CAD生成の実装
- PDF原本のGitHub登録
- Phase X1の自動開始

## 7. 完了条件

1. source root確定（6ルート）
2. 資料資産台帳完成（147件・SHA256付き）
3. PDFページ数・テキスト層整理（94件）
4. document_type分類完了
5. 関連度分類完了
6. 重複候補整理完了（7グループ）
7. 版違い候補整理完了（3ファミリー）
8. P0/P1/P2/P3整理完了
9. X1調査順序完成
10. X0-P00〜X0-P05を全て `research/liner-r1-planning` へmerge
11. main未変更 / 上部工worktree未変更 / PDF原本をGitへ未登録
