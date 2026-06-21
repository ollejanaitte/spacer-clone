# Phase 1.5 Root Cause Fix 完了報告

## 実施日時

2026-06-21 22:48 JST

## 調査結果

前回Hotfixの報告書を前提にせず、現行 `main` のコードとChromium（Playwright）で再調査した。

根本原因:

1. `frontend/src/main.tsx` が `"lobby" | "pro"` の粗い状態しか保持せず、level0内の遷移が同値更新となって再描画されなかった。
2. `/level0?sample=short|standard|tall` を読む処理とサンプル別画面が存在しなかった。
3. `/level0/lesson/<id>` のルートと教材詳細画面が存在しなかった。
4. 前回テストは `onNavigate` の呼出しだけを確認し、History APIを通したURL・画面の統合動作を検証していなかった。

詳細は `docs/level0/phase15_rootcause_analysis.md` に記録した。

## 修正内容

- `pathname + search` をReact状態として保持し、`pushState` と `popstate` のたびに画面を再評価するよう修正。
- `sample` QueryStringを読み、短い橋・標準的な橋・高い橋脚の橋の各詳細画面を表示。
- `/level0/lesson/<id>` を解決し、3件の教材詳細画面を表示。
- サンプル、教材一覧、教材詳細、戻る操作を対象とするunit testとPlaywright E2Eを追加。

## 修正後ブラウザ確認

`npm run dev -- --host 127.0.0.1` で起動し、Chromiumで確認した。

| 操作 | 修正後URL | 修正後画面 | console / React error |
|---|---|---|---|
| 短い橋 | `/level0?sample=short` | 見出し「短い橋」 | なし |
| 標準的な橋 | `/level0?sample=standard` | 見出し「標準的な橋」 | なし |
| 高い橋脚の橋 | `/level0?sample=tall` | 見出し「高い橋脚の橋」 | なし |
| 教材モード | `/level0/lesson` | 見出し「教材モード」 | なし |
| 教材カード | `/level0/lesson/why-bridge-stands` | 選択教材の詳細 | なし |
| 教材詳細から戻る | `/level0/lesson` | 教材一覧 | なし |
| 入門編に戻る | `/level0` | 入門編トップ | なし |
| `/level0/lesson` 直接アクセス | `/level0/lesson` | 教材一覧 | なし |
| 実務編で詳しく見る | `/pro` | 実務編 | React errorなし |

実務編では、フロントエンドのみ起動した確認環境のため `/health` と `/api/projects/autosave` がHTTP 500となった。画面遷移とReact描画は成功している。

## 検証結果

### 対象unit test

```text
Test Files  3 passed (3)
Tests       22 passed (22)
```

### 型チェック

```text
npm run typecheck
成功
```

### Playwright E2E

```text
npx playwright test tests/e2e/level0-navigation.spec.ts
3 passed
```

### 全テスト

```text
npm test -- --run
Test Files  55 passed (55)
Tests       546 passed (546)
```

jsdomの既存Canvas警告が3件出力されたが、失敗は0件。

### ビルド

```text
npm run build
成功
```

Viteの既存チャンクサイズ警告は出力されたが、ビルドは成功した。

## 変更ファイル

- `docs/level0/phase15_rootcause_analysis.md`
- `docs/level0/handoff_phase15_rootcause_fix_20260621_2248.md`
- `frontend/src/main.tsx`
- `frontend/src/lobby/routes.tsx`
- `frontend/src/lobby/data/lobbyStrings.ts`
- `frontend/src/lobby/pages/Level0Sample.tsx`
- `frontend/src/lobby/pages/Level0LessonDetail.tsx`
- `frontend/src/lobby/__tests__/Level0Top.test.tsx`
- `frontend/src/lobby/__tests__/Level0Lesson.test.tsx`
- `frontend/src/lobby/__tests__/routes.test.tsx`
- `frontend/tests/e2e/level0-navigation.spec.ts`

## 既存ユーザー変更の扱い

作業開始時から存在した `backend/data/projects/autosave.json` の変更および未追跡ドキュメント群は変更・ステージ・コミットしていない。
