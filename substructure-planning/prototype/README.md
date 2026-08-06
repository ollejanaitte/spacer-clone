# 下部工計画・3Dモデリングツール プロトタイプ

最小技術プロトタイプ。Vanilla TypeScript + Three.js（Vite でビルド）。

- 単柱式RC橋脚（矩形柱・張出梁・支承座）
- 矩形フーチング・場所打ち杭
- 逆T式橋台（背壁・翼壁）
- 上部工簡易外形・地盤面
- パラメータ変更時の3D再生成
- 部材クリックで安定ID表示
- 概算コンクリート体積・杭延長表示
- JSON保存・再読込み・GLB出力
- 入力検証（fail-closed）

## 起動方法

```bash
cd prototype
npm install        # 初回のみ（LAB_ROOT内に依存）
npm run dev        # http://127.0.0.1:5173/
```

## テスト

```bash
npm test                              # vitest 単体テスト
node tests/browser_verify.mjs         # ブラウザ検証（事前に dev サーバ起動が必要）
```

## 検証の位置づけ

本プロトタイプの数値・3D形状は技術検証用。
概算数量は幾何学的概算値であり、実務数量ではありません。

NUMERIC_DESIGN_AUTHORIZATION: NOT_GRANTED
PRODUCTION_USE_AUTHORIZATION: NOT_GRANTED
RESULT_LABEL: 参考値・未検証・実務使用不可

## 構成

- src/model.ts          データモデル（安定ID, 座標系規約）
- src/validation.ts     入力検証（fail-closed）
- src/quantity.ts       概算数量
- src/geometry.ts       3Dジオメトリ生成
- src/projectIO.ts      JSON入出力
- src/defaultProject.ts デモプロジェクト
- src/main.ts           フォーム・3Dビュー・GLB出力
- tests/                vitest 単体テスト
- tests/browser_verify.mjs Playwright検証
