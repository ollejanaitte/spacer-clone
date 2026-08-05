# G0-A Viewer / STL / Quantity Trace

## Haunch Volume

| Source | Haunch Volume Formula | Uses Exact TRAPEZOID? |
|--------|----------------------|----------------------|
| Viewer | avgWidth × height × length | NO — average of top and bottom width |
| STL export | avgWidth × height × length | NO — average of top and bottom width |
| Quantity model | exact trapezoidal prism | YES — `0.5 × (topWidth + bottomWidth) × height × length` |

**Verdict: KNOWN_LIMITATION — Viewer and STL use average-width box. Quantity model uses exact area. Documented in Step 4-C closeout.**

## Deck Volume

| Source | Deck Volume Formula | Includes Haunch? |
|--------|--------------------|-----------------|
| Viewer | width × deckThickness × bridgeLength | NO — separate solid |
| STL export | width × deckThickness × bridgeLength | NO — separate solid |
| Quantity model | width × deckThickness × bridgeLength | NO — separate line item |

**Verdict: CONSISTENT — deck volume is independent of haunch in all models.**

## Cross-Frame Entity Consistency

| Entity Type | Canonical (BSDD) | Viewer Solids | STL Solids | Quantity |
|-------------|-----------------|---------------|------------|----------|
| SwayBracing | YES (per station) | V-diagonals | V-diagonals | Counted |
| BraceMember (diagonal) | 2 per bay per station | 2 solids | 2 solids | Counted |
| BraceMember (horizontal) | **0** | **0** | **0** | **0** |
| CrossBeam | YES (per station) | YES | YES | Counted |
| LowerLateral | YES (if enabled) | X-diagonals | X-diagonals | Counted |
| UpperLateral | YES (if enabled) | X-diagonals | X-diagonals | Counted |

**Verdict: CONSISTENT — all models agree on the current entity set. Missing horizontal member is absent from all models equally.**