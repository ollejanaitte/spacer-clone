# Step 4-C4 — Load Distribution Rules (DEC-S4-0010)

Development-only simplified distribution:

| Source | Rule | Share |
|--------|------|-------|
| Left/right curb, railing, optional barrier | `NEAREST_GIRDER` | 1.0 to nearest by \|Y−girderY\| |
| Median | `EQUAL_ALL_GIRDERS` | 1/N each |
| Haunch | `OWN_GIRDER` | 1.0 to mainGirderRefId |

**Nearest tie break:** lower girder index wins (deterministic).

Share sum must equal 1.0. Distributed totals must equal source total.
