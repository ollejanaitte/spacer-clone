# Stage 2 System Structure Report

## Verdict

```text
APOLLO_STAGE2_SYSTEM_STRUCTURE_VERDICT: COMPLETE
```

## Evidence（要約）

1. APOLLO 主要サブシステムは Align / Analyzer / SuperDesigner / SuperDrawing / y-Mater（+ MS-Office/AutoCAD）（MAN-021 p.7）。
2. サブシステム間はデータリンクされる（同）。
3. SuperDesigner は MS-Access 設計DB中心、計算書は RTF（MAN-021 p.8）。
4. SuperDrawing は工事名．ｍｄｂを読み、DWG または GSP を扱い、NPDATA.txt を y-Mater へ渡せる（MAN-021 §2-3）。
5. Align 線形データ拡張子は．ａｌｇ（MAN-021 p.12）。
6. 工事フォルダに Align / Design / Draw（MAN-021 p.27）。
7. 設計単体 15 プログラム名が一覧化（MAN-021 p.23）。
8. 非合成鈑桁コントロールの処理ボタンと格子解析→断面力変換が MAN-002/007 で確認。
9. Section / Splice の単独入出力（RTF、.spl 等）が MAN-061/063 で確認。

## Interpretation

- Phase1 は Align〜SuperDesigner〜Analyzer 断面力〜Slab/Girder/Section/Splice/床組系が中核。
- SuperDrawing / y-Mater は成果物後段。
- UI 推奨順は依存関係の近似に過ぎない。

## Unknown / Blocking

`features/unresolved_system_structure.md` 参照。
Stage 2 完了を阻む Blocking Unknown はなし（形式不明は明示済）。

## 完了条件チェック

| 条件 | 結果 |
|---|---|
| 主要サブシステム一覧 | OK |
| 責務が Evidence 付き | OK（catalog + overview） |
| SuperDesigner 内部プログラム整理 | OK（15 + 非合成ボタン） |
| 主要処理順序 | OK（processing_sequence） |
| 入出力・ファイル形式 | OK（data_exchange） |
| 確認済みと推定の分離 | OK |
| Phase1 必要構成 | OK（overview §8） |
| 不明連携一覧 | OK（unresolved） |
| MiMo 検収 | OK |
| 原本未変更 | OK（要最終確認） |
| 既存 OSS 未変更 | OK（未接触） |

## 次 Stage

Stage 3（Phase 1 資料選定）へ進める。本セッションでは Stage 3 に着手しない。
