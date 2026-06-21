# Root Cause Analysis

## 再現手順

調査日時: 2026-06-21

1. `frontend` で `npm run dev -- --host 127.0.0.1` を実行する。
2. Chromium（Playwright）で `/level0` を開く。
3. 「短い橋」「標準的な橋」「高い橋脚の橋」をそれぞれクリックし、URL・見出し・console・pageerrorを記録する。
4. `/level0` から「教材モード」をクリックする。
5. `/level0` から「実務編で詳しく見る」をクリックする。
6. `/level0/lesson` を直接開き、「入門編に戻る」と3件の教材カードをクリックする。
7. `frontend/src` 全体を検索し、`URLSearchParams`、`sample` の読取処理、教材詳細ルート、サンプル別表示を確認する。

## 実際の挙動

| 操作 | URL | 画面 | console / React error |
|---|---|---|---|
| 短い橋 | `/level0?sample=short` | 「入門編」の一覧のまま | React errorなし |
| 標準的な橋 | `/level0?sample=standard` | 「入門編」の一覧のまま | React errorなし |
| 高い橋脚の橋 | `/level0?sample=tall` | 「入門編」の一覧のまま | React errorなし |
| 教材モード | `/level0/lesson` | 「入門編」の一覧のまま | React errorなし |
| 実務編で詳しく見る | `/pro` | 実務編を表示 | React errorなし。バックエンド未起動のためAPIリクエストはHTTP 500 |
| `/level0/lesson` 直接アクセス | `/level0/lesson` | 教材モードを表示 | React errorなし |
| 教材モードの戻る | `/level0` | 教材モードのまま | React errorなし |
| 教材カード | `/level0/lesson/<id>` | 教材一覧のまま | React errorなし |

`frontend/src` にはQueryStringの `sample` を読む処理がなく、`short`、`standard`、`tall` に応じた画面分岐も存在しない。

## 期待挙動

- 3件のサンプルカードをクリックすると、URLの `sample` に対応したサンプル画面へ切り替わる。
- 教材モードをクリックすると、URLと画面が `/level0/lesson` に切り替わる。
- 教材モードの戻るボタンで、URLと画面が `/level0` に戻る。
- 教材カードをクリックすると、選択した教材の詳細画面へ切り替わる。
- 実務編リンクで `/pro` の実務編へ切り替わる。
- 上記操作でReact例外を発生させない。

## 原因候補一覧

1. CSSの `pointer-events` や重なりによりクリックが届かない。
2. ボタンに `onClick` が設定されていない。
3. `history.pushState` 後にReactのルート状態が更新されない。
4. QueryStringを読む処理とサンプル別画面が未実装。
5. 教材詳細URLを解決するルートと詳細画面が未実装。

確認結果:

- 候補1は該当しない。Playwrightの実クリックで各ボタンの `onClick` が実行され、URLが変化した。
- 候補2は該当しない。対象ボタンには `onClick` が存在し、URLが変化した。
- 候補3、4、5が実コードとブラウザ挙動の両方で確認された。

## 根本原因

根本原因は次の3点である。

1. `frontend/src/main.tsx` のReact状態が `"lobby" | "pro"` の2値しか保持していない。`/level0` から `/level0/lesson`、`/level0?sample=...`、`/level0/lesson/<id>` への遷移はすべて `"lobby"` から `"lobby"` への同値更新となる。Reactは再描画しないため、`pushState` でURLだけが変化し、画面が遷移前のまま残る。
2. `frontend/src/lobby/data/lobbyStrings.ts` は `/level0?sample=short|standard|tall` を遷移先として定義しているが、QueryStringを読む処理とサンプル別画面が実装されていない。再読み込みしても `/level0` の一覧が表示される。
3. 前回Hotfixで教材カードに `/level0/lesson/<id>` への遷移を追加したが、`resolveLobbyRoute` は `/level0/lesson` までしか解決せず、教材詳細コンポーネントも存在しない。

前回Hotfixのテストは、子コンポーネントが `onNavigate` を正しい文字列で呼ぶことだけを確認していた。`Root`、History API、`LobbyApp` を通した画面更新を検証していなかったため、URLのみ変化する不具合を検出できなかった。

## 修正方針

1. `main.tsx` で現在の `pathname + search` をReact状態として保持し、すべてのSPA遷移と `popstate` で更新する。
2. `LobbyApp` に現在位置を渡し、pathnameとQueryStringから表示コンポーネントを決定する。
3. `sample=short|standard|tall` を検証して読み取り、対応するサンプル詳細画面を表示する。
4. `/level0/lesson/<id>` を解決し、対応する教材詳細画面を表示する。
5. unit testにQueryString・教材詳細ルートの検証を追加し、Playwright E2EでURLと画面の両方が変わることを検証する。

## 修正対象ファイル

- `frontend/src/main.tsx`
- `frontend/src/lobby/routes.tsx`
- `frontend/src/lobby/data/lobbyStrings.ts`
- `frontend/src/lobby/pages/Level0Sample.tsx`
- `frontend/src/lobby/pages/Level0LessonDetail.tsx`
- `frontend/src/lobby/__tests__/Level0Top.test.tsx`
- `frontend/src/lobby/__tests__/Level0Lesson.test.tsx`
- `frontend/src/lobby/__tests__/routes.test.tsx`
- `frontend/tests/e2e/level0-navigation.spec.ts`
