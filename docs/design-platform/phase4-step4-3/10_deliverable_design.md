# 10 成果物 / Deliverable 設計（P13）

> 現状散在（CSV/PDF/DXF/STL/ZIP/JSON/SVG/PNG download）→ BusinessProject 内 `deliverables/` 管理。
> Project内部保存成果物 と ユーザー明示Export外部ファイル を **区別**。

## 0. 現状（006 棚卸し §6）

- CSV/PDF/DXF/STL/ZIP/JSON/SVG/PNG が機能別ダウンロード散在。
- `apolloStlExport.ts:156-174`: `<name>.stl + <name>.apollo.json` ペア。
- `artifactBundle.ts:287`: `apollo-development-deliverables_*.zip (STORE)`。
- Replay: in-memory のみ（`apollo/replay/replay.ts`）。

## 1. 分類：Project-internal vs Explicit Export

| 種別 | 保存先 | 管理 | トリガー | 備考 |
|------|--------|------|----------|------|
| Project-internal deliverable | `deliverables/<id>/deliverable.json` + `resources/<sha>` | manifest `deliverableRefs[]` で追跡 | 業務内で生成・保存 | 正本・再生成可能 |
| Explicit Export（ad-hoc download） | browser download / Electron save dialog | project 外 | ユーザー明示 Export | 1回限り。project には入らない（unless promote） |

- 今後は「成果物を業務に紐付ける」場合は **internal** へ。「ただダウンロード」は **Export**のまま。
- 既存 download code（`resultCsvExport.ts`, `resultPdfReport.ts`, `linerFrameStl.ts`, `artifactBundle.ts`等）を**壊さず**、
  出力先を**追加**する方式（Project folder へ）に切り替える。→ EXTENSION_PROPOSAL 参照。

## 2. deliverable doc schema（canonical, persisted-result kind）

`deliverables/<deliverableId>/deliverable.json`:

```jsonc
{
  "schemaId": "spacer.contracts.persisted-result",
  "documentKind": "persisted-result",
  "documentId": "<deliverableId UUID>",
  "revisionId": 1,
  "contentChecksum": { "algorithm":"sha256","hexDigest":"<sha>" },
  "provenance": {...},
  "name": "H620164A_構造計算表",
  "kind": "csv|pdf|dxf|stl|zip|svg|png|html|json",
  "sourceRefs": [ "bridge-project:uuid-bp:5", "bridge-frame-analysis:uuid-an:2" ],
  "resourceRefs": [ { "...ImmutableResourceReference", "role":"artifact" } ],
  "generatedBy": "resultCsvExport | resultPdfReport | ...",
  "generatedAt": "ISO8601",
  "status": "draft|final|superseded",
  "checksum": { "algorithm":"sha256","hexDigest":"<body sha256>" }
}
```

- `resourceRefs` → `resources/<sha>.<ext>`（immutable binary）。body bytes は doc に埋めない。
- `sourceRefs` → BusinessProject 内の bridge/analysis/road を参照（design 出典）。

## 3. 保存・参照

- deliverable doc は BusinessProject manifest `deliverableRefs[]` で参照（DocumentReference kind=persisted-result）。
- body bytes は `resources/`。doc は metadata + refs only（FORBIDDEN_EMBEDDED_PAYLOAD_KEYS 方針準拠）。
- 再生成可能（analysis/engine から再作成）→ B RESULT なので再生成可だが、
  証跡としては **保持**（P6）。Package デフォルト include。

## 4. 運用シナリオ

- CASE A/B 完了後に成果物生成 → `deliverables/<id>/deliverable.json` 作成 + artifacts を
  `resources/` へ content-addressed 保存。manifest `deliverableRefs` 更新。
- ユーザー Export（download）→ ad-hoc。プロジェクトには紐付けない。
  （業務成果物として保存したい場合は「→ deliverable に promote」UI）
- Case 7 (copy folder): deliverables + resources 含む → そのまま開ける。
- Package export: deliverables doc + resource refs を package に含める。external resource はインライン化（P12 §5）。

## 5. 既存 download との接続（EXTENSION）

- `resultCsvExport.ts:71-75`, `resultPdfReport.ts:25`, `linerFrameStl.ts:156-174`,
  `artifactBundle.ts:287` は今後 オプションで `deliverables/<id>/` へも書き出す。
- 実装は Phase A で BusinessProject persist 動作後。今回は設計のみ。
