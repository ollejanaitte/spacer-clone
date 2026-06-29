# project_file_format.md Update Proposal

## 対象

- 元ファイル: `docs/liner/project_file_format.md`
- 関連Phase: 3.5-1
- 更新理由: 現在 `liner.draft` は自由形式で、Phase3.5ではdomain draft必須保存と `liner.draftSchemaVersion` 管理が確定したため、Human Decision #4, #5を反映する。

## 更新箇所

| 現状章 | 現状記述 | 更新後記述 |
|---|---|---|
| 2. Embedded in application project | `liner` はmetadata中心 | `draftSchemaVersion` と `domainDraft` を必須fieldとして追加 |
| 4. Not persisted | full intermediateは保存しない | domain draftは必須保存、intermediateは保存しないと明確化 |
| 5. JSON Schema | future locationのみ | `project.schema.json` の `liner.domainDraft` typed schema化方針を追記 |

## 差分

```diff
@@ 2. Embedded in application project
   "liner": {
     "schemaVersion": "0.1.0",
+    "draftSchemaVersion": "0.2.0",
     "sourceRevision": "abc123...",
     "linerModelId": "gc06",
     "coordinatePolicyId": "global",
+    "domainDraft": {
+      "id": "liner-domain-1",
+      "alignment": {},
+      "stationDefinition": {},
+      "verticalAlignment": {},
+      "crossSections": [],
+      "gridDefinitions": [],
+      "sampling": {}
+    },
     "intermediateSchemaVersion": "0.2.0"
   }

@@ 4. Not persisted
- Full `LinerIntermediateResult` blobs
+ Full `LinerIntermediateResult` blobs. Domain draft is persisted and required.

@@ 5. JSON Schema
+ Phase3.5 adds a typed discriminated-union schema for `liner.domainDraft`.
+ Legacy `liner.draft` is read-only migration input; new saves use `liner.domainDraft`.
```

## 参照

- `docs/liner/phase3.5/typed_liner_draft_schema_vnext.md`
- `docs/liner/schema_migration_policy.md`
- `docs/liner/phase3.5-0_investigation_report.md`

## Phase3.5-0.6 draftSchemaVersion Naming

**Before**: `liner.domainSchemaVersion`

**After**: `liner.draftSchemaVersion`

Reason: the name states that this version belongs to the Draft payload and distinguishes it from `liner.schemaVersion`, which is integration metadata.

```json
{
  "liner": {
    "schemaVersion": "0.1.0",
    "draftSchemaVersion": "0.2.0",
    "linerModelId": "...",
    "domainDraft": {}
  }
}
```
