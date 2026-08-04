# Cross-frame attachment model (Step 5-R R3 / ER-001)

## Status

- **IMPLEMENTATION_STATUS:** `PARAMETERIZED_ATTACHMENT_TOPOLOGY_IMPLEMENTED`
- **ENGINEERING_AUTHORIZATION:** `PENDING_HUMAN_ENGINEERING_REVIEW`
- Sample topology: `UNVERIFIED` / `USER_EDITABLE`

## Datum

Attachment depths are measured **downward from the girder top-flange upper face** [m].

```
z = topFlangeUpperZ - depthFromTop
topFlangeUpperZ = girderCenterZ + girderDepth / 2
```

Mesh bounds and screenshot inference are prohibited.

## Fields (`crossFrameAttachment`)

| Field | Meaning |
|-------|---------|
| `pattern` | `V` IMPLEMENTED; `INVERTED_V` / `X` PLANNED/UNAVAILABLE |
| `upperAttachmentDepthFromGirderTop` | Upper node depth |
| `lowerAttachmentDepthFromGirderTop` | Lower node depth |
| `centerNodeDepthFromGirderTop` | Optional V center; null → lower |
| `provenance` | UNVERIFIED_SAMPLE_PLACEHOLDER / USER_PROVIDED_UNVERIFIED / UNVERIFIED_MIGRATED_DEVELOPMENT |
| `status` | DEVELOPMENT |

## Schema

`1.5.0-development` adds `crossFrameAttachment`. Legacy 1.4 projects migrate mid-flange-equivalent defaults (`UNVERIFIED_MIGRATED_DEVELOPMENT`) without inventing formal values.

## UI

- `CrossFrameAttachmentInputPanel` in bridge structure panel
- Guided Mode **G09** lists attachment depths separately from cross-beam spacing

## STALE

Changing pattern or attachment depths clears `generatedAt` via `withCrossFrameAttachment`.
