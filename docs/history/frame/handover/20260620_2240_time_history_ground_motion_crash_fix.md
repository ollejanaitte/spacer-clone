# 作業報告書：時刻歴応答解析「地震波設定」画面クラッシュ修正

## 実施概要

時刻歴応答解析の「地震波設定」画面において、`timeHistory`設定が未定義の場合にアプリがクラッシュする不具合を修正した。

## 再現条件

- `analysisSettings.timeHistory` が undefined のプロジェクトで「地震波設定」画面を開く
- `groundMotions` が空配列または undefined のプロジェクトで「地震波設定」画面を開く

## 原因

`SectionGroundMotion.tsx` の `settings` 変数が `as TimeHistoryV2Settings` で型キャストされており、`undefined` の場合に `settings.groundMotions[axis]` でプロパティアクセスが発生してクラッシュしていた。

同じ問題が `wizardState.ts` の `buildTimeHistoryChecks` 関数にも存在した。

## 修正内容

### SectionGroundMotion.tsx

1. `settings` の型を `TimeHistoryV2Settings | undefined` に変更
2. `enabledAssignments` の計算に `settings` の null チェックを追加
3. JSX 内の `settings.groundMotions[axis]` を `settings?.groundMotions[axis] ?? { enabled: false, groundMotionId: null }` に変更
4. `updateAxis` 関数に `settings` の early return を追加
5. `fitDurationToMotion` 関数に `settings` の early return を追加

### wizardState.ts

1. `buildTimeHistoryChecks` 内の `settings` 型を `TimeHistoryV2Settings | undefined` に変更

## 変更ファイル一覧

- `frontend/src/timeHistory/wizard/sections/SectionGroundMotion.tsx` - null チェック追加
- `frontend/src/timeHistory/wizard/wizardState.ts` - null チェック追加
- `frontend/src/timeHistory/wizard/sections/SectionGroundMotion.test.tsx` - 新規テスト追加

## 追加テスト

- 地震波未設定でもレンダリングできる
- 空配列でもクラッシュしない
- undefined の groundMotions でもクラッシュしない

## テスト結果

- 48ファイル, 496件 全成功

## ビルド結果

- TypeScript check: 成功
- Vite build: 成功

## Git情報

- ブランチ: main
- コミット: 未コミット

## GitHub push結果

- 未push

## 今後の注意点

- `as` による型キャストは安全ではない。将来は `as ... | undefined` を使用する
- React コンポーネントでは props の null/undefined を想定した設計を徹底する
