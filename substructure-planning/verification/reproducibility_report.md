# Phase A: 再現性確認レポート (reproducibility_report)

日時: 2026-08-07 (JST)
対象ラボ: /home/masaharu/Projects/substructure-planning-lab
検証者: 現場監督兼実装検証責任者

## 1. 検証方針
クリーンな環境から改めて
1. 依存の再導入(npm ci: lockfile から完全再現)
2. 単体テスト(vitest)
3. 型チェック(tsc --noEmit)
4. 本番ビルド(vite build)
5. JSON Schema 検証(独自チェッカ)
6. ブラウザ E2E(headless Chromium + dev server)
7. GLB 出力の安定ID 確認 + スクリーンショット再撮
の各項目を実行し、前回実績(unit 26/26, browser 10/10, schema 12/12, GLB 41,544 B)と比較した。

## 2. 環境
- node v22.23.2 / npm 10.9.8 / python 3.10.12 (2026-08-07)
- 実作業: `rm -rf node_modules && npm ci` から開始(lockfile 再現)

## 3. 各検証結果
| 検証 | 実行 | 結果 | 前回実績 |
|---|---|---|---|
| npm ci(lockfile 再現) | `npm ci --no-audit --no-fund` | PASS(64 pkgs, ~2s) | - |
| 単体テスト | `npm test` | **26/26 PASS**(5 files) | 26/26 |
| 型チェック | `npx tsc --noEmit` | PASS | PASS |
| プロダクションビルド | `npm run build` | PASS(built 1.47s) | PASS |
| JSON Schema 検証 | `python3 verification/schema_validation.py` | **12/12 PASS** | 12/12 |
| ブラウザ E2E | `node prototype/tests/browser_verify.mjs` | **10/10 PASS** | 10/10 |
| GLB 安定ID | JSON chunk 走査 | PASS(18 member ID 完全一致) | PASS |
| スクリーンショット | `screenshots_extra.mjs` 再撮 | PASS(3 枚) | - |

- ビルド時 chunk>500kB 警告は確認されるが単一 js 549.50 kB / gzip 141.05 kB、要件上問題なし。分割は任意拡張。

## 4. 安定 ID の確認
GLB の JSON チャンク(42)から読み出した member node 名:
`P1-FOOTING / P1-COLUMN-01 / P1-CAP / P1-SEAT-01 / P1-SEAT-02 / P1-BEARING-01 / P1-BEARING-02 / PILE-01..04 / P1 / A1-BACKWALL / A1-WING-L / A1-WING-R / A1 / SUBSTRUCTURES / SUPERSTRUCTURE-ENVELOPE / GROUND`
期待 16 種すべてを包含 = 安定ID 維持。

- スクリーンショット: prototype_3d_view.png / prototype_skew.png / prototype_pick.png が verification/screenshots/ に生成。

## 5. 結論
REPRODUCIBILITY_VERDICT = **PASS**(クリーン環境で全テスト・ビルド・スキーマ・E2E・GLB が旧実績と一致)