# SPACER CLONE — Reference Business 001 道路線形 Sample (Lane S / S-3)

- 作成日時: 2026-08-16 (JST)
- 担当branch: `lane-s/reference-business-001`
- 上位文書: [reference-business-001-spec.md](reference-business-001-spec.md) (S-1)・[reference-business-001-gujo-baseline.md](reference-business-001-gujo-baseline.md) (S-2)
- 本稿の位置づけ: 郡上市八幡の実地形上に後続で橋梁を配置できる**道路線形 Sample** の正式確定。
  既存の道路線形エンジン / sample 形式を利用し、道路設計機能を Lane S 内で再実装しない。

> **Authority:** OPERATIONAL / LANE S
> **Status:** DECIDED (Wave 1・Sample 準備完了)

---

## 1. road sample の目的

- Reference Business 001 の主線形 (planning road) として、**長良川を横断する山岳道路**を定義する。
- 後続 S-4 でこの線形上に**橋梁候補区間** (長良川横断部) を配置するための入力とする。
- 実地形 (郡上市八幡・EPSG:6674) 上に位置づくため、架空の合成地形ではなく
  実座標系・実bounds内に配置する。
- Acceptance Sample として、road 表示 → 確認・編集 → 下流 (bridge/super/sub/analysis) への
  handoff を一貫して通せることを目指す。

## 2. 線形入力条件

| 項目 | 値 |
|---|---|
| 線形ID | `RB001-ROAD-1` |
| 線形名 | 郡上市八幡 山岳道路 (長良川横断) |
| linerModelId | `MODEL-RB001` |
| coordinatePolicyId | `COORD-JGD2011` (EPSG:6674 平面直角第7系) |
| 形式 | 既存 `RoadReferenceSample` 互換 + bridgeCandidate 拡張 |
| 作成方法 | 既存コア geometry エンジン (`evaluateElementEndState`) による chaining (C0/C1 continuity) |
| 検証 | 既存 `validateAlignment` で C0/C1 連続性を機械検証 |

## 3. 起終点

| 項目 | 値 (EPSG:6674) | 備考 |
|---|---|---|
| 起点 | (85,000.0, -26,900.0) | 郡上市八幡盆地西側 |
| 終点 | 自動計算 (S2 終端) | 盆地東側 |
| 起点方位角 | 0 rad (東向き) | — |

## 4. 概略延長

- **約 2,450 m** (S1 900 + C1 100 + A1 250 + C2 100 + S2 1100)

## 5. 平面線形

| 要素 | ID | 種別 | 長さ (m) | 備考 |
|---|---|---|---|---|
| S1 | straight | 900 | 起点からの直線 (盆地西側) |
| C1 | clothoid | 100 | A=150・R∞→400・右曲り |
| A1 | arc | 250 | R=400・右曲り |
| C2 | clothoid | 100 | A=150・R400→∞・右曲り |
| S2 | straight | 1100 | 盆地東側へ直線 |

- 実座標 (start/azimuth) はコアエンジンで chaining し、手計算座標を使わない。
- `validateAlignment` (C0/C1) PASS を test で保証。

## 6. 縦断線形

| 要素 | ID | 種別 | 区間 (m) | 勾配 | 標高 (m) |
|---|---|---|---|---|---|
| G1 | grade | 0〜1000 | -2.0% | 330 → 310 |
| P1 | parabolic | 1000〜1200 | -2.0% → +1.5% | 310 → 309 |
| G2 | grade | 1200〜2450 | +1.5% | 309 → ~327 |

- 盆地西側から長良川方向へ緩やかに下り、河川横断後に東側へ緩やかに登る。
- 標高帯は郡上市八幡 baseline の盆地床 (約 200〜400m) に整合。
- 実際の ground elevation との照合は、実測 DEM (Lane T) 取得後に S-4 以降で実施する。

## 7. 横断条件

| 項目 | 値 |
|---|---|
| 標準断面ID | `XS-RB001` |
| 構成 | 左路肩 (-4.5) / 左車線 (-3.0) / 中心 (0) / 右車線 (+3.0) / 右路肩 (+4.5) |
| 横断勾配 | right_down_positive・2% |
| 用途 | 道路予備設計相当 (2車線山岳道路) |

## 8. 幅員

- **9.0 m** (車道 3.0m×2 + 路肩 1.5m×2)
- widthChangePoints: 全区間一定 (0 / 1200 / 2450 で 4.5/4.5)

## 9. 橋梁候補区間

| 項目 | 値 |
|---|---|
| 区間 (station) | **1200.0 〜 1500.0 m** |
| 想定支間 | 50 m 級 (S-4 で支間割・橋梁形式を確定) |
| 位置 | 長良川横断部 (縦断 P1〜G2 の凹部付近) |
| 備考 | 実測DEM (Lane T) との照合を S-4 で実施 |

## 10. terrain との位置関係

- 郡上市八幡 baseline (S-2) の bounds 内に完全に収まる:
  - X 83,996〜89,050 / Y -29,697〜-24,665
- 起点・橋梁候補区間の中点が bounds 内であることを test で保証。
- 盆地床の標高帯 (約 200〜400m) に沿った縦断とし、山稜部 (500〜1200m) には入らない。

## 11. road sample データ格納方針

| 場所 | 内容 | 状態 |
|---|---|---|
| `frontend/src/liner/samples/reference-business-001/roadAlignment.ts` | 線形 fixture (TS) | 新規 (Wave 1) |
| 同上 `__tests__/roadAlignment.test.ts` | targeted validation | 新規 (Wave 1) |
| `docs/development/reference-business-001-road-sample.md` | 本稿 | 新規 (Wave 1) |

- 形式は既存 `RoadReferenceSample` (road module) と互換の shape で、`bridgeCandidate` を拡張。
- 線形の組立は既存コア engine を利用 (再実装なし)。
- 将来、`LinerDomainDraftVNext` / `CanonicalRoadData` 形式への正規化は
  既存 road module の migration 経路 (`ensureRoadData`) を通して行う。

## 12. expected visualization

| 表示 | 期待 |
|---|---|
| 平面線形 | 盆地西→東へ 2,450m の緩やかな曲線 (右曲り) が実地形上に描画される |
| 縦断 | 河川横断部で凹、前後で緩勾配 (G1→P1→G2) |
| 横断 | 2車線+路肩の標準断面が全区間で適用 |
| 橋梁候補区間 | STA.1200〜1500 がハイライト表示される (S-4 で Bridge Layout へ接続) |
| terrain | EPSG:6674 実地形 (DEM5A) 上に道路が重畳表示される (Lane T/V の成果と接続) |

## 13. 検証結果 (Wave 1)

- `vitest run src/liner/samples/reference-business-001/__tests__/roadAlignment.test.ts`
  → **7 passed** (C0/C1 連続性・全長・bounds内・橋梁候補区間・縦断・横断・shape)
- typecheck / build は該当変更後の全体 Gate で確認 (Section: 変更ファイル参照)。

## Related Documents

- [reference-business-001-spec.md](reference-business-001-spec.md) — S-1 仕様
- [reference-business-001-gujo-baseline.md](reference-business-001-gujo-baseline.md) — S-2 郡上市八幡 Baseline
- [reference-business-001-acceptance-scenario.md](reference-business-001-acceptance-scenario.md) — 最終受入シナリオ