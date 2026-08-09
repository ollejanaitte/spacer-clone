# 14 Quick Analysis 保存境界（P17）

> Step 4-1: A. 業務Workspace内構造解析 vs B. 業務を作らないクイック解析を分ける。
> 保存概念: 業務解析 = BusinessProject/analyses/ ; クイック解析 = 独立 AnalysisProject。
> 同じ Solver/Core を使う。相互コピー可能。

## 0. 概念

| | Business Analysis | Quick Analysis |
|---|---|---|
| businessProjectId | 持つ | 持たない（optional） |
| subjectRef | bridge/road/member を参照 | 対象を直接指定（軽量） |
| 成果物紐づけ | 業務Deliverableに紐づく | 一時的・紐づけない |
| 保存 | BusinessProject フォルダ内 | 独立 AnalysisProject フォルダ |
| Solver | 共通 Core | 共通 Core |

## 1. 保存構造

### Quick Analysis = AnalysisProject（independent lightweight）

```
quick-xxxxxx/                         ← AnalysisProject root (= QuickAnalysisProjectId)
├─ analysis-project.json              ← manifest (documentKind: "analysis-project" or "engineering-project" w/o businessProjectId)
├─ document.json                     ← bridge-frame-analysis document (canonical)
├─ attachments/                      ← 入力データ（PDF/stl/road csv）→ resources 参照
├─ results/
│   └─ <resultId>.persisted-result.json
└─ .system/{autosave,recovery,history,cache}
```

- Quick Analysis も**同じ canonical document kind**（`bridge-frame-analysis`）を使う。
  → Solver/Core 切り替え不要。
- `analysis-project.json` は BusinessProject manifest と**同じ envelope**(engineering-project)だが
  `businessProjectId: null`（業務未所属）＆ `quick: true` flag。
- 本体保存 infrastructure（RevisionedDocumentRepository / AtomicJsonStore / manifest commit）を
  **そのまま reuse**。

### Business Analysis = BusinessProject/analyses/<id>/

- BusinessProject manifest `analysisRefs[]` で参照。subjectRef で bridge/road/member を Stable ID 参照。
- 保存単位・canonical form は Quick と**同一**（bridge-frame-analysis document）。

## 2. 相互変換（copy, ID 再発行）

| 操作 | 手順 | ID policy |
|------|------|-----------|
| Quick → Business取込 | AnalysisProject.document.json を analyses/<id>//document.json へ copy。subjectRef を BusinessProject内 bridge/roadへ解決。**analysisId / documentId を再発行**。manifest analysisRefs に append+revision bump. | full re-id + ref-rewrite |
| Business Analysis → 単独コピー | analyses/<id>/ を AnalysisProject folder へ export。**analysisId 再発行**。businessProjectId=null。 | re-id |
| 持ち返し（round-trip） | copy でやり直せる。結果は **regenerable**（solver rerun）。 | — |

- copy 時 reference validation: subjectRef 先が BusinessProject 内にあるか確認（dangling → fail-closed or 手動結合）。
- Quick Analysis result は B RESULT → promote 可能（deliverable/sourceRefs）。

## 3. コード再利用

- 解析 doc = `bridge-frame-analysis` document（`contracts/bridgeFrameAnalysisDocument.ts` /
  `repository/bridgeFrameAnalysisDocumentRepository.ts`）。
- 保存 = P8/P9 の formal save + RevisionedDocumentRepository（appendRevision, expectedCurrentRevision）。
- クイック解析の Workspace UI は現行 `apollo workspace.ts:116-212`（localStorage）から
  **切り離して** BusinessProject/analyses/ へ移行（P16 migration）。UI は Step 4-1 の「クイック解析」画面。

## 4. 境界守り

- Quick Analysis は BusinessProject フォルダの**外**におく。BusinessProject が消えても Quick survives。
- 逆に Quick を BusinessProject に入れる時は **copy-in**（re-id），**move ではない**（参照先がなくなるリスク）。
- 同じ Core/Solver を使うため解析結果の golden parity 検証は共通。
