# Phase 4.5 Step 8.4-8.8 Rescope Quality Review

## Review Metadata

- initial file path: `/home/masaharu/Projects/spacer-clone/docs/liner/phase4.5/scope/step8_4_to_8_8_rescope_initial_20260711-211101.md`
- initial stderr path: `/home/masaharu/Projects/spacer-clone/docs/liner/phase4.5/scope/step8_4_to_8_8_rescope_initial_20260711-211101.stderr.txt`
- initial exit code: 0
- initial duration: 319 seconds
- initial size/line count: 48,419 bytes / 1,106 lines
- review file path: `/home/masaharu/Projects/spacer-clone/docs/liner/phase4.5/scope/step8_4_to_8_8_rescope_review_20260711-211101.md`

## Quality Score

- overall: PARTIAL
- score: 19 / 25
- additional investigation required: YES
- reason: The report completed all 25 required chapters and provides many file/symbol references, but it mis-scopes Step 8.4 and Step 8.5, asserts a package-free `tsx` CLI path not supported by `frontend/package.json`, and leaves core sign-convention and solver/result persistence questions unresolved.

## PASS Items

- 25章構成が存在する。
- Step 8.1-8.3 baselineが概ね整理されている。
- Project import/export and state ownerが主要symbol付きで整理されている。
- load型、solver/result型、UI統合候補、capability matrixが存在する。
- member force符号規約の主要ファイルとして `frontend/src/results/resultViewModel.ts`, `backend/engine/results.py`, `backend/engine/element.py` が挙げられている。
- eigen/mode matching案、task breakdown、critical path、PR plan、test matrix、performance章が存在する。
- 事実、推定、確認不能が一部で分離されている。

## PARTIAL Items

- Step 8.4の本来範囲である real data adapter、BridgeDefinition/FrameModel/Project経路、Golden Fixture Comparison が薄く、Step 8.5のload parity中心になっている。
- Step 8.5の本来範囲である荷重・境界条件の詳細Parityが、静的解析Parityへ寄り過ぎている。
- Step 8.6で解析結果Parityのfixture strategyはあるが、static resultの保存経路、response spectrumの既存UI/型の正確な扱いが不足している。
- UI統合先はResultsPanel案が出ているが、既存 `BottomTab` 型やModelComparisonWorkspaceとの関係整理が不足している。
- task breakdownはあるが、Step番号と内容のずれがあり、そのまま実装プロンプト化できない。
- PR planは5件だが、Step 8.4 adapter/goldenとStep 8.5 load/boundaryの境界が不明確。

## FAIL Items

- CLI方式: `npx tsx` が「追加パッケージなし」と記載されているが、限定確認では `frontend/package.json` に `tsx` 依存がない。Vite同梱とみなす根拠も不十分。
- Step 8.4: Golden Fixture Comparison、deterministic ParityReport snapshot、不安定UUID/日時/順序除外の具体タスクが不足。
- Step 8.5: support/spring/release/local coordinate/undefined vs zero/duplicate load/order independenceの実装可否と非スコープ分類が不足。
- member force sign: `resultViewModel.ts`のI端反転は確認されているが、parityで比較すべきcanonical convention、I/J反転時の変換、local axis反転の扱いは未確定。
- package追加なしCLI: 実装方式を確定できない。

## Suspicious or Contradictory Statements

- "TypeScript CLI: `npx tsx <script.ts>` で追加パッケージなしに実行可能" は未確認または誤りの可能性が高い。
- "Step 8.4 Load and Boundary Parity" はユーザー指定のStep 8.4と一致しない。Step 8.4は実データadapter/golden、Step 8.5がload/boundary detailed parity。
- "Step 8.7 Feature flag rollout criteria" は今回のStep 8.7主題であるJSON出力・CLI化から逸れている。
- "全て実装可能" は、springs/releases/temperature/non-uniform load等の現行型未実装項目があるため、Step単位では条件付きにすべき。

## Limited Verification Performed

- `frontend/package.json`, `frontend/tsconfig.json`, `frontend/tsconfig.node.json`, `frontend/vite.config.ts`, `frontend/vitest.config.ts`
- `frontend/src/results/resultViewModel.ts`
- `backend/engine/results.py`
- `backend/engine/element.py`
- `frontend/src/App.tsx`
- `frontend/src/types.ts`
- `frontend/src/api/client.ts`
- `backend/engine/eigen.py`
- `backend/engine/response_spectrum.py`
- `backend/app/main.py`

## Symbols Requiring Follow-up

- `BridgeDefinition`, `generateStructuralModel`, facade/generator path, legacy generator path
- `normalizeProjectModelForSemanticParity`, `compareSemanticParity`, `compareNormalizedModels`
- `LoadCase`, `NodalLoad`, `MemberLoad`, `MassCase`, support-related types
- `AnalysisResult`, `EigenResult`, `ResponseSpectrumResult`
- `run_analysis`, `build_success_result`, `run_eigen_analysis`, `run_response_spectrum_analysis`
- `resultViewModel` member force conversion and Viewer3D usage
- Package scripts and feasible Node CLI execution without adding dependencies

## Additional Investigation Questions

1. Re-scope Step 8.4 exactly around real data adapters and Golden Fixture Comparison. Identify exact existing BridgeDefinition, LINER, generator, ProjectModel, save/load, regression/golden test files and the concrete adapter/golden tasks.
2. Re-scope Step 8.5 exactly around load and boundary semantics, separating currently implementable ProjectModel types from unavailable springs/releases/temperature/non-uniform/imposed displacement/body load features.
3. Re-scope Step 8.6 result parity with exact existing result fields, persistence/UI paths, static/eigen/response-spectrum fixture strategy, and solver execution vs golden-only strategy.
4. Resolve or isolate member force canonical sign convention for parity: backend end force convention, frontend section-force conversion, I/J reversal, local axis reversal, and what remains a blocker.
5. Determine a package-addition-free CLI implementation path supported by the current repo, or mark package addition / precompiled JS / Vite-node alternative as a decision.
6. Rebuild task breakdown and PR plan with correct Step boundaries: 8.4 adapter/golden, 8.5 load/boundary, 8.6 result, 8.7 JSON/CLI, 8.8 UI.

## Additional Investigation Decision

- execute follow-up: YES
- scope: limited to FAIL and major PARTIAL items above
- do not repeat: baseline overview, general file list, already sufficient architecture summary
