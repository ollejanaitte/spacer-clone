# 09 — Phase 2 Recommendation

> **Authority:** PHASE 1 INVESTIGATION RECORD (documentation-only)
> **目的:** Phase 1 調査結果に基づき、**実装フェーズ（STEP 9 Phase 5/6+）の着手順序**を推奨する。Phase 1 自体の実装は行わない。
> **現 HEAD:** `db93462`（local==origin/main，clean）

## 1. Phase 1 ステータス

| 項目 | 結果 |
|------|------|
| 範囲 | documentation-only investigation |
| 実装変更 | なし |
| 数値追加 | なし |
| 解析変更 | なし |
| UI変更 | なし |
| PDF出力実装 | なし |
| 成果物 | `01`〜`08` + `evidence_matrix.csv` + `completion_report`（作成予定） |
| 作業整合 | local==origin/main，clean — 毎コミット push 済 |

## 2. 確定見通し（Phase 1 確定事項）

1. **幾何層は実装済み**: `BridgeSystem.CONTINUOUS` 入力 → BSDD (`spanSystem="continuous"`, pier support, `designStatus=NOT_AUTHORIZED`) → 3D solids → binary STL → save/reload + STALE gate。テスト #1〜#8 でカバー。
2. **計算書の本体は未実装**: ReportModel は `bridgeSystem` を CH-DESIGN-COND に 1 フィールド表示するだけ。解析結果章（CH-REACTIONS/SHEAR/MOMENT/DEFLECTION）はコードリテラル `NOT_AVAILABLE`。CH-SECTION も `spanLength===null` ガードで CONTINUOUS は `NOT_AVAILABLE`。
3. **正式 PDF は Rejected**: `assertFormalReportRejected`、bundle manifest `unsupportedScope: ["curve/skew/continuous design drawings", "formal authorization"]`。
4. **数値境界は BLOCKED**: DS-09 全セル `NOT_AUTHORIZED`, `GATE-NR-01..05 BLOCKED`。unitWeight ADOPTED はランタイム fail-closed（NOT_SELECTED）。
5. **命名衝突**: `phase1ScopeGuard`（AP00 `Phase1SpanSystem.CONTINUOUS`） ≠ 実装 `BridgeSystem.CONTINUOUS` → H-01/H-02/H-03 は **AP-01/AP-02 調整要請**。

## 3. 推奨フェーズ着順

### 3-1. 前提（dependency）
```
analysis result  ──(G-01/G-04)──> ReportModel binding  ──(G-01)──> formal report/PDF (G-05)
        ↑                                                       │
   (G-03 continuous analysis)                               (G-06 drawing)
```
解析結果が ReportModel にバインドされない限り、**正式計算書（reactions/shear/moment/deflection/moment-redistribution）は空**。したがって **解析（Phase 5）→ 計算書（Phase 6） の順**が自然な依存順序。

### 3-2. 推奨順序

| 順序 | フェーズ | 作業 | 対応ギャップ | 備考 |
|------|----------|------|--------------|------|
| 0 | AP-01/AP-02 (architect) | **H-01/H-02/H-03 解決** (phase1ScopeGuard vs BridgeSystem naming; AP-02 migration reconcile) | G-11, G-12 | **architect 判断必須。実装着手前に解決必須** |
| 1 | STEP 9 **Phase 5** (Analysis) | `BridgeSystem.CONTINUOUS` → FEM解析器バインド (`appurtenanceHaunchAnalysisAdapter.ts:385` 理想化廃止) + pier反力/固定ピンクモーメント分布実装 + test (G-08) | G-03, G-08 | `backend/engine/bridge_fem_generator.py` 拡張 or frontend→backend解析API new route |
| 2 | STEP 9 **Phase 6** (Report/PDF) | ReportModel に `analysisResult`→chapter バインド (G-01/G-04); CH-SECTION spanLengthガード分離 (G-02); formal PDF engine実装 (G-05); continuous drawing template (G-06) | G-01, G-02, G-04, G-05, G-06 | `reportModel.ts:109`, `reportExport.ts:66`, `artifactBundle.ts:235` |
| 3 | STEP 9 **Phase 6** (Tests) | `reportModel`/`outputIntegration`/`quantityModel` に CONTINUOUS テスト追加 (G-07) | G-07 | 既存 SIMPLE_SINGLE test を parametrize で CONTINUOUS 追加 |
| 4 | STEP 9 **Phase 6+** (Gate) | DS-09 GATE-NR-01..05 ブロッカー解除 + `DEC-PHA-xxxx` セル GRATED; standard-selection UI (TargetStandardStatus.SELECTED) で ADOPTED アンロック (G-10) | G-09, G-10 | ゲート解放は独立ガバナンスレビュー (NR-06) と連動 |

