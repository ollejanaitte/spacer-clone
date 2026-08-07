# Phase C1 Milestone 1 統合検証結果（M1 Gate Results）

実施日時: 2026-08-08
対象: Phase C1 Milestone 1（基盤） — 下部工 データモデル〜2D平面投影 の統合パイプライン
方法: `frontend/src/substructure/__tests__/m1Integration.test.ts` のゴールデンパイプライン実行（モデル→バリデーション→配置→3Dジオメトリ→2D投影）+ 全リグレッション
正本: substructure-planning/docs/phase-c1/（P00〜P04 Freeze）

## 1. 総括

| カテゴリ | 結果 |
|---|---|
| M1 Gate 全項目 | 17/17 PASS |
| substructure 単体 | 8ファイル / 70テスト PASS |
| 全体リグレッション | 338ファイル / 2658テスト PASS |
| 型チェック (tsc) | PASS |
| ビルド (vite) | PASS |
| ソースハイジーン | PASS |
| GitHub CI | 未設定（repo に workflow なし） |

## 2. M1 Gate 検証結果

| gate | 検証内容 | 結果 | 根拠 |
|---|---|---|---|
| M1_DATA_MODEL | 下部工データモデル (I01) が全形式を表現 | PASS | model.ts / m1Integration golden |
| M1_SCHEMA | substructure v0.2.0 スキーマ + project.schema 互換 | PASS | projectSchemaRegression 3件 |
| M1_VALIDATION | golden プロジェクトが fatal-free | PASS | validateSubstructureProject=0 issues |
| M1_PLACEMENT | liner / direct_xyz + skew 配置 | PASS | computeAllPlacements（全6支点 snapshot 生成） |
| M1_ABUTMENT_GEOMETRY | 逆T式・ラーメン式 橋台ソリッド | PASS | A1/A2 backwall+wing+footing+pile |
| M1_PIER_GEOMETRY | 単柱矩形・壁式 橋脚ソリッド | PASS | P1/P2 column+cap |
| M1_PORTAL_PIER | 門型 2柱+横梁 | PASS | P3-COLUMN-01/02 + P3-BEAM |
| M1_FOUNDATION_GEOMETRY | フーチング + 杭ソリッド | PASS | footing box + pile cylinders |
| M1_BORED_PILE | 場所打ち杭 円柱ソリッド | PASS | material=foundation.boredPile |
| M1_STEEL_PIPE_PILE | 鋼管杭 円柱ソリッド | PASS | material=foundation.steelPile |
| M1_PLAN_PROJECTION | 2D平面投影（polygon/circle/line/text/center） | PASS | projectAll + sourceObjectId parity |
| M1_STABLE_ID | 安定ID + 決定性 | PASS | A1-PILE-01等 + 再生成一致 |
| M1_GOLDEN_CASES | 直橋/斜橋/全形式ゴールデンパイプライン | PASS | 6支点 golden 11テスト |
| M1_BACKWARD_COMPATIBILITY | 既存 project.json 互換 | PASS | projectSchemaRegression |
| M1_REGRESSION | 既存全テストPASS | PASS | 338ファイル / 2658テスト |
| M1_BUILD | tsc + vite build | PASS | npm run build 成功 |
| M1_CI | GitHub CI | N/A* | repo に workflow 未設定 |

*M1_CI: 対象 repo は GitHub Actions workflow を持たないため、CI ゲートは未設定。全チェックはローカルで実施・記録。

## 3. ゴールデンケース（6支点）

| supportId | 形式 | 斜角 | 構成要素 |
|---|---|---|---|
| A1 | 橋台 逆T式 | 0 | backwall + wingL/R + footing + bored pile |
| A2 | 橋台 ラーメン式 | 0 | backwall + wingL/R + footing + steel pipe pile |
| P1 | 橋脚 単柱矩形 | 0 | column + cap + footing |
| P2 | 橋脚 壁式 | 0 | column + cap + footing |
| P3 | 橋脚 門型 | 0 | column×2 + beam + footing |
| A3 | 橋台 逆T式 | 0.1745 rad | backwall + wingL/R + footing + bored pile |

## 4. 判定

- 全 M1 Gate 項目 PASS（M1_CI のみ N/A として記録）
- PHASE_C1_MILESTONE1_COMPLETE: YES

## 5. 備考

- Gate 定義 CSV（PHASE_C1_COMPLETION_GATE.csv）は Phase C1 全体の Gate 定義であり、実行結果の PASS/FAIL は本ファイルにのみ記録する（Gate 定義 CSV へは混在させない）。
- final_report.txt は本結果に基づき更新済み。
