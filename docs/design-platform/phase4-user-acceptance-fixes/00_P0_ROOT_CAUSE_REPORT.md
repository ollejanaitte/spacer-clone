# Phase 4 / User Acceptance Fixes — P0 Root Cause Report

> Authority: Phase 4 UX修正 P0（実機症状再現・原因調査）docs-only
> Baseline: origin/main `1ff2536a22aedc929773ed7b571d54a8ff9ae868`
> 検証経路: `./start-ubuntu.sh`（Vite apollo mode 5173 + backend 8000、Electron と同じ routing）

## 1. 再現結果（実起動経路）

### 症状1: 「保存」ボタンが効いている実感がない
- Quick Analysis/FEM（`/pro`）上部「保存」ボタンは表示され、disabled でない。
- ブラウザ相当（--web）では `saveProjectFile` → `downloadText("project.json", ...)` により silent download。
- 成功時 UI に新たな表示がない（Toolbar は元々「保存済み」表示、`log()` は errors パネルに非表示）。
- Electron では native save dialog（`desktop/electron/dialogIpc.ts` `handleSaveProject`）が正しく実装済み。

### 症状2: サンプル業務が無い
- Design Platform Home / 業務一覧に「サンプル業務を作成」導線が存在しない。
- 既存の sample fixture / Reference Bridge / Road sample は調査待ち（P4 で再利用検討）。

### 症状3: 起動時から「5-Span Continuous Viaduct (Plan A)」が自動表示
- `App.tsx:168` `useState<ProjectModel>(() => createDefaultProject())` が `/pro` 全描画で Plan A を生成。
- `App.tsx:1390`「新規」も `createDefaultProject()`（= Plan A 復活）。
- `frontend/src/data/defaultProject.ts` に Plan A（nodes 10 / members 9 / supports 6 / loadCases 2 / nodalLoads / massCase）が定義。

## 2. 原因確定

| 症状 | Root Cause |
|------|------------|
| 保存の実感なし（QA） | 成功 feedback が無い。ブラウザは silent download、`log()` は非表示パネル。dirty 初期 false で「保存済み」固定表示。 |
| 保存が実際に効いていない（Workspace） | `App.tsx` Workspace `onSave` は `registry.touch()` のみ。folder store / business-project.json への書き込み無し。さらに confirmation gate が Save を disabled にし得る。 |
| Plan A 自動表示 | `createDefaultProject()` を runtime 初期 state（App useState）と「新規」で使用。Plan A データが production runtime に直結。 |

## 3. 修正方針（後続ステップ）

- **P1**: runtime 初期 state を空の ProjectModel に変更。Plan A は test/sample fixture へ隔離。`createDefaultProject` は runtime 初期化から外す（`createEmptyProject` を新設 or 空モデル化）。
- **P2**: Quick Analysis 保存に成功/失敗 feedback を追加（"保存しました" 表示）。browser download でも確認可能に。
- **P3**: Workspace 保存を実接続（folder store → business-project.json → readback）。「保存」は gate で disabled にしない（工程進行/計算のみ gate）。保存 feedback + dirty クリア。
- **P4**: 「サンプル業務を作成」導線。既存 fixture/sample を再利用して clone。
- **P5**: 空状態 UX（新規作成 / 開く / サンプルを読み込む）。

## 4. 実装禁止（再掲）

- Protected Core 変更 / force push / reset --hard / git clean。
- Plan A を test fixture 以外から runtime へ import しない。
- 既存ユーザーデータを勝手に削除しない。
