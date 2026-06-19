# TH-10 作業前調査

## 変更計画

1. Phase-1 で `frontend/src/styles/tokens.css` の時刻歴専用デザイントークンを拡張し、本文・補助文・プレースホルダ・バッジ文字のコントラストを一括管理する。
2. Phase-2 で Sprite ラベル生成時の例外を隔離し、描画ループのフォールバック、ラベル間引き、節点サイズ 1〜100 px、部材線幅 1〜50 px を実装する。
3. Phase-3 で設定 schemaVersion 2、X/Y/Z 入力割当、3方向荷重の重ね合わせ、成分別・合成結果、旧形式マイグレーションを実装する。
4. 各 Phase で単体・回帰・ビルド・Electron スモークを実施し、個別 PR を squash merge する。

## UI

- テーマ定義: `frontend/src/styles/tokens.css`
- 適用 CSS: `frontend/src/styles.css` の時刻歴領域（おおむね 2200 行以降）
- 現行トークン:
  - background `#0e1726`
  - panel `#172238`
  - raised panel `#1d2b45`
  - primary `#3b82f6`
  - success `#22c55e`
  - warning `#f97316`
  - danger `#ef4444`
  - text `#e5edf8`
  - muted text `#b4c0d0`
  - border `rgba(255, 255, 255, 0.08)`
- 最も明るい通常パネル `#1d2b45` に対する現状比:
  - text `#e5edf8`: 12.00:1
  - muted `#b4c0d0`: 7.68:1
- 現状値自体は AA を満たす。用途別トークンがなく、placeholder と chip がコンポーネント CSS に依存している点を Phase-1 の改修対象とする。
- ライトテーマの時刻歴モーダルは独立したライト配色定義を持たず、時刻歴領域はダークテーマ固定。アプリ本体のライト配色には時刻歴トークン変更が波及しない。

## Viewer

- `NodeRenderer`: `frontend/src/viewer/renderers/NodeRenderer.ts`
- `MemberRenderer`: `frontend/src/viewer/renderers/MemberRenderer.ts`
- 独立した `LabelRenderer` はなく、両 renderer の `renderNodeLabels` / `renderMemberLabels` が `threeUtils.createLabelSprite` を呼ぶ。
- `ThreeViewport`: WebGLRenderer、camera、OrbitControls、rAF、pointer picking、resize、scene lifecycle を担当。
- `SceneBuilder`: renderer 群を呼び、SceneGroups の内容を props から再構築する。
- ラベル方式: Canvas 2D に文字を描画し、CanvasTexture を THREE.Sprite に貼る方式。
- Three.js: `three ^0.184.0`、型定義 `@types/three ^0.184.1`。
- 現状はアニメーション tick ごとにモデル全体を再構築し、ラベル ON 時は各ラベルごとに canvas/texture/sprite を生成する。例外隔離と大規模時の生成数制限がない。

## 時刻歴解析

- GroundMotion:
  - project 直下 `groundMotions[]`
  - `{ id, name, direction, timeStep, duration, unit, samples }`
  - frontend 型: `frontend/src/types/timeHistory.ts`
  - backend 型/loader: `backend/engine/time_history_models.py`
- TimeHistorySettings:
  - `analysisSettings.timeHistory`
  - `{ enabled, method, timeStep, duration, beta, gamma, damping, initialConditions, direction? }`
- Newmark-β:
  - `backend/engine/time_history_newmark.py::solve_newmark_average_acceleration`
  - M/C/K、時刻別荷重配列、dt、beta、gamma、初期条件を入力する。
- M: `backend/engine/time_history_mass.py`
- C: `backend/engine/time_history_damping.py`
- K: `backend/engine/assembly.py` を `time_history_analysis.py::_reduced_stiffness` から利用。
- 外力: `backend/engine/time_history_load.py::assemble_effective_seismic_load_history`
  - 現状 `P(t) = -M r ag(t)` の単一方向。
- 統合: `backend/engine/time_history_analysis.py`
  - 現状は ground motion を厳密に1件へ制限し、dt 不一致を拒否する。
- 結果:
  - API envelope の `timeHistoryResult`
  - `{ meta, time, displacements, velocities, accelerations }`
  - component key は `N1_ux` 等。旧単方向では node id の短縮 key も存在する。
- Viewer/result 参照:
  - `frontend/src/timeHistory/TimeHistoryResultViewer.tsx`
  - `frontend/src/timeHistory/displacementSeries.ts`
  - `frontend/src/timeHistory/timeHistoryAnimation.ts`
  - `frontend/src/timeHistory/TimeHistoryAnimationContext.tsx`
  - `frontend/src/timeHistory/TimeHistoryAnimationControls.tsx`
