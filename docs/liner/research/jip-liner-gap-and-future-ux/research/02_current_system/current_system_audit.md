# 現行システム監査（spacer-clone @ main 7b07f62）

根拠: `sources/repository`(main@7b07f623) の実コード + `docs/` の実装記録(phase4/5/6・scoping)。
分類記号: IMPLEMENTED_VERIFIED / IMPLEMENTED_PARTIAL / IMPLEMENTED_UNVERIFIED / NOT_IMPLEMENTED / PARTIAL_DEFINED_ONLY / OUT_OF_SCOPE / DEFERRED。
「現行」= lineresearch 正本(main@7b07f62)に含まれる Road モジュール。Apollo/上部工(Frame)はローカル進行中ブランチの作業であり本正本では [上流側] に記載。

## I. モジュール・ルーティング（B1）

| 項目 | 状態 | 証拠 |
|---|---|---|
| Launcher `/pro/linear-coordinate` | IMPLEMENTED_VERIFIED | LinerLauncherPage.tsx |
| GUI Editor `/pro/liner/setup` | IMPLEMENTED_VERIFIED | LinerEditPage.tsx + LinerSetupTabs |
| Importer | IMPLEMENTED_VERIFIED | importer/* |
| Preview | IMPLEMENTED_VERIFIED | LinerPreviewPage.tsx |
| Mapping Review | IMPLEMENTED_VERIFIED | LinerMappingReviewPage.tsx |
| Formal Drawing Plan/Profile/Cross | IMPLEMENTED_VERIFIED | LinerFormalDrawingWorkspacePage.tsx |
| Setup Tabs | line / station / height / vertical / crossSection / utilities / review | `uiPreparation.ts:207` |

## II. 平面線形（alignment）

| 機能 | 状態 | 証拠 |
|---|---|---|
| 直線/円弧/クロソイド/複合 | IMPLEMENTED_VERIFIED | `core/geometry/horizontal.ts`, schema types.ts |
| Offset線 | IMPLEMENTED | B2 |
| 拡幅(1次/4次) | PARTIAL_DEFINITION_ONLY | `widthChangePoints` 型のみ、実計算は widthResolution の線形幅分のみ。「型定義のみ」 |
| 接続/分岐(ランプ) | ABSENT | B2 |
| 複数線形(multi-alignment) | IMPLEMENTED_VERIFIED | P4-D01 `AlignmentBundleDraft[]`, activeAlignmentId |

## III. 測点（station）

| 機能 | 状態 |
|---|---|
| physicalDistance 累加距離 | IMPLEMENTED_VERIFIED |
| No.表記(No.XX+YY) | IMPLEMENTED_VERIFIED (`stationFormat.ts`) |
| Pitch/interval | IMPLEMENTED_VERIFIED |
| Explicit station | IMPLEMENTED_VERIFIED |
| Station equation(break) | IMPLEMENTED_VERIFIED |
| 測点有効範囲(ランプ/ブレーキ) | PARTIAL（単 alignment では活・line 範囲式） |

## IV. 縦断・横断・断面高さ

| 機能 | 状態 | 証拠 |
|---|---|---|
| 縦断 grade/parabolic | IMPLEMENTED_VERIFIED | schema/types.ts vertical |
| 横断 crossSlope(flat/one_way/crown/independent) | IMPLEMENTED_VERIFIED | CrossSlopeIntervalDraft |
| centerline elevation | IMPLEMENTED_VERIFIED | |
| Z Merge（断面高さ合成） | IMPLEMENTED_VERIFIED | `core/zMerge.ts`,`crossSectionZMerge.ts` |
| 断面高さ W/WA/WB の区別 | 現行は Z Merge 方式（JIP の W/WA/WB 3種相当を１合成に集約）。IMPLECTION POSITIVE | docs/road/design |
| ハンチ用 WG/WAG/WBG（G版高さ） | PARTIAL（HAUNCH 用 G 高さ系は JIP 型12が not supported） | validateHaunchDefinitions |

## V. 橋梁骨格（ピア・スパン）

| 項目 | 状態 | 証拠 |
|---|---|---|
| PierDraft kind(abutment/pier/virtual_pier) | IMPLEMENTED | schema/types.ts:530 |
| PierDraft skewAngleRad | IMPLEMENTED | `core/bridge/pierLineGeometry.ts` skew正規化 |
| PierDraft bearingOffsets | IMPLEMENTED | types.ts:557 |
| SpanDraft start/end physicalDistance + pierId | IMPLEMENTED | types.ts:518 |
| セクション/主桁G（横桁基準） | PARTIAL | CrossBeamDraft(physicalDistance/spanId)のみ。JIP の「セクションS×主桁G の格点」完全モデルは MeasuredGrid 経由 |
| MeasuredGrid(観測 平面×ライン 格点) | IMPLEMENTED | Phase 3.8 `MeasuredGridDraft`（実測小座標グリッド） |
| 小座標系 TRAN | 未調査→PARTIAL（現在はグローバル座標方針が主） | coordinate_system_policy.md |

## VI. LDIST / HAUNCH / HOSO

| 機能 | 状態 | 証拠 |
|---|---|---|
| LDIST 格点間距離(grid_distance) | IMPLEMENTED_VERIFIED | `core/ldist/*`, LdistJobDraft, mode_a/mode_b |
| LDIST 張出し長(overhang) | IMPLEMENTED | LdistJobKind=overhang |
| HAUNCH（native family） | IMPLEMENTED_VERIFIED | core/haunch/* families two/three/plane/range |
| HAUNCH JIP型1-17マッピング | PARTIAL | mapJipTypeToVariant: 対応{1,2,6,7,8,9,14}のみ。型3,4,5,10,11,12,13,15,16,17 を非対応/エラー |
| 型12（WG/W差分） | 明示エラー（LINER高さ必要） | validateHaunchDefinitions |
| 基準桁型(4,5,10,15) | 明示エラー（基準桁必要） | same |
| HOSO 舗装厚 | IMPLEMENTED_VERIFIED | `core/hoso/*`, families auto/longitudinal/transverse/two_point/three_point |

## VII. 図面・DXF（GDRAW相当）

| 図面 | 状態 | 証拠 |
|---|---|---|
| Plan Type A/B | IMPLEMENTED_VERIFIED | formalBuilders + golden p5-d01 |
| Profile | IMPLEMENTED_PARTIAL（バンド・地面は「データ未設定」でfail-closed） | formalBuilders profile |
| Cross Section | IMPLEMENTED_VERIFIED | |
| Band | IMPLEMENTED_PARTIAL | crossfall |
| 交角描画 | NOT_IMPLEMENTED | phase5 gap: JIP§8.6 |
| ライン/セクション寸法線(§8.8/8.9) | IMPLEMENTED_PARTIAL | Generic dimension primitives, `alignmentSegmentDimensions.ts` |
| 座標テーブル(§8.7) | IMPLEMENTED_PARTIAL | `tables/planCoordinateTable.ts` |
| DXF export | IMPLEMENTED_VERIFIED | `dxf/**`, LINE/LWPOLYLINE/ARC/TEXT, INSUNITS=6 |

## VIII. レポート・CSV・輸出・パイプライン

| 項目 | 状態 | 証拠 |
|---|---|---|
| HTML報告 + CSV(grid/ldist/haunch/hoso) | IMPLEMENTED_VERIFIED | exports/roadReport*, roadCsvExport |
| パイプライン・sourceRevision(stale) | IMPLEMENTED_VERIFIED | core/pipeline |
| 3D（STL） | IMPLEMENTED | exports/linerFrameStl (ProjectModel→STL 円柱) |
| 3D（DXF viewer） | PARTIAL | 注: Frame モデリングに変換 |
| IF3 出力契約 | IMPLEMENTED_PARTIAL | docs/road/phase6 if3、PR40/41 |

## IX. 検証基盤（この監査で重視）

| 項目 | 状態 | 所見(Phase3へ) |
|---|---|---|
| 単体テスト | 99 liner test(本正本), 計多数(P4で728) | |
| ゴールデンテスト（水平/縦断/横断） | IMPLEMENTED | `horizontalCurveGolden`等: 解析参照(Simpson積分/円弧/直線)との一致。**独立外部(JIP-LINER実出力/実設計計算例)との突合ではない** |
| Phase5 描画ゴールデン | 自己参照（goldenActivity=P5-D01前提, runtime生成から自動） | 外部JIP/実測帳票との突合ではない |
| Importer サンプル | `builtInSampleDataset.ts` に計算書PDF値の一部手記 + C1-C17/GE2 は「決定論的補間（interpolated、置換予定）」と明記 | 未置換なら数値の実証性が不足 |
| E2E | p1-d05, phase5-japanese-drawing, phase5-step3-dxf 等 24 spec | |
| 既存破壊工程 | status(3), HEAD c6e7348(共通LOCAL) | 対象外ローカル |

## X. 上部工・3D連動（概要）

- Phase4完成記録に「主桁G・横桁SはLINER骨格→Frameモデルへ変換」程度。BMV2 Phase1 のみが main に反映され、Phase2（主桁・横桁・支承）は上部工PhaseとしてBMV2文書に記載。
- `docs/bridge-modeler-v2/02_phase1_liner_bridge_interval.md`: Phase1=BridgeInterval、Phase2(girders/supports)=上部工。3Dは現行「LINER→Frame(STL/DXF)」経路。
- main@7b07f62 は Road モジュール完全だが、**上部工(主桁・横桁・床支・3D MEM)の「実装」はローカル進行中（docs/apollo-step10-p2ii-0-truth-gate）側**であり、本正本では OUT_OF_SCOPE 扱い。

## 監査サマリ（配布表）

| 評価 | 件数(代表) |
|---|---|
| IMPLEMENTED_VERIFIED | 平面線形 / 測点 / 縦断横断・断面高さ / パイプライン / LDIST / HOSO / レポート / DXF / 描画 |
| IMPLEMENTED_PARTIAL | 拡幅・幅員変化 / バンド / 寸法線 / 座標テーブル / HAUNCH JIP型 / Importer 一部 / 3D |
| DEFINITION_ONLY | 拡幅(1次/4次)・幅員変化（型定義のみ） |
| NOT_IMPLEMENTED | 接続分岐 / 交角描画 / GDRAW 追加項目 / APLINE・LTOOL・GVIEW・FOOTING・MDVIEWER・GCROSS・MDSKOUT / HAUNCH JIP型 3,4,5,10,11,12,13,15,16,17 |
| 検証欠如 | ゴールデンが外部（JIP-LINER実出力・設計計算例）との突合でない / Importer の C1-C17・GE2 補間が未置換 |

詳細は次Phase（Phase 3 ギャップ監査）で「実装状態×JIP機能」として定量化する。