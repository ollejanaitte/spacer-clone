# 整合性検査・定量集計

## 1. 定量集計（差分マトリクス gap_matrix.csv, N=49）

### 1.1 差分分類

| 分類 | 件数 | 割合 | 意味 |
|---|---|---|---|
| GAP_DONE | 13 | 26.5% | JIP・現行とも揃っている |
| GAP_JIP_PARTIAL | 17 | 34.7% | 存在するが一部・型のみ・検証不十分 |
| GAP_JIP_MISSING | 9 | 18.4% | JIPに有り現行に無い |
| GAP_VERIFICATION | 3 | 6.1% | 実装あるが外部突合がない |
| GAP_DESIGN_NEED | 3 | 6.1% | JIPにも現行にも無いが将来必要 |
| GAP_CURRENT_ONLY | 3 | 6.1% | JIPに無く現行に有る（維持すべき） |
| GAP_MODERNIZE | 1 | 2.0% | 再現でなく再設計すべき |
| 計 | 49 | 100% | |

### 1.2 優先度別

|優先度|件数|
|---|---|
|high|21|
|medium|18|
|low|9|
|(値なし)|1|
|計|49|

### 1.3 カテゴリ別

|カテゴリ|件数|
|---|---|
|alignment|8|
|profile|5|
|station|2|
|bridge|8|
|ldist|2|
|haunch|4|
|hoso|2|
|drawing|7|
|program|7|
|verification|4|
|計|49|

## 2. 主要な定量結論

- **high 優先 21 件**のうち、最上位は:
  1. 検証（GAP_VERIFICATION ×3 のうち high が2）—— 数値の信頼性
  2. 拡幅計算（GAP-104/105）
  3. セクション×主桁の格点（GAP-404）
  4. 主桁G 円弧/折れ桁（GAP-405）
- **ハッチ（haunch）**: 対応{1,2,6,7,8,9,14}以外の欠落が主（4件）。
- **描画**: 改良中（部分実装）が主（7件中ほぼ PARTIAL）。

## 3. 整合性チェック

### 3.1 差分の相互一貫性（jip↔current↔gap）
- gap_matrix.csv の gap_id（GAP-x）は、current_system_inventory.csv の現在状態・JIP（jip_liner_feature_inventory.csv）の機能と対応。
- jip_liner_feature_inventory.csv の関数（JIP-xxx）を gap_matrix.csv の jip_id に使い、重複がないことを確認。
- 表記は `GAP_DONE / GAP_JIP_PARTIAL / GAP_JIP_MISSING / GAP_VERIFICATION / GAP_MODERNIZE / GAP_DESIGN_NEED / GAP_CURRENT_ONLY` を統一。

### 3.2 表記統一
- Phase1: JIP-xxx（複合）＋ PARITY_REQUIRED/USEFUL/…
- Phase2: 現行状態（【IMPLEMENTED_VERIFIED/TAB・PARTIAL/ABSENT】等）
- Phase3: 上記の差分分類
- 本チェックで、分類名の誤字（例: 誤った "中さ"）を修正済み。

### 3.3 未解決・注意
- **描画ゴールデン（P5-D01）は「自己参照」**：goldenActivity=P5-D01 という建設意図を前提に existing runtime から自動生成。**外部実測/ JIP 帳票との突合はない**（GAP-1001）。
- **水平/縦断/横断ゴールデンは解析参照**（Simpson等）。実 JIP 実出力・実設計計算例との突合はない（GAP-1000）。
- **Importer サンプル**の C1-C17/GE2 が interpolated（置換予定）のまま（GAP-1002）。
- これらは「実装・機能」ではなく「**検証の実証性**」の課題として、ロードマップ P1（R1 数値検証の確立）に置いた。

## 4. 安全・整合の状態

- 現行リポジトリ（spacer-clone）・worktree: 読取りのみ、変更なし
- Git 書込み・GitHub 変更: なし
- 実装: なし
- 本調査フォルダ以外の成果物: なし
- 基準: main@7b07f623（スナップショット）に固定・read-only 化