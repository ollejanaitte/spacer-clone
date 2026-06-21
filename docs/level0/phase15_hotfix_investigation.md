# Phase 1.5 Hotfix 調査メモ

## 調査日時

2026-06-21 22:20

## 問題

/level0 および /level0/lesson でボタン・カードがクリックできない

## 調査結果

### 1. ルーティング問題（主要因）

**問題**: `LobbyApp` コンポーネントがURLパスではなく保存された設定からルートを決定している

```typescript
// frontend/src/lobby/routes.tsx
export function getInitialRoute(): LobbyRoute {
  const saved = getUiModeDefault();
  if (saved === "learn") return "/learn";
  if (saved === "level0") return "/level0";
  if (saved === "pro") return "/";
  return "/";
}
```

**影響**: `/level0/lesson` に直接アクセスしても、保存設定が `level0` なら `/level0` が返され、`/level0/lesson` が表示されない

### 2. 教材カードクリック不可（二次的問題）

**問題**: `Level0Lesson.tsx` の教材カードが `<div>` 要素のみで、クリックハンドラがない

```tsx
<div key={lesson.id} className={styles.card}>
  <h3>{lesson.title}</h3>
  <p>{lesson.description}</p>
</div>
```

**影響**: カードは見た目にあるが、クリックしても何も起きない

### 3. CSS問題

確認結果: CSSに `pointer-events: none` はフォールバックビューのテキストにのみ適用、ボタンへの影響なし

### 4. コンソールエラー

確認結果: Reactエラー、ランタイムエラー、ビルドエラーなし

## 修正方針

1. `LobbyApp` をURLパスからルートを解決するように修正
2. 教材カードにクリックハンドラを追加（プレースホルダー）

## 修正対象ファイル

- `frontend/src/lobby/routes.tsx`
- `frontend/src/lobby/pages/Level0Lesson.tsx`
