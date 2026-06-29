# project_file_format.md Update Proposal

## 蟇ｾ雎｡

- 蜈・ヵ繧｡繧､繝ｫ: `docs/liner/project_file_format.md`
- 髢｢騾｣Phase: 3.5-1
- 譖ｴ譁ｰ逅・罰: 迴ｾ蝨ｨ `liner.draft` 縺ｯ閾ｪ逕ｱ蠖｢蠑上〒縲￣hase3.5縺ｧ縺ｯdomain draft蠢・井ｿ晏ｭ倥→ `liner.draftSchemaVersion` 邂｡逅・′遒ｺ螳壹＠縺溘◆繧√・uman Decision #4, #5繧貞渚譏縺吶ｋ縲・
## 譖ｴ譁ｰ邂・園

| 迴ｾ迥ｶ遶 | 迴ｾ迥ｶ險倩ｿｰ | 譖ｴ譁ｰ蠕瑚ｨ倩ｿｰ |
|---|---|---|
| 2. Embedded in application project | `liner` 縺ｯmetadata荳ｭ蠢・| `draftSchemaVersion` 縺ｨ `domainDraft` 繧貞ｿ・・ield縺ｨ縺励※霑ｽ蜉 |
| 4. Not persisted | full intermediate縺ｯ菫晏ｭ倥＠縺ｪ縺・| domain draft縺ｯ蠢・井ｿ晏ｭ倥（ntermediate縺ｯ菫晏ｭ倥＠縺ｪ縺・→譏守｢ｺ蛹・|
| 5. JSON Schema | future location縺ｮ縺ｿ | `project.schema.json` 縺ｮ `liner.domainDraft` typed schema蛹匁婿驥昴ｒ霑ｽ險・|

## 蟾ｮ蛻・｡・
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

## 蜿ら・

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
