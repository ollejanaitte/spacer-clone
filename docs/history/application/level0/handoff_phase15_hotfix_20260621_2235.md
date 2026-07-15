# Phase 1.5 Hotfix 完了報告書

## 概要

/level0 および /level0/lesson のボタン・カードクリック不具合を修正しました。

## 問題原因

### 1. ルーティング問題（主要因）

`LobbyApp` コンポーネントがURLパスではなく保存された設定からルートを決定していた。

- `getInitialRoute()` は `getUiModeDefault()` から読み込み
- URLパス `/level0/lesson` に直接アクセスしても、保存設定が `level0` なら `/level0` が返される
- 結果: `/level0/lesson` が表示されない

### 2. 教材カードクリック不可（二次的問題）

`Level0Lesson.tsx` の教材カードが `<div>` 要素のみで、クリックハンドラがなかった。

## 修正内容

### 1. ルーティング修正

`frontend/src/lobby/routes.tsx` を修正:

```typescript
function getCurrentRoute(): LobbyRoute {
  if (typeof window === "undefined") return "/";
  const resolved = resolveLobbyRoute(window.location.pathname);
  return resolved ?? getInitialRoute();
}
```

- `LobbyApp` がURLパスからルートを解決するように変更
- `resolveLobbyRoute` の優先順位を修正（`/level0/lesson` を `/level0` より先に評価）

### 2. 教材カード修正

`frontend/src/lobby/pages/Level0Lesson.tsx` を修正:

- `<div>` を `<button>` に変更
- `onClick` ハンドラを追加

### 3. CSS追加

`frontend/src/lobby/pages/LearnTop.module.css` に `.card` スタイルを追加。

## テスト結果

- テスト実施: `npm test -- --run`
- 結果: 54ファイル中54ファイル成功、536テスト中536テスト成功

## ビルド結果

- ビルド実施: `npm run build`
- 結果: 成功

## 変更ファイル

- `frontend/src/lobby/routes.tsx`
- `frontend/src/lobby/pages/Level0Lesson.tsx`
- `frontend/src/lobby/pages/LearnTop.module.css`
