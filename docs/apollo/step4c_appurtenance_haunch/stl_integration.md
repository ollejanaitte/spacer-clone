# Step 4-C2 — STL Integration

## Behavior

- Appurtenance and haunch solids export with existing Apollo binary STL path
- Visibility groups: `appurtenances`, `rc-deck-haunches`
- Default include when toggles are ON; EXPLICIT_NONE entities absent from model → absent from STL
- STALE / generation-current guard unchanged (solids only when BSDD generation is current)
- Manifest entityCounts include `appurtenances` and `haunches`

## Checks

- Finite vertices / no NaN
- Triangle validation
- Entity presence parity with visualization solids
- Existing girder/deck STL regression retained