> **順序の必然:** (0) 命名/仕様整理なしに (1)〜(3) は `BridgeSystem` vs `Phase1SpanSystem` の二重管理が混乱する。(1)解析なしに (2)計算書は空のまま。(4)gate は (1)〜(3) 実装前にも `NOT_AUTHORIZED` のままで安全。

## 4. 推奨実装の最小着手点（Phase 2 Week 1 用予定）

| 実装 | 最小変更 | テスト証明 | 依存 |
|------|----------|------------|------|
| G-01 ReportModel binding | `buildReportModel` に `analysisResult` を受け取って CH-REACTIONS へ反映 | continuous ReportModel test (G-07) | Phase 5 analysis |
| G-02 CH-SECTION gate | `spanLength` ガードから `crossSectionInputs` に分離 | section calc test |なし |
| G-08 adapter test | `appurtenanceHaunchAnalysisAdapter` idealization 分岐の snapshot test | adapter test |なし (idealization維持でテスト可能) |
| G-07 test parity | `reportModel.test.ts` `generatedProject()` を parametrize(SIMPLE|CONTINUOUS) | — | G-01実装後（NOT_AVAILABLE 維持検証） |

> ■ **注意:** G-01/G-02 は「devのまま NOT_AVAILABLE を維持」でもテスト可能。formal PDF (G-05)と gate (G-09/G-10) は**実装後も `NOT_AUTHORIZED`/`PROHIBITED` ゆるまない限り** dev bundle にのみ出現。数値は `NOT_GRANTED` のままで安全。

## 5. 推奨検証コマンド (Phase 2 着手前のベースライン)

```bash
cd frontend
npm run test:all -- src/apollo/__tests__/continuousGirderLayout.test.ts \
                   src/apollo/__tests__/continuousGirderSample.test.ts \
                   src/apollo/__tests__/continuousGirderVisualization.test.ts \
                   src/apollo/__tests__/bridgeStructureWorkflow.test.ts \
                   src/apollo/__tests__/bridgeStructureQuantities.test.ts \
                   src/apollo/__tests__/reportModel.test.ts \
                   src/apollo/__tests__/outputIntegration.test.ts \
                   src/apollo/__tests__/quantityModel.test.ts \
                   src/apollo/__tests__/adoption.test.ts
npm run typecheck
npm run lint
```
> ※ `npm --prefix frontend run test:all` がベース。suite フィルタは vitest 引数で指定。Phase 1 では**実行・変更しない**（記録のみ）。

## 6. 結論

- **Phase 1 は完結**（すべて documentation-only, main-branch-direct, micro-commit + push）。
- **Phase 2 の推奨着手順序:** (0) AP-01/02 naming+ migration reconcile → (1) STEP 9 Phase 5 continuous analysis → (2) Phase 6 ReportModel binding + formal PDF + continuous drawings → (3) test parity → (4) DS-09 gate 解放。
- **安全境界:** Phase 2 実装中も `NOT_AUTHORIZED`/`NOT_GRANTED`/`PROHIBITED`/`NOT_AVAILABLE` を維持すること。数値ゲート未解放時は dev bundle (`UNVERIFIED DEVELOPMENT OUTPUT`) にとどめ、formal PDF/report を絶対に `assertFormalReportRejected` のままにする。

**Next:** `evidence_matrix.csv` → `completion_report.md`.
