# Phase 1.5 コードベース調査メモ

## 1. /level0 のルート構成

- メインルート: `/level0`
- 教材モード: `/level0/lesson`
- ルーティング: `frontend/src/lobby/routes.tsx` で管理
- 遷移先: `frontend/src/main.tsx` で `LobbyApp` に渡される

## 2. トップ画面実装ファイル

- メインコンポーネント: `frontend/src/lobby/pages/Level0Top.tsx`
- CSS: `frontend/src/lobby/pages/LobbyHome.module.css` を再利用
- データ: `frontend/src/lobby/data/lobbyStrings.ts` に定義

## 3. サンプルデータ配置

- 短い橋: `/level0?sample=short`
- 標準的な橋: `/level0?sample=standard`
- 高い橋脚の橋: `/level0?sample=tall`

## 4. 結果画面実装ファイル

- メインコンポーネント: `frontend/src/components/ResultsPanel.tsx`
- 新規タブ: `howToRead` を追加
- i18n: `frontend/src/i18n/ja.ts` に定義

## 5. /pro導線候補

- トップページ下部にリンク追加
- テキスト: "実務編で詳しく見る"
- 遷移先: `/pro`

## 6. テストコマンド

```bash
cd frontend
npm test -- --run
```

## 7. ビルドコマンド

```bash
cd frontend
npm run build
```

## 8. 想定リスク

- CSSモジュールの再利用によるスタイル競合の可能性
- ルーティング変更による既存機能への影響
- テストカバレッジの不足

## 9. 変更ファイル一覧

- `frontend/src/lobby/routes.tsx`
- `frontend/src/lobby/pages/Level0Top.tsx` (新規)
- `frontend/src/lobby/pages/Level0Lesson.tsx` (新規)
- `frontend/src/lobby/data/lobbyStrings.ts`
- `frontend/src/lobby/components/BackToLobbyButton.tsx`
- `frontend/src/components/ResultsPanel.tsx`
- `frontend/src/types.ts`
- `frontend/src/i18n/ja.ts`
- `frontend/src/styles.css`
- `frontend/src/lobby/__tests__/Level0Top.test.tsx` (新規)
- `frontend/src/lobby/__tests__/Level0Lesson.test.tsx` (新規)
