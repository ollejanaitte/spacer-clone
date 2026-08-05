# Candidate Topologies

## T-A: Horizontal Bottom Chord at lowerZ (Recommended)

```
     leftTop ──── rightTop        (upperZ)
        ╲       ╱
         ╲     ╱
          ╲   ╱
           ╲ ╱
  leftBottom──midBottom──rightBottom  (centerZ = lowerZ, must match)
  [horizontal chord: leftBottom → rightBottom]
```

- Bottom chord endpoints: `leftBottom = [station, leftY, centerZ]`, `rightBottom = [station, rightY, centerZ]`
- `centerNodeDepthFromGirderTop` must equal `lowerAttachmentDepthFromGirderTop`
- Mid-bottom node sits on the bottom chord (at center)
- 3 BraceMembers per bay: 2 diagonals + 1 horizontal
- **Requires validation**: centerNodeDepth must equal lowerAttachmentDepth

## T-B: Horizontal Bottom Chord at centerZ (independent)

```
     leftTop ──── rightTop        (upperZ)
        ╲       ╱
         ╲     ╱
          ╲   ╱
           ╲ ╱
  leftBottom──midBottom──rightBottom  (centerZ, independent of lowerZ)
  [horizontal chord: leftBottom → rightBottom]
```

- Bottom chord uses `centerNodeDepthFromGirderTop` as its Z
- `lowerAttachmentDepthFromGirderTop` is a separate value (for a different component)
- Mid-bottom node is at the intersection of diagonals and bottom chord
- 3 BraceMembers per bay
- **No validation required** between centerNodeDepth and lowerAttachmentDepth

## T-C: Inclined Bottom Chord

```
     leftTop ──── rightTop
        ╲       ╱
         ╲     ╱
          ╲   ╱
           ╲ ╱
  leftBottom──midBottom──rightBottom  (different Z at each end)
```

- Left and right bottom attachment points may be at different Z heights
- Bottom chord is inclined (not horizontal)
- Less common in practice; only relevant for non-uniform attachment depths

## T-D: No Bottom Chord (Current)

```
     leftTop ──── rightTop
        ╲       ╱
         ╲     ╱
          ╲   ╱
           ╲ ╱
          midBottom
```

- Current state: 2 diagonals, no horizontal member
- Known limitation per G0-A
- Accepted if reviewer determines that the existing cross beam at different stations provides sufficient transverse connection