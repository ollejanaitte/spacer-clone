# Phase 2A 事前調査

## 調査日時

2026-06-21

## 目的

入門編のサンプルデータ拡張・パラメータ変更機能の実装に向けた事前調査

## 1. 現在のlevel0構造

### ファイル構成

```
frontend/src/lobby/
├── pages/
│   ├── Level0Top.tsx          # トップページ
│   └── Level0Lesson.tsx       # 教材モード
├── data/
│   └── lobbyStrings.ts        # UI文字列定義
├── components/
│   ├── ModeCard.tsx           # カードコンポーネント
│   └── BackToLobbyButton.tsx  # 戻るボタン
└── routes.tsx                 # ルーティング
```

### 現在のサンプル定義

`lobbyStrings.ts` 内の `level0.samples`:

```typescript
samples: [
  { id: "short-bridge", name: "短い橋", target: "/level0?sample=short" },
  { id: "standard-bridge", name: "標準的な橋", target: "/level0?sample=standard" },
  { id: "tall-pier-bridge", name: "高い橋脚の橋", target: "/level0?sample=tall" },
]
```

## 2. サンプルデータ位置

### 現状

- サンプルデータは `lobbyStrings.ts` に定義
- 実際の解析データ（JSON）は存在しない
- クリック後は `/level0?sample=xxx` に遷移するが、その先の実装がない

### 必要なデータ

- 各サンプルの橋梁モデルJSON（nodes, members, materials, sections, supports, loads）
- 解析エンジンが読み込める形式

## 3. 解析呼び出し経路

### 現在の経路

```
/pro (App.tsx)
├── apiClient.validateProject(project)
├── apiClient.runAnalysis(project)
└── result 表示
```

### 入門編での経路（未実装）

```
/level0 (Level0Top.tsx)
├── サンプル選択 → /level0?sample=xxx
├── ??? (サンプル読み込み)
├── ??? (パラメータ変更UI)
├── ??? (解析実行)
└── ??? (結果表示)
```

## 4. 橋長変更候補

### 変更対象

- 支間長さ（span length）
- 節点座標（X方向）

### 変更方法案

1. **スケーリング**: 全節点のX座標を倍率で変更
2. **支間追加/削除**: 橋脚を追加/削除して支間数を変更

### 影響範囲

- `project.nodes[].x` 座標
- `project.members[]` の接続関係
- 支点条件（supports）

## 5. 橋脚高さ変更候補

### 変更対象

- 橋脚のY座標
- 橋脚の部材長

### 変更方法案

1. **スケーリング**: 橋脚節点のY座標を変更
2. **部材再定義**: 橋脚部材の長さを再計算

### 影響範囲

- `project.nodes[].y` 座標
- `project.members[]` の橋脚部材
- 固有周期への影響

## 6. 橋脚本数変更候補

### 変更対象

- 橋脚数
- 支間数

### 変更方法案

1. **テンプレート方式**: 事前定義されたテンプレートから選択
2. **動的生成**: 節点・部材を動的に追加/削除

### 影響範囲

- `project.nodes[]` 要素数
- `project.members[]` 要素数
- モデルサイズ

## 7. 荷重倍率変更候補

### 変更対象

- 自重倍率
- 活荷重倍率

### 変更方法案

1. **直接入力**: 倍率フィールドを追加
2. **プリセット**: 事前定義された倍率選択

### 影響範囲

- `project.memberLoads[]` の値
- 変位・応答値

## 8. JSONスキーマ影響調査

### 現在のスキーマ

- `frontend/src/types.ts` の `ProjectModel`
- 解析エンジンの入力形式

### 変更不要

- スキーマ自体の変更は不要
- データの値を変更するだけ

## 9. リスク一覧

| リスク | 影響度 | 確率 | 対策 |
|--------|--------|------|------|
| 解析エンジンとの互換性 | 高 | 低 | 既存APIを使用 |
| モデル整合性 | 高 | 中 | バリデーション追加 |
| UI複雑化 | 中 | 中 | 段階的実装 |
| パフォーマンス | 低 | 低 | 軽量モデル使用 |
