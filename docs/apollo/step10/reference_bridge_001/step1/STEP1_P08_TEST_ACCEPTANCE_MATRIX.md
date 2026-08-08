# STEP 1-P08 — TEST_ACCEPTANCE_MATRIX

> **Authority:** Reference Bridge 001 (RB-S10-001) — 上部工一気通貫
> **Status:** STEP 1 設計
> **正本:** frontend `vitest`/`playwright`、backend `pytest`、既存 tests（36 geometry / 41 backend / e2e 24 specs）

## テスト階層

| 階層 | 対象 | ツール | 既存 | STEP 2/3 追加 |
|------|------|--------|------|---------------|
| unit | 関数・ロジック | vitest / pytest | Geometry 36, backend 41 | 各照査ロジック・placement 拡張 |
| contract | interface/schema 契約 | vitest + JSON Schema | Geometry contract 11 | 設計結果 schema・3D contract |
| integration | connector 結合 | vitest / pytest | connector/adapter tests | snapshot→解析→照査→出力 |
| parity | Golden 照合 | vitest（専用） | RB-001 parity 7 | 解析/設計/図面 parity（Replay spec） |
| regression | 既存回帰 | vitest run / pytest | 全テスト | 各 PR で回帰 |
| E2E | Playwright | `frontend/tests/e2e` | 24 specs | Replay E2E・UI フロー |
| visual regression | 画面/図面/3D screenshot | playwright + 保存 | evidence PNG 実績 | Replay evidence |
| build | tsc -b + vite build | npm | 有 | 各 PR |
| Electron | 起動・IPC・パッケージ | vitest + electron 検証 script | 有 | 3-06 |

## コマンド（実在）

| 種別 | コマンド |
|------|----------|
| typecheck | `npm run typecheck`（frontend, tsc -b） |
| lint | `npm run lint`（typecheck + source/japanese hygiene） |
| frontend test | `npm test`（vitest run）/ `npm run test:all` |
| backend test | `python -m pytest backend/tests -q` |
| e2e | `npm run test:e2e`（playwright） |
| electron test | `npm run electron:test` |

## 各 PR の acceptance（最小）

1. `tsc -b` PASS
2. 該当範囲の unit/contract/integration test PASS
3. 既存回帰 PASS（該当する frontend/backend スイート）
4. docs PR は link/validator PASS（STEP 1 Master Validator）
5. production コード変更時の既存機能破壊なし

## 最終 acceptance（STEP 3 完了時）

- 全スイート PASS（frontend `test:all` + backend pytest + e2e）
- RB-001 Replay: PASS（FAIL_* = 0）
- build（tsc + vite）PASS、Electron 起動 PASS
- API 未接続 / stub / placeholder / TODO = 0（監査ツールで確認）
- 数値認証ゲートの表示が全数値出力に適用
