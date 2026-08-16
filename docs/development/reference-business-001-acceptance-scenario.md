# SPACER CLONE — Reference Business 001 最終受入シナリオ (Lane S / S-1 付属)

- 作成日時: 2026-08-16 (JST)
- 担当branch: `lane-s/reference-business-001`
- 上位文書: [reference-business-001-spec.md](reference-business-001-spec.md) (S-1)
- 本稿の位置づけ: Reference Business 001 を **Acceptance Sample** として受け入れる最終シナリオの正式化。
  Wave 1 では文書化のみ (実行は S-4〜S-12 で該当 Lane の成果が揃った後に実施)。

> **Authority:** OPERATIONAL / LANE S
> **Status:** DECIDED (Wave 1・文書化)

---

## 1. 最終 Acceptance 想定

Reference Business 001 は「完成品の受入試験」であり、以下の 13 ステップを
SPACER CLONE だけで体験できることを最終受入条件とする。

1. **sample選択** — Reference Business 001 を業務一覧 / サンプル入口から選択
2. **Project load** — 完成版サンプル業務 (.spacerproj / project.json) を読み込む
3. **terrain表示** — 国土地理院実地形 (郡上市八幡・EPSG:6674) が表示される
4. **road表示** — 道路線形 (平面・縦断・横断) が表示・確認できる
5. **bridge表示** — 橋梁配置 (橋梁区間・支間割・支持点) が表示・確認できる
6. **superstructure表示** — 上部工 (主桁・断面・支承) が確認できる
7. **substructure表示** — 下部工 (橋台・橋脚) が確認できる
8. **analysis結果確認** — 構造解析結果 (Reaction / N-Q-M / Deformed) を確認できる
9. **integrated 3D** — 統合3D / CIM が表示できる
10. **Save** — 保存する (Auto Save / 明示 Save)
11. **Close** — 終了する
12. **Reopen** — 再起動して再読込する
13. **同一状態復元** — 保存前と同じ業務状態 (各 module canonical checksum 一致) が復元される

## 2. 各ステップの受入条件

| Step | 受入条件 | 判定方法 |
|---|---|---|
| 1 sample選択 | 業務一覧に Reference Business 001 が存在し、選択できる | UI操作 / E2E |
| 2 Project load | 読み込み成功・エラーなし | E2E / 手動 |
| 3 terrain表示 | 郡上市八幡の実地形 (DEM5A) が 3D に表示される | 画面確認 / E2E |
| 4 road表示 | 道路線形 (2,450m) が実地形上に表示・編集できる | 画面確認 / E2E |
| 5 bridge表示 | 橋梁候補区間 (STA.1200〜1500) に Bridge Layout が配置・確認できる | 画面確認 / E2E |
| 6 superstructure表示 | 上部工が表示・確認できる | 画面確認 |
| 7 substructure表示 | 下部工が表示・確認できる | 画面確認 |
| 8 analysis結果確認 | Solver SUCCEEDED・IF3 authoritative・結果表示 | E2E / 数値照合 |
| 9 integrated 3D | 統合シーン・GLB export ができる | 画面確認 / E2E |
| 10 Save | 保存成功 (canonical) | E2E |
| 11 Close | 正常終了 | E2E |
| 12 Reopen | restart → restoreFromPersistence 成功 | E2E |
| 13 同一状態復元 | 全 module canonical checksum 一致・成果品再生成一致 | E2E / checksum 照合 |

## 3. 数値 oracle (S-4 以降で固定)

- Reference Business 001 固有の oracle は S-4 以降で確定する (解析・数量・座標)。
- 方式は既存 `Phase10_Reference_NumberOracle.json` の方式 (row 別 absTol/relTol・coverage 契約) に準拠する。
- Wave 1 では oracle の枠組みのみ固定し、数値は作り込まない。

## 4. 決定性・再現

- 保存 → 再読込で同一状態を復元することを canonical checksum 一致で機械判定。
- 可変メタデータ (時刻等) は決定論判定から除外。
- 成果品は canonical から derived 再生成 (dual-write 禁止)。

## 5. FROZEN 境界

- 全ステップで NOT_AUTHORIZED / HOLD / DEFER を守る。値を発明しない。

## 6. 実行条件 (このシナリオを実行可能にするため)

- Lane T: 郡上市八幡 terrain baseline (実データ) の提供
- Lane B: site-context → SPACER mapping の提供
- Lane A: .spacerproj / project.json roundtrip の提供
- Lane V: 統合 3D Layer Contract の提供
- Lane U: 「Reference Business 001 を開く」入口の提供

## Related Documents

- [reference-business-001-spec.md](reference-business-001-spec.md) — S-1 仕様
- [reference-business-001-tutorial-samples.md](reference-business-001-tutorial-samples.md) — Tutorial Sample 区別
- [reference-business-001-lane-handoffs.md](reference-business-001-lane-handoffs.md) — Lane A/B/T/V/U への要求・引渡し