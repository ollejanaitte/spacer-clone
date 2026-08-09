# 06 業務解析とクイック解析の境界

> Phase 4 / Step 4-2（P6）

## 1. 概念

| | 業務解析（Business Analysis） | クイック解析（Quick Analysis） |
|---|---|---|
| businessProjectId | **持つ** | **持たない（または optional）** |
| subjectRef | bridgeProjectId / roadSectionId 等を参照 | 対象を直接指定（軽量） |
| 成果物への紐づけ | 業務成果物に紐づく | 一時的・紐づけない |
| 保存 | 業務 Project と一緒に保存 | 独立 AnalysisProject（lightweight） |
| 利用 Solver | 同一 Core（Solver は共通） | 同一 Core |

## 2. 概念上の境界

- **Analysis は BusinessProject 直下の子 Entity**（`Analyses[]`）。業務解析はここに属し、`subjectRef` で bridge/road/member を参照。
- **クイック解析は独立の lightweight AnalysisProject**。業務 Project とは別に保持され、後から業務へ取り込み可能。
- 両者は **同じ Solver/Core を使う**（解析エンジンは共通）。

## 3. 相互変換

| 操作 | 内容 |
|------|------|
| クイック解析 → 業務へ取り込み | 独立 AnalysisProject を業務に copy（ID 再発行・subjectRef 設定） |
| 業務解析 → 単独解析としてコピー | 業務から Analysis を独立 AnalysisProject へ copy |

## 4. 概念図

```mermaid
flowchart LR
  BP["BusinessProject"] -->|Analyses[]| A1["業務解析 001 (subjectRef: BridgeProject)"]
  BP -->|Analyses[]| A2["業務解析 002"]
  Q["Quick Analysis (独立 lightweight)"] -->|copy-in| A1
  A1 -->|copy-out| Q2["独立 AnalysisProject"]
  Q & A1 -->|same solver| SOLVER["共通 Solver / Core"]
```

## 5. Step 4-3 への渡し

- 保存単位：業務解析は BusinessProject 内、クイック解析は独立 AnalysisProject。
- 概念境界は明確にし、保存方式そのものは Step 4-3 で決定。
