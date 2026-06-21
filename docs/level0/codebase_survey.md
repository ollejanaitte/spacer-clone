# Codebase Survey for SPACER Clone Next Phase 1

調査者: MiMo (Xiaomi)
調査日: 2026-06-21
対象コミット: 1c3716576310042d51cc3fb28accf0839052f3f0

## 1. リポジトリ構造（深さ3まで）

```
.
├── backend/
│   ├── app/
│   ├── data/
│   ├── engine/
│   └── tests/
├── build/
├── desktop/
│   └── electron/
├── docs/
│   ├── design/
│   ├── development/
│   ├── handover/
│   ├── investigation/
│   ├── pr/
│   ├── release-notes/
│   ├── screenshots/
│   ├── spec/
│   └── verification/
├── examples/
│   ├── ground-motions/
│   ├── spacer-reference/
│   └── verification/
├── frontend/
│   ├── coverage/
│   ├── dist/
│   ├── node_modules/
│   ├── src/
│   │   ├── api/
│   │   ├── bridge/
│   │   ├── compare/
│   │   ├── components/
│   │   ├── data/
│   │   ├── exports/
│   │   ├── i18n/
│   │   ├── results/
│   │   ├── styles/
│   │   ├── timeHistory/
│   │   ├── types/
│   │   ├── verification/
│   │   └── viewer/
│   └── tests/
│       └── e2e/
├── schemas/
└── scripts/
```

## 2. 技術スタック

| 項目 | 値 | 出典 |
|---|---|---|
| React | ^19.0.0 | frontend/package.json L31 |
| TypeScript | ^5.8.0 | frontend/package.json L35 |
| Router | 未導入（react-router-dom なし） | frontend/package.json |
| 状態管理 | React useState のみ（Context/Zustand/Redux なし） | frontend/src/App.tsx |
| Test Runner | vitest ^4.1.8 | frontend/package.json L48 |
| 3D | three ^0.184.0 + @react-three/fiber ^9.6.1 + @react-three/drei ^10.7.7 | frontend/package.json L26-34 |
| i18n | 自前（ja.ts + locales/ja.json） | frontend/src/i18n/ja.ts |
| ビルドツール | vite ^7.0.0 | frontend/package.json L36 |

## 3. 既存 ProjectState 型

ファイル: `frontend/src/types.ts` L156-189

```ts
export type ProjectModel = {
  project: ProjectInfo;
  units: {
    length: string;
    force: string;
    moment: string;
    modulus: string;
    area: string;
    inertia: string;
  };
  nodes: NodeItem[];
  materials: Material[];
  sections: Section[];
  members: Member[];
  supports: Support[];
  loadCases: LoadCase[];
  nodalLoads: NodalLoad[];
  memberLoads: MemberLoad[];
  massCases?: MassCase[];
  groundMotions?: Array<{
    id: string;
    name?: string;
    direction: "X" | "Y" | "Z";
    timeStep: number;
    duration?: number;
    unit: "m/s2" | "gal";
    samples: number[];
  }>;
  analysisSettings: AnalysisSettings;
  /** Persisted latest results. The MVP only persists the time history result. */
  analysisResults?: {
    timeHistory?: TimeHistoryResult | null;
  };
};
```

必須プロパティ / 任意プロパティの一覧:

| プロパティ | 型 | 必須? |
|---|---|---|
| project | ProjectInfo | YES |
| units | { length, force, moment, modulus, area, inertia } | YES |
| nodes | NodeItem[] | YES |
| materials | Material[] | YES |
| sections | Section[] | YES |
| members | Member[] | YES |
| supports | Support[] | YES |
| loadCases | LoadCase[] | YES |
| nodalLoads | NodalLoad[] | YES |
| memberLoads | MemberLoad[] | YES |
| massCases | MassCase[] | NO |
| groundMotions | Array<{...}> | NO |
| analysisSettings | AnalysisSettings | YES |
| analysisResults | { timeHistory?: TimeHistoryResult } | NO |

## 4. 既存解析 API

### 4.1 関数シグネチャ

| 関数名 | 配置 | 入力型 | 出力型 | 同期/非同期 |
|---|---|---|---|---|
| `apiClient.runAnalysis` | frontend/src/api/client.ts L180 | ProjectModel | Promise\<AnalysisRunResponse\> | 非同期 |
| `apiClient.runEigenAnalysis` | frontend/src/api/client.ts L187 | ProjectModel | Promise\<EigenRunResponse\> | 非同期 |
| `apiClient.runResponseSpectrumAnalysis` | frontend/src/api/client.ts L191 | ProjectModel | Promise\<ResponseSpectrumRunResponse\> | 非同期 |
| `apiClient.runInfluenceAnalysis` | frontend/src/api/client.ts L198 | ProjectModel | Promise\<InfluenceRunResponse\> | 非同期 |
| `apiClient.runMovingLoadAnalysis` | frontend/src/api/client.ts L202 | ProjectModel + MovingLoadCase | Promise\<MovingLoadRunResponse\> | 非同期 |
| `useTimeHistoryAnalysis().run` | frontend/src/timeHistory/useTimeHistoryAnalysis.ts L33 | ProjectModel | Promise\<TimeHistoryAnalysisEnvelope\> | 非同期 |
| `apiClient.validateProject` | frontend/src/api/client.ts L174 | ProjectModel | Promise\<ValidationResponse\> | 非同期 |
| `apiClient.saveProject` | frontend/src/api/client.ts L209 | fileName + ProjectModel | Promise\<SaveProjectResponse\> | 非同期 |
| `apiClient.loadProject` | frontend/src/api/client.ts L213 | fileName | Promise\<ProjectModel\> | 非同期 |

### 4.2 型定義の引用

```ts
// frontend/src/api/client.ts L3-6
type AnalysisRunResponse = {
  result: AnalysisResult;
  csv: ResultExports | null;
};

// frontend/src/api/client.ts L8-10
type EigenRunResponse = {
  result: AnalysisResult;
};

// frontend/src/timeHistory/types.ts L7-13
export type TimeHistoryAnalysisEnvelope = AnalysisResult & {
  analysisSummary: AnalysisResult["analysisSummary"] & {
    analysisType: "time_history";
    solver: "newmark_beta";
  };
  timeHistoryResult: TimeHistoryResult | null;
};

// frontend/src/types.ts L509-515
export type TimeHistoryResult = {
  meta: TimeHistoryResultMeta;
  time: number[];
  displacements: Record<string, number[]>;
  velocities: Record<string, number[]>;
  accelerations: Record<string, number[]>;
};

// frontend/src/types.ts L496-507
export type TimeHistoryResultMeta = {
  analysisId: string;
  status: "success" | "failed";
  method: string;
  timeStep: number;
  duration: number;
  beta?: number;
  gamma?: number;
  damping?: Record<string, unknown>;
  groundMotions?: Array<Record<string, unknown>>;
  sampleCount: number;
};
```

### 4.3 例外の投げ方

```ts
// frontend/src/api/client.ts L127-137
export class ApiClientError extends Error {
  readonly status: number | null;
  readonly code: string;

  constructor(message: string, code: string, status: number | null = null) {
    super(message);
    this.name = "ApiClientError";
    this.code = code;
    this.status = status;
  }
}

// frontend/src/api/client.ts L148-157
async function fetchJson(url: string, init?: RequestInit): Promise<Response> {
  try {
    return await fetch(resolveApiUrl(url), init);
  } catch (error) {
    throw new ApiClientError(
      error instanceof Error ? error.message : "Network request failed.",
      "NETWORK_ERROR",
    );
  }
}
```

## 5. 既存時刻歴応答解析の呼び出し例

ファイル: `frontend/src/timeHistory/useTimeHistoryAnalysis.ts` L33-65

```ts
const run = useCallback(async (project: ProjectModel, overrides: Omit<TimeHistoryAnalysisRequest, "project"> = {}) => {
  setState((current) => ({ ...current, loading: true, error: null }));
  try {
    const requestProject = migrateTimeHistorySettings(cloneProject(project));
    const response = await fetch(resolveApiUrl(endpoint), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ project: requestProject, ...overrides }),
    });
    const payload = (await response.json().catch(() => null)) as TimeHistoryAnalysisResponse | null;
    if (!response.ok || !payload?.result) {
      throw httpError(response, payload);
    }
    const result = payload.result;
    const failedEnvelope = result.analysisSummary.status === "failed";
    const error = failedEnvelope ? result.errors[0] ?? envelopeError() : null;
    setState({ loading: false, result, error });
    if (!failedEnvelope) {
      onSuccess?.(result);
    }
    return result;
  } catch (error) {
    const structured = toStructuredMessage(error);
    setState({ loading: false, result: null, error: structured });
    throw error;
  }
}, [onSuccess]);
```

* 入力波形フォーマット: dt=0.01s（任意）、単位 m/s2 または gal、配列長は解析時間に依存
* 結果から節点変位時系列を取り出す方法:

```ts
// TimeHistoryResult.displacements は Record<string, number[]> 形式
// キーは "nodeId_ux" / "nodeId_uy" / "nodeId_uz" の形式
// 値は各時刻での変位値の配列

// frontend/src/timeHistory/timeHistoryAnimation.ts L42-48
export type ComputeTimeHistoryOverrideArgs = {
  project: ProjectModel | null;
  result: TimeHistoryResult | null | undefined;
  timeIndex: number;
  displacementScale: number;
  displacementMode?: TimeHistoryDisplacementMode;
};
```

## 6. 既存ビューア / アニメーション

| 項目 | 値 |
|---|---|
| 主要コンポーネント名 | `TimeHistoryModelAnimation` (frontend/src/timeHistory/TimeHistoryModelAnimation.tsx) |
| props | `{ project: ProjectModel; result: TimeHistoryResult; onOverrideChange?: (override: Map<string, {x,y,z}> \| null) => void }` |
| 変位系列を直接受け取れるか | YES — `TimeHistoryResult.displacements` から `computeTimeHistoryNodeOverride` でMap変換 |
| アニメーション再生 API | `requestAnimationFrame` + `setCurrentIndex` (内部クロック駆動) |

追加ビューア情報:
- `Viewer3D` (frontend/src/viewer/Viewer3D.tsx) — メインの3Dビューア、静的/動的解析結果表示
- `@react-three/fiber` の `Canvas` を使用
- `timeHistoryNodeOverride` プロパティで変位オーバーディレクト対応済み

## 7. 既存 autosave

* 使用中の localStorage キー一覧
  * `spacer-clone:viewer:displaySize:v1` (frontend/src/viewer/settings/displaySize.ts L17)
  * `spacer-clone:viewer:spacer-axis-swap` (frontend/src/viewer/coordinateTransform.ts L18)
* 保存形式: JSON文字列（生JSON、Base64/圧縮なし）
* `spacer_clone_level0_autosave` との衝突: なし（既存キーは全て `spacer-clone:` プレフィックス）

バックエンド側のautosave:
- `apiClient.autosaveProject(project)` → POST `/api/projects/autosave`
- `apiClient.loadAutosaveCandidate()` → GET `/api/projects/autosave`
- ファイル名: `autosave.json`（バックエンドdata/projects配下）

## 8. 既存ルート一覧

| パス | コンポーネント / 機能 |
|---|---|
| `/` | メインアプリ（App.tsx） |
| `/th/run` | 時刻歴応答解析（routeRedirect.ts L2） |
| `/th/output-targets` | レガシーパス（→ `/th/run` にリダイレクト） |
| `/compare` | モデル比較モード（App.tsx L71） |

`/level0` 配下が未使用であること: YES

## 9. 既存テストのベースライン

* 実行コマンド: `npm test -- --run`
* 結果: passed 500 / failed 0 / skipped 0 / 所要 5.46s
* 赤のテスト一覧: なし

## 10. i18n 機構

* 既存翻訳機構: あり（自前実装）
* 詳細:
  - `frontend/src/i18n/ja.ts` — 日本語UI文字列をオブジェクトとして定義（1162行）
  - `frontend/src/i18n/locales/ja.json` — JSON形式のロケールファイル
  - `react-i18next` / `i18next` は未導入
  - `import locale from "../i18n/locales/ja.json"` で直接インポート

## 11. v1.2 §15 解析実行アダプタとの整合性

設計書 §15.2 の `Level0AnalysisInput` / `Level0AnalysisOutput` を、
本リポジトリの実型でそのまま満たせるか評価:

| 項目 | 評価 | 備考 |
|---|---|---|
| `ProjectState` 型はそのまま再利用可能か | YES | `ProjectModel` が相当。プロパティ名の差異あり（設計書: `ProjectState`、実装: `ProjectModel`） |
| `ExistingAnalysisResult` 相当の型は存在するか | YES | 名前: `AnalysisResult` (frontend/src/types.ts L205) |
| `animationSeries` 相当のフィールドはあるか | NO | `TimeHistoryResult.displacements` (Record<string, number[]>) が相当するが、フィールド名が異なる |
| 同期/非同期の前提が §15 と一致するか | YES | 既存APIは全て非同期（Promise） |

矛盾:
- §15.2 の `ProjectState` は実装の `ProjectModel` と名前が異なる（再利用可能だが型名の統一が必要）
- §15.2 の `animationSeries` フィールドは存在しない。`TimeHistoryResult.displacements` が同等の機能を持つ

## 12. 設計書 §24.2 への回答

* 既存解析 API は同期 / 非同期 → **非同期**（全て `Promise<>` を返す）
* 質量の定義場所 → `ProjectModel.massCases` (frontend/src/types.ts L174)、`MassCase.items` に `MassItem[]` として定義
* 減衰の定義場所 → `AnalysisSettings.timeHistory.damping` (frontend/src/types.ts L144)、Rayleigh減衰（alpha, beta）
* 既存波形入力の時刻刻み・継続時間 → dt=任意（デフォルト0.01s）、duration=任意（AnalysisSettings.timeHistory.duration）
* 既存ビューアが節点変位系列を直接受け取れるか → **YES** — `TimeHistoryModelAnimation` は `TimeHistoryResult` を直接受け取り、`computeTimeHistoryNodeOverride` で変位マップに変換
* `spacer_clone_level0_autosave` のキー衝突 → **なし**（既存キーは全て `spacer-clone:` プレフィックス）

## 13. 人間への質問リスト

設計書 §0.5「不明時停止原則」に基づき、推測で埋めず以下を質問します:

1. **§15.2 の `ProjectState` 型名について**: 設計書では `ProjectState` と記載されているが、実装では `ProjectModel` という名前。T01〜T14 の全タスクで `ProjectModel` をそのまま使用してよいか、それとも設計書に合わせてエイリアスを定義するか？
   - 確認したい選択肢:
     - [ ] A: 実装の `ProjectModel` をそのまま使用（推奨）
     - [ ] B: `type ProjectState = ProjectModel` のエイリアスを定義
     - [ ] C: その他

2. **§15.2 の `animationSeries` フィールドについて**: 設計書では `Level0AnalysisOutput.animationSeries` とあるが、既存の `TimeHistoryResult.displacements` (Record<string, number[]>) が同等機能を持つ。このフィールドをそのまま使用してよいか？
   - 確認したい選択肢:
     - [ ] A: `TimeHistoryResult.displacements` をそのまま使用（推奨）
     - [ ] B: 新しい `animationSeries` フィールドを追加
     - [ ] C: その他

## 14. 次タスク T02 に進むための前提条件チェック

| チェック項目 | 結果 |
|---|---|
| §24.1 の 8 項目すべて記入済み | YES |
| §24.2 の 5 項目すべて回答済み（または質問化済み） | YES |
| §15 との矛盾なし、または質問化済み | YES（質問 #1, #2 で報告済み） |
| 既存テストの赤を増やしていない（コードを触っていない） | YES |

すべて YES の場合のみ、人間レビュー後に T02 へ進めます。
