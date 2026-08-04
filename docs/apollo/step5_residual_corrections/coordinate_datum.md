# Coordinate datum (cross-frame attachments)

## Canonical datum

**Depth downward from girder top-flange upper face** [m].

```
girderCenterZ = -girderDepth / 2   # existing convention
topFlangeUpperZ = girderCenterZ + girderDepth / 2
attachmentZ = topFlangeUpperZ - depthFromTop
```

## Prohibited sources

- Mesh AABB / bounds
- Screenshot pixel inference
- Invented defaults beyond explicit migration mid-flange equivalents

## Fields

- `upperAttachmentDepthFromGirderTop`
- `lowerAttachmentDepthFromGirderTop`
- `centerNodeDepthFromGirderTop` (optional; defaults to lower)
