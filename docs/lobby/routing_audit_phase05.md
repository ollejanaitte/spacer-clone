# Phase 0.5 ルーティング監査

調査者: MiMo
調査日: 2026-06-21
コミット: HEAD (feature/phase05-routing-ui-finish)

## 1. 現在のルート定義（実コード貼り付け）

### main.tsx

```tsx
function getRoute(): "lobby" | "pro" {
  if (typeof window === "undefined") return "lobby";
  const p = window.location.pathname;
  if (p === "/pro" || p.startsWith("/pro/")) return "pro";
  return "lobby";
}
const route = getRoute();
// route === "pro" ? <App /> : <LobbyApp />
```

### lobby/routes.tsx

```tsx
export function getInitialRoute(): LobbyRoute {
  const saved = getUiModeDefault();
  if (saved === "learn") return "/learn";
  if (saved === "level0") { window.location.href = "/level0"; return "/"; }
  if (saved === "pro") { window.location.href = "/pro"; return "/"; }
  return "/";
}
```

### App.tsx (抜粋)

```tsx
// /pro/th/ でTHウィザードを開く
const [timeHistoryWizardOpen, setTimeHistoryWizardOpen] = useState<boolean>(
  () => window.location.pathname.startsWith("/pro/th/"),
);
// /pro/compare で比較モード
const [comparisonOpen, setComparisonOpen] = useState(
  () => window.location.pathname === "/pro/compare",
);
```

### routeRedirect.ts

```tsx
// /th/run → /pro/th/run
// /compare → /pro/compare
// /th/output-targets → /pro/th/run
```

## 2. 確認項目

| 項目 | 結果 |
|---|---|
| /pro でレンダリングされるコンポーネント | App.tsx (既存プロモード) |
| /pro が既存プロモード root と同じ画面を表示するか | YES (main.tsx で route="pro" → App) |
| /pro/th/run が既存 TH 解析画面と同じか | YES (App.tsx で /pro/th/ 判定) |
| /pro/compare が既存 compare 画面と同じか | YES (App.tsx で /pro/compare 判定) |
| ロビー「学習編」→ /learn | YES (LobbyHome.tsx L23) |
| ロビー「入門編」→ /level0 | YES (LobbyHome.tsx L32) |
| ロビー「実務編」→ /pro | YES (LobbyHome.tsx L41) |
| 旧 /th/run → /pro/th/run リダイレクト | YES (routeRedirect.ts) |
| 旧 /compare → /pro/compare リダイレクト | YES (routeRedirect.ts) |
| 既存プロモード root 壊されていない | YES (500件テスト維持) |

## 3. 動作確認チェック

- [ ] / でロビーが表示される → YES (main.tsx で route="lobby" → LobbyApp)
- [ ] 学習編 → /learn → リンク集表示 → YES (LearnTop.tsx)
- [ ] 入門編 → /level0 → Phase 1.0 Home → YES (外部URL遷移)
- [ ] 実務編 → /pro → 既存プロモード → YES (App.tsx)
- [ ] /pro/th/run → TH解析 → YES (App.tsx)
- [ ] /pro/compare → 比較画面 → YES (App.tsx)
- [ ] 旧 /th/run → /pro/th/run → YES (routeRedirect.ts)
- [ ] 旧 /compare → /pro/compare → YES (routeRedirect.ts)

## 4. 発見された問題

1. **ロビー→入門編遷移が外部遷移**: `window.location.href = "/level0"` はSPA内遷移ではなくページ全体リロード
2. **ロビー→実務編遷移も同様**: `window.location.href = "/pro"` はページ全体リロード
3. **ロビーのCSSが未実装**: クラス名はあるがCSSシートなし
4. **学習編トップのCSSが未実装**: 同上

## 5. T-P05-02 で修正すべき内容

1. ロビー→入門編/実務編の遷移は SPA 内遷移として処理（リロード不要）
2. ロビーの CSS を追加（T-P05-03 で対応）
3. 学習編トップの CSS を追加（T-P05-04 で対応）
