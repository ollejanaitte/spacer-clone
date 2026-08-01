# Stage 1 Manual Inventory Report

## Verdict

```text
APOLLO_STAGE1_MANUAL_INVENTORY_VERDICT: COMPLETE
```

## Evidence

1. Manual ID を相対パス昇順で `MAN-001`〜`MAN-065` に採番した（65件、欠番なし）。
   出典: `inventory/manual_catalog.csv`

2. 製品・モジュール・橋種・文書種別を、主にパス構造から分類した（`classification_basis=path_plus_head_text` またはスタブ時 path_only）。
   - 非合成鈑桁: MAN-001〜014
   - SuperDesigner 総論: MAN-021
   - 単体 Section/Splice: MAN-061〜063
   等

3. ページ数は Stage 0 `pdf_metadata.csv` を継承。合計 1121 ページ。

4. 先頭最大5ページのテキストから title / toc_summary /（可能な場合）edition・issue_date を抽出。
   - toc 既知: 63/65
   - issue_date 既知: 8/65
   - edition 既知: 2/65（MAN-032, MAN-050 の「第１版発行」）

5. Phase 1 関連度:
   - high: 18（非合成鈑桁14 + SuperDesigner1 + Section2 + Splice1）
   - medium: 1（PcSlab）
   - low: 46

6. 調査優先度 P0=18, P1=1, P2=8, P3=38

7. 完全一致重複は Stage 0 で 0。Section の MAN-061/062 は同モジュール候補だが版関係は UNKNOWN。

8. 非合成鈑桁は MAN-001 を目次冊、MAN-002〜014 を章分冊とする関係が表紙章名から確認できる。

## Interpretation

- Phase 1（非合成 RC 床版鋼鈑桁）の一次資料は high 群 18 冊で足りる見込み。
- 箱桁・鋼床版・合成系は対照・将来用として catalog に残す。
- 単体 Section / Splice は分冊の断面・添接章と機能領域が重なるため、Stage 4 で相互参照が必要。

## Unknown / Blocking

| ID | 内容 | Blocking? |
|---|---|---|
| U-S1-001 | 大多数の分冊で edition / issue_date が先頭5ページに無し | No |
| U-S1-002 | MAN-061 と MAN-062 の新旧関係未確定 | No（Stage4で改訂履歴読取） |
| U-S1-003 | MAN-039 / MAN-040 は head に目次節なし | No |
| U-S1-004 | 鋼床版箱桁 MAN-052〜059 の目次冊特定は追加確認余地 | No |
| U-S1-005 | 非 PDF `計算書例(添接計算).doc` の扱い未決 | No |

Blocking Unknown は無し。

## 成果物

| ファイル | 説明 |
|---|---|
| `inventory/manual_catalog.csv` | 正式カタログ |
| `inventory/manual_catalog.md` | 人間可読要約 |
| `inventory/revision_matrix.md` | 版・重複候補 |
| `inventory/manual_relationships.md` | シリーズ関係 |
| `summaries/phase1_relevant_manuals.md` | Phase1 関連一覧 |
| `logs/stage1_execution_log.md` | 実行ログ |
| `summaries/stage1_manual_inventory_report.md` | 本レポート |

## 原本保全確認

変更なし（baseline 差分 0）。

## Stage 1 完了条件チェック

| 条件 | 結果 |
|---|---|
| Manual ID | OK |
| 製品 / モジュール / 橋種 / 文書種別 | OK（パス根拠、不明は UNKNOWN） |
| 版 / 発行日 | OK（判明分を記録、他は UNKNOWN） |
| ページ数 | OK |
| 目次 | OK（63/65、残り UNKNOWN） |
| Phase1 関連度 / 優先度 | OK |
| 重複・新旧候補 | OK（revision_matrix） |
| 調査状態 | OK |
| 必須成果物 | OK |

## 次 Stage

Stage 2（システム構造: Align / Analyzer / SuperDesigner / SuperDrawing / y-Mater / 単体の責務とデータ連携）へ進める。
