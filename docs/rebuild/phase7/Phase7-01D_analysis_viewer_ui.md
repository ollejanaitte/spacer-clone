# Phase 7-01D: Analysis Viewer / UI（設計Freeze）

- Phase: 7-01 Step D
- baseline: `3b60eb11ec6e0aa049463cc99422a3c2d38abcf0`
- 日付: 2026-08-13
- 凍結: Design Decision D-12 / D-18
- 対応R: R11 / R12

## 1. 目的

既存Viewer（KEEP）をAnalysisDocument/IF3結果へ正式接続し、
FEM表示・結果表示・stale/unavailable表示の契約を凍結する。

## 2. 基本原則（Freeze）

- **共通renderCoordinate使用**：viewerはproject-global座標（x沿線/y横断/z up）で表示。
  display-only座標変換（Y/Z swap等）はviewer層のみ（AnalysisDocumentを変更しない・D-18）。
- **Viewer都合でAnalysisDocumentを変更しない**。
- Viewerは表示専用（解析はbackend）。

## 3. 表示項目（Freeze）

| 項目 | 表示 | 実装 |
|---|---|---|
| FEM node | sphere+label（AnalysisDocument nodes） | NodeRenderer（KEEP） |
| member | line+方向+force色（members） | MemberRenderer（KEEP） |
| support | fixed/pinned/roller glyph（supports） | SupportRenderer（KEEP・springは別glyph） |
| spring / elastic support | バネ表示（springs・foundationSprings） | **新規renderer**（Phase 7-02） |
| bearing | bearing seat表示（bearings） | **新規renderer**（Phase 7-02） |
| undeformed shape | モデル形状 | SceneBuilder（KEEP） |
| deformed shape | displacement×scale（eigen/spectrum対応） | DeformedShapeRenderer（KEEP） |
| reaction | 反力arrows（reactions） | ResultDiagramRenderer（KEEP） |
| N / Q / M / T | 部材force図（memberForces） | ResultDiagramRenderer（KEEP） |
| result color map | N/Vy/Vz/My/Mz/Mt | memberForceColorMap（KEEP） |
| load case選択 | loadCases / COMBO-1選択 | resultViewModel loadCaseId filter（KEEP+ADAPT） |
| combination選択 | COMBO-1結果 | **新規**（combinationId） |
| result status | SUCCEEDED/FAILED/STALE/... | if3ResultGate（KEEP）+availability |
| stale/unavailable表示 | STALE/NOT_AVAILABLE banner | **新規**（Phase 7-02） |

## 4. データ接続（Freeze）

```
AnalysisDocument（正本）
  ├─ nodes/members/supports/springs/bearings → 3D表示（viewer読み取り専用）
  └─ resultReferences → IF3 result → ResultViewModel → Viewer
```

- ViewerはAnalysisDocument + IF3 resultをpropsで受領（既存Viewer3DのIF3 gate・extractLinearStaticを継続使用）。
- source entity ID表示（node/member/supportのsourceEntityId）→ 上流追跡（R12・D-11）。

## 5. Result選択（Freeze）

| 選択 | 動作 |
|---|---|
| loadCase | resultViewModel `loadCaseId` filter（KEEP） |
| combination | COMBO-1合成結果をcase選択と同様に表示（新規・Phase 7-02） |
| eigen mode / RS | 既存eigen/RS VM（KEEP） |
| timeHistory | 既存TH UI（KEEP） |

## 6. Status表示（Freeze）

| 状態 | 表示 |
|---|---|
| VALID / SUCCEEDED | 正常表示・export可 |
| STALE | **STALE banner**・export不可（authoritative gate・KEEP） |
| FAILED / INVALID | error表示（成功表示しない・R21整合） |
| MISSING / NOT_AVAILABLE | unavailable表示 |
| UNSUPPORTED | unsupported表示 |

## 7. fail-closed

- 結果がない状態で「解析済み」表示しない。
- STALE結果をauthoritative扱いしない（IF3 gate KEEP）。

## 8. tests観点

- spring/bearing表示（新renderer）
- combination選択
- STALE/unavailable表示
- renderCoordinate（表示座標とAnalysisDocument座標の分離）
- 既存viewer tests（KEEP）回帰
