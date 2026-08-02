# Phase A+ — 03 正誤表・JIS 取得計画（Errata & JIS Acquisition Plan）

**Authority:** Phase A+（P2）
**Date:** 2026-08-02
**対象ブロッカー:** PA-OQ-003（鋼材 JIS ギャップ） / PA-OQ-004（コンクリート・鉄筋 JIS ギャップ）

## 1. 2026-03-31 正誤表（Errata）取得状況

| 項目 | 状態 | 根拠 |
|------|------|------|
| 正誤表 PDF の公式公開 URL 到達性 | 確認済み | `https://www.road.or.jp/img/books/corrigenda/pdf/20260331.pdf` → HTTP 200 / application/pdf / 771KB（2026-08-02 モデル確認） |
| ローカル取得 | 未実施 | ライセンス資料（道示 Ver2.00 + 正誤表 overlay）の管理方法は人間のライセンス・保存方針に従う。モデルが勝手にリポジトリへ投入しない |
| 正誤表を道示 PDF へ適用 | 未実施 | 適用ルールは DEC-DS01-0001 に従い、適用後は `errata_overlay_applied` をレジスタへ記録 |
| 正誤表対象条項の目視確認 | 未実施 | 02_standard_visual_review_workbook.md の各確認票に「正誤表反映有無」を併記して確認する |

**方針:** 正誤表は「存在と URL 到達性」までモデル確認済み。内容の抽出・適用・確認結果は人間の目視で行い、結果は DEC-ID 付きで 01_blocker_resolution_register.csv と 08_numeric_authorization_gate.md へ反映する。

## 2. JIS 取得の現状（DS-02 レジスタ）

- 34 行（JIS-001..JIS-034）は全て **合成プレースホルダ**。
- `jis_number` / `jis_title` / `edition_year` / `revision_status` / `issuing_body` / `equivalence_status` は全て空。
- 状態: `BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT`（34/34 行）
- 取得オーナー: `EXTERNAL_JIS_RESEARCH`（道示/DDB 代用禁止、ライセンス済み JSA 等の公式提供者経由のみ）

## 3. 必要アクション（人間が実施）

### 3a. 道示 R7 が引用する JIS の特定（新しい cited-JIS インベントリ）

1. 02_standard_visual_review_workbook.md の目視確認時に、各条項・表が**引用している JIS 番号**を記録する（例: 鋼材 JIS G 3106 / 3101、鉄筋 JIS G 3112、コンクリート JIS A 5308、ボルト JIS B 1180 / 1186 等を**実際に道示本文から特定**）
2. 特定結果を jis_source_register.csv の該当行（または新インベントリ）へ記入
3. 同一 JIS 番号が複数行に重複する場合は supervisor 決定で merge（重複行は両方残し、merge 記録を追加）
4. 34 行のうちどれが実在の JIS に対応するか、合成プレースホルダの後継であることを supervisor 記録で明示

### 3b. JIS 一次資料の取得

| 方法 | 可否 | 備考 |
|------|------|------|
| JSA からライセンス購入 | 推奨 | 公式一次資料 |
| 組織標準ライブラリ経由 | 推奨 | 社内ライセンス既存の場合 |
| JISC 公式サイトの標準確認 | 補助 | 標準番号・題名・制定/改正ステータスの公式メタデータ確認用 |
| JSA/公式以外の PDF ダウンロード | 禁止 | 版権・版の特定不能 |
| 道示・DDB 本文を JIS の代用 | 禁止 | DS-02 jis_version_policy.md |
| 第三者の等価性表 | 禁止 | jis_version_policy.md |

### 3c. JISC 公式メタデータの取得（採択前必須）

各 JIS について:
- 標準番号（jis_number）
- 標準題名（jis_title）
- 制定年・最新改正年・現行/廃止状態（edition_year / revision_status）

### 3d. supervisor 決定

- 道示が引用する版と JISC 現行カタログ版が異なる場合: `DEC-DS02-xxxx` または後続の supervisor 決定で `equivalence_status` と条件を記録
- それ以前は `BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT` を維持

## 4. P2 検証（Self-check）

| Check | Result |
|-------|--------|
| 正誤表 URL 到達性を確認済みと記録（HTTP 200 / 771KB） | PASS |
| 正誤表の内容抽出・適用を未実施として明記 | PASS |
| JIS 34 行が全て合成プレースホルダであることを記録 | PASS |
| 取得方法（JSA ライセンス / 組織標準ライブラリ）のみを推奨 | PASS |
| 道示・DDB・第三者等価性表による代用を禁止 | PASS |
| JISC 公式メタデータと supervisor 等価性決定の必要性を明記 | PASS |
| モデルが JIS 番号を推測・創作していない | PASS |
