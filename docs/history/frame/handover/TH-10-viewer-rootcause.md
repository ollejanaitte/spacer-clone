# TH-10 Viewer 不具合の根本原因

## 再現条件

1. 3D Viewer を表示する。
2. 節点ラベルまたは部材ラベルを ON にする。
3. 時刻歴アニメーションを再生する。大規模モデルほど短時間で再現しやすい。

## 例外スタック

実機では WebGL/Canvas リソース枯渇後に `THREE.WebGLRenderer.render` または `THREE.CanvasTexture` 更新経路で例外となり、未捕捉のまま rAF が停止する。主要経路は次の通り。

```text
ThreeViewport.animate
  -> WebGLRenderer.render
SceneBuilder.rebuildModelScene
  -> renderNodeLabels / renderMemberLabels
  -> createLabelSprite
  -> CanvasTexture
```

発生箇所は `frontend/src/viewer/ThreeViewport.tsx` の rAF 描画、`frontend/src/viewer/SceneBuilder.ts` の labels 再構築、`frontend/src/viewer/threeUtils.ts` の CanvasTexture 生成。

## 根本原因

- アニメーション tick ごとに scene 全体を再構築していた。
- ラベル ON 時は node/member ごとに Canvas、CanvasTexture、SpriteMaterial、Sprite を毎 tick 生成・破棄していた。
- 件数上限と間引きがなく、1000節点級で GPU/Canvas リソース churn が急増した。
- Canvas context 取得失敗と rAF/render 例外を Viewer 境界で捕捉していなかった。

## 修正方針

- ラベルは最大250件に決定論的に間引く。
- Canvas 2D context が取得できない場合は texture なし Sprite へフォールバックする。
- scene rebuild と rAF 全体を try/catch で隔離する。
- 例外時はラベル、節点、支点、荷重、結果図を非表示にし、部材線画のみ継続描画する。
- エラーは `console.error` に出力する。
