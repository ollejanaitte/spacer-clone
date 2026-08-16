# SPACER CLONE — Reference Business 001 Lane A/B/T/V/U への要求・引渡し (Lane S / S-1 付属)

- 作成日時: 2026-08-16 (JST)
- 担当branch: `lane-s/reference-business-001`
- 上位文書: [reference-business-001-spec.md](reference-business-001-spec.md) (S-1)・[parallel-lanes-wave0-readiness.md](parallel-lanes-wave0-readiness.md)
- 本稿の位置づけ: Reference Business 001 の完成に必要な**他 Lane への要求・引渡し事項**。
  Wave 1 では文書化のみ (要求の受領・実装は各 Lane)。

> **Authority:** OPERATIONAL / LANE S
> **Status:** DECIDED (Wave 1・要求提示)

---

## 1. Lane A へ (Persistence / ProjectModel / Schema)

| 要求 | 内容 | 依存する Reference Business 部分 |
|---|---|---|
| sample Project 保存 field | Reference Business 001 を .spacerproj / project.json で保存できること | Save / Load / Reopen (Step 10〜13) |
| fixture 用 Persistence 要件 | fixture import の atomic 性・canonical checksum・provenance | 最終受入シナリオ |
| Schema drift 許可 | Sample / fixture が公式 Schema と整合すること (drift guard green) | 全 module |

## 2. Lane B へ (site-context → SPACER mapping / Adapter)

| 要求 | 内容 | 依存する Reference Business 部分 |
|---|---|---|
| 郡上市八幡 import | site-context の郡上市八幡 (EPSG:6674) を SPACER へ import できること | terrain 表示 (Step 3) |
| sample metadata | site-context source metadata (sourceDatasets / provenance) が SPACER metadata へ格納されること | terrain / save / reopen |
| Adapter Contract | 既存 `mappingManifest.ts` の 8 概念 mapping が機能すること | terrain 統合 |

## 3. Lane T へ (Terrain / CRS / GSI DEM)

| 要求 | 内容 | 依存する Reference Business 部分 |
|---|---|---|
| terrain baseline | 郡上市八幡 baseline (S-2) の利用条件 (EPSG:6674・bounds・DEM5A・cellSize 5m) を fixture 化 | terrain 表示 (Step 3) |
| CRS | EPSG:6674 (第7系) の正本表記統一 (site-context `transform.ts` の zone 表記揺れ解消) | 座標整合 |
| bounds / origin | TerrainDocument の bounds / origin を実際の DEM から確定 | terrain 表示 |
| fixture / reproducibility | 郡上市八幡 terrain を決定論的に再現可能な fixture として提供 | Save / Reopen (Step 13) |
| GSI DEM PORT | DEM5A 取得 → Heightfield → SCT1 保存経路の PORT | terrain 表示 |

## 4. Lane V へ (Unified 3D Viewer)

| 要求 | 内容 | 依存する Reference Business 部分 |
|---|---|---|
| Layer Contract | terrain / road / bridge / superstructure / substructure を表示する Layer 契約 | integrated 3D (Step 9) |
| camera / visibility | 全景・橋梁区間・路面追従・谷俯瞰 の camera preset・visibility | 表示体験 |
| integrated view | 統合 3D シーン + GLB export | CIM-01/02 |

## 5. Lane U へ (Canonical Workflow / App Shell)

| 要求 | 内容 | 依存する Reference Business 部分 |
|---|---|---|
| 「Reference Business 001 を開く」入口 | 業務一覧 / サンプル入口から Reference Business 001 を選択できること | sample選択 (Step 1) |
| sample から workflow 開始する導線 | sample 選択後に canonical workflow が開始されること | 全ステップ |

## 6. Lane S が提供するもの (引渡し側)

| 成果物 | 内容 |
|---|---|
| Sample 仕様 | [reference-business-001-spec.md](reference-business-001-spec.md) |
| Baseline | [reference-business-001-gujo-baseline.md](reference-business-001-gujo-baseline.md) |
| Road Sample | [reference-business-001-road-sample.md](reference-business-001-road-sample.md) + fixture |
| Acceptance シナリオ | [reference-business-001-acceptance-scenario.md](reference-business-001-acceptance-scenario.md) |
| 完成プロジェクト組立 | S-4 以降で実施 |

## Related Documents

- [reference-business-001-spec.md](reference-business-001-spec.md) — S-1 仕様
- [parallel-lanes-wave0-readiness.md](parallel-lanes-wave0-readiness.md) — Lane 間 I/F・Conflict Ownership