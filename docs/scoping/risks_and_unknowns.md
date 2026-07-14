# リスク・未知事項

**Generated**: 2026-07-15  
**Git HEAD**: `fd21e30`

---

## P0 リスク

| # | リスク | 根拠 |
|---|--------|------|
| 1 | **座標規約の不一致**: LINER ↔ FEM ↔ Viewer 間で座標変換が複雑。Legacy FEM は z=0 固定。Viewer swap は display-only。E2E で数値整合が未確認 | `bridge_fem_generator.py:167`, `coordinateTransform.ts:66-98` |
| 2 | **Legacy deep-link redirect が壊れている**: `/th/run`, `/compare` は直接アクセスで `<LobbyApp/>` が表示される。`redirectLegacyRoutes()` は `<App/>` 内にあり、到達不可能 | `main.tsx:30-33`, `App.tsx:92`, `routeRedirect.ts:1-21` |

---

## P1 リスク

| # | リスク | 根拠 |
|---|--------|------|
| 3 | **三重モデル**: BridgeProject / BridgeDefinition / ProjectModel が同一概念を別に保持。重複が顕著 | A4_product_boundary.md |
| 4 | **解析結果の非永続**: static/eigen/spectrum/influence/movingLoad の結果は React state のみ。リロードで消失。autosave = false | `App.tsx:89`, `types.ts:189-191` |
| 5 | **springs / release / static combinations が ABSENT**: `Support` は DOF boolean のみ。ばね定数・端部リリース・静的荷重組合せの概念なし | `model.py` grep 0 matches |
| 6 | **INFLOAD は MVP のみ**: singlePoint のみ。車線配置・L/T荷重・フル INFLOAD は未実装 | `moving_load.py:88` |
| 7 | **CONTROL orchestration が PARTIAL**: cancel/progress/history/stale UI が全て ABSENT | `App.tsx:120`, `Toolbar.tsx` |

---

## P2 リスク

| # | リスク | 根拠 |
|---|--------|------|
| 8 | **道路側機能の未実装**: LDIST / HAUNCH / HOSO / TOOL が全て ABSENT | Stage 4 B7-B8 |
| 9 | **PDF に influence/movingLoad セクションが欠落**: CSV は全対応だが PDF は partial | `resultPdfReport.ts` |
| 10 | **BridgeDefinition feature flag の将来**: `VITE_USE_BRIDGE_DEFINITION_STRUCTURAL_MODEL` のデフォルトが false。legacy path が主要経路 | `featureFlags.ts:3-6` |
| 11 | **importer storage/recovery のテスト不足**: `importerStorage.ts`, `recoveryManager.ts` に直接の単体テストなし | Stage 4 B11 |
| 12 | **LibreCAD GUI 視覚検証が未実施**: DXF roundtrip は PASS だが、意図描画確認は手動残存 | A3_dxf_runtime_smoke.md |

---

## 未知事項

| # | 未知事項 | 優先度 | 状態 |
|---|----------|--------|------|
| 1 | LINER → FEM → Viewer の完全な非対称 E2E 数値チェーン | P0 | BLOCKED |
| 2 | localStorage swap 状態のブラウザ内実行検証 | P1 | BLOCKED（Playwright/Puppeteer必要） |
| 3 | BridgeDefinition flag の本番デフォルト値 | P1 | UNKNOWN |
| 4 | 大規模結果の本番環境でのサイズ制限 | P2 | UNKNOWN |
| 5 | hidden spring/combination スキーマの有無 | P1 | 検索済み→ABSENT と判定 |
| 6 | Full LINER pipeline の非対称入力実行 | P0 | BLOCKED（完全実行環境必要） |
| 7 | Three.js WebGL 出力の検証 | P2 | BLOCKED（Node.js 環境制約） |

---

## PART_A_GATE: CONDITIONAL

| 項目 | 判定 | 理由 |
|------|------|------|
| A1 非対称座標 | PARTIAL | swap/sign flip は検証済み。E2E 未確認 |
| A2 legacy redirect | **FAIL** | redirect 機能が architecturally unreachable |
| A3 DXF smoke | PASS | vitest roundtrip 全通過 |
| A4 product boundary | PASS/PARTIAL | 境界表は完成。重複あり |
