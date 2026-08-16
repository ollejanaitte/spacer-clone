# 開発・テスト運用ルール (Development / Test Operation Rules)

**Authority:** OPERATIONAL
**Status:** ACTIVE
**Related:** [vitest-gates.md](vitest-gates.md) / [quality-gates.md](quality-gates.md) / [../../AGENTS.md](../../AGENTS.md)

SPACER CLONE で AI エージェントが開発・テストを行う際に必ず守る運用ルール。
Phase 1〜3（Vitest Gate 分離 / Playwright E2E 専用環境 / 最小 CI 導入）の教訓を正式化したもの。

## 目的

- 通常作業では検証コストを最小化し、マイルストーン完了時のみ全体検証する。
- E2E / 既存 spec / production の関係を正しく分類し、闇雲な修正を防ぐ。
- 永続データ構造・UI 仕様とテストの同期を同一作業単位で保証する。
- 時間制限を守り、原因不明の深掘りでタスクを拡大しない。

## A. 通常の検証 Gate

| 変更内容 | 実行すべき Gate |
| --- | --- |
| 通常修正（純ロジック / 軽微） | `npm run test:fast` + `npm run typecheck` |
| UI 修正 | `npm run test:fast` + `npm run test:ui` + `npm run typecheck` + `npm run build` |
| 3D 修正 | `npm run test:fast` + 対象 3D テスト（`test:3d`）+ 必要な Electron / Playwright 対象 spec |
| E2E 対象機能の修正 | 変更した導線に関係する対象 spec のみ |
| マイルストーン完了 | `npm run test:full`（最終 Gate・原則1回）+ `npm run typecheck` + `npm run build` + 必要な Electron / E2E |

- **通常作業で全 Vitest / 全 Playwright を毎回実行しない。**
- Gate の分類・詳細コマンド・計測時間は [vitest-gates.md](vitest-gates.md) を参照。
- SLOW / 3D テストは skip・削除せず、専用 Gate と `test:full` で必ず実行する。

## B. Playwright E2E 運用

- E2E は**専用 backend / frontend** を使用する。
  - backend 既定ポート: `18000`
  - frontend 既定ポート: `15173`
- `8000` 等の既存サービスを**停止しない**。E2E 都合で他サービスを kill しない。
- 途中作業では**対象 spec だけ**実行する。
- 全 E2E はマイルストーン / Completion Gate 時のみ実行。**何周も繰り返さない。**

## C. E2E 失敗の分類

FAIL 発生時はまず以下へ分類する。

1. 旧 spec（現行仕様と同期していない）
2. fixture / helper 不足
3. production 実装バグ
4. performance / timeout / hang
5. server lifecycle / environment

分類前に闇雲に assertion を書き換えない。

**禁止：**
- `skip` / `fixme` / `todo` で逃げる
- assertion を弱める
- 無根拠な timeout 延長
- `waitForTimeout` 追加だけで解決扱い
- production を E2E 都合で旧仕様へ戻す

## D. E2E 初期状態

- production 画面の初期状態を fixture 代わりに**しない**。
- 必要なサンプル / state は E2E helper / fixture で**明示的に作成**する。
- onboarding / localStorage / route / sample load も既知状態として明示設定する。
- UI 初期仕様変更時に大量 E2E が壊れない構造を維持する。

## E. ProjectModel / Schema / Persistence

ProjectModel や永続データ構造を変更した場合は**同一作業内で**以下を確認する。

- TypeScript 型
- JSON Schema
- serializer
- deserializer
- migration
- save / load roundtrip test

- `additionalProperties: false` を安易に緩めない。
- 正式フィールドは schema へ明示追加する。

## F. UI 仕様変更と E2E

UI の以下を変更した場合、**同じ作業単位で**関連 E2E も確認・同期する。

- testid
- 文言
- workflow step
- route
- master/detail 構造
- onboarding
- modal
- save status
- 初期表示状態

「production だけ変更して E2E は後回し」は原則禁止。

## G. AI エージェントの時間制限

- 同一問題を 15〜20 分以上掘り続けない。
- grep / 再実行 / wait を無限反復しない。
- 15〜20 分で原因不明なら上位エージェント（GPT-5.6 Sol 等）へ原因調査を委任する。
- 全 E2E を途中で何周も回さない。
- 完全 PASS に固執して本来タスクを無限拡大しない。
- タスク外の既存実装バグは原因分類して別課題へ切り出す（残課題として記録）。

## H. CI 現況

現行最小 CI（`.github/workflows/ci.yml`）：

- `npm ci`
- `npm run test:fast`
- `npm run typecheck`
- `npm run build`

- E2E / `test:full` は現時点では CI 必須 Gate に**含めない**。
- CI 拡張は今後別 Phase で検討する（本作業では行わない）。
