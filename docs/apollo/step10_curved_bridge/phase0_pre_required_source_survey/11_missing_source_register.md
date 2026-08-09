# Missing Source Register — Curved Bridge Development

All sources required for curved bridge development that are not present in the repository or otherwise available. Organized by priority.

---

## P0 Missing Sources (Blocks structural model or analysis spec)

### P0-1: 曲線橋の設計基準（道路橋示方書・鋼橋編・共通編）

| Field | Value |
|---|---|
| **Why** | Design standard for curved steel girder bridges |
| **Current evidence** | No Japanese design standards in repository |
| **Blocks** | design check, analysis assumptions |
| **Recommended source type** | PURCHASE_CANDIDATE |
| **Search keywords (JA)** | 道路橋示方書 鋼橋編 曲線桁 日本道路協会 |
| **Publisher candidate** | 日本道路協会 |

---

### P0-2: そりねじり理論（Vlasovねじり）

| Field | Value |
|---|---|
| **Why** | Required for curved I-girder analysis |
| **Current evidence** | 6DOF solver only, no warping DOF |
| **Blocks** | analysis |
| **Recommended source type** | LIBRARY_SEARCH_CANDIDATE / COMPANY_ARCHIVE_CANDIDATE |
| **Search keywords (JA)** | Vlasov ねじり 曲線桁 立体骨組 |

---

### P0-3: 横構二次応力の設計理論

| Field | Value |
|---|---|
| **Why** | Curved bridges develop axial forces in lateral bracing |
| **Current evidence** | No secondary stress calculation |
| **Blocks** | analysis, design check |
| **Recommended source type** | LIBRARY_SEARCH_CANDIDATE |
| **Search keywords (JA)** | 横構 二次応力 曲線橋 平面格子 |

---

### P0-4: 遠心荷重の算定式（道路橋示方書）

| Field | Value |
|---|---|
| **Why** | Required for curved bridges by Japanese standards |
| **Current evidence** | Not implemented |
| **Blocks** | analysis (load definition) |
| **Recommended source type** | PURCHASE_CANDIDATE |
| **Search keywords (JA)** | 遠心荷重 曲線橋 道路橋示方書 |

---

### P0-5: 支承方向の拘束条件（ラジアル・タンジェンシャル）

| Field | Value |
|---|---|
| **Why** | Bearing direction is fundamentally different on curved bridges |
| **Current evidence** | PierBearingOffsetDraft is scalar only |
| **Blocks** | structural model |
| **Recommended source type** | COMPANY_ARCHIVE_CANDIDATE / VENDOR_DOCUMENT_CANDIDATE |
| **Search keywords (JA)** | 支承 ラジアル方向 タンジェンシャル方向 曲線橋 |

---

### P0-6: 横桁方向の定義（ラジアル方向横桁）

| Field | Value |
|---|---|
| **Why** | Cross beam direction on curved alignment |
| **Current evidence** | CrossBeamDraft is schema only |
| **Blocks** | structural model |
| **Recommended source type** | COMPANY_ARCHIVE_CANDIDATE |
| **Search keywords (JA)** | 横桁 ラジアル方向 曲線橋 |

---

### P0-7: 曲線橋のキャンバー算定理論

| Field | Value |
|---|---|
| **Why** | Camber for curved bridges is different from straight |
| **Current evidence** | No camber calculation |
| **Blocks** | design check, drawing |
| **Recommended source type** | LIBRARY_SEARCH_CANDIDATE |
| **Search keywords (JA)** | キャンバー 曲線橋 死荷重たわみ |

---

### P0-8: 曲線橋の検証用計算例（Golden Data）

| Field | Value |
|---|---|
| **Why** | Required for verification of implementation |
| **Current evidence** | No curved bridge examples |
| **Blocks** | verification |
| **Recommended source type** | LIBRARY_SEARCH_CANDIDATE / COMPANY_ARCHIVE_CANDIDATE |
| **Search keywords (JA)** | 曲線鈑桁 設計計算例 日本道路協会 |

---

## P1 Missing Sources (Non-numeric MVP possible, but analysis cannot start)

### P1-1: 鋼橋設計便覧（日本道路協会）

| Field | Value |
|---|---|
| **Why** | Detailed design procedures for steel bridges |
| **Recommended source type** | PURCHASE_CANDIDATE |
| **Search keywords (JA)** | 鋼橋設計便覧 日本道路協会 |

### P1-2: 曲線橋の設計計算例（日本橋梁建設協会）

| Field | Value |
|---|---|
| **Why** | Reference calculation examples |
| **Recommended source type** | LIBRARY_SEARCH_CANDIDATE |
| **Search keywords (JA)** | 曲線橋 設計計算例 日本橋梁建設協会 鋼橋 |

### P1-3: 断面力の符号規約（立体骨組）

| Field | Value |
|---|---|
| **Why** | Consistent sign convention for 6 components |
| **Recommended source type** | LIBRARY_SEARCH_CANDIDATE |
| **Search keywords (JA)** | 断面力 符号規約 立体骨組 部材座標 |

### P1-4: 疲労設計のための曲線橋詳細

| Field | Value |
|---|---|
| **Why** | Fatigue details for curved bridges |
| **Recommended source type** | LIBRARY_SEARCH_CANDIDATE |
| **Search keywords (JA)** | 疲労 曲線橋 鋼橋 詳細 |

### P1-5: 温度荷重の算定と分布

| Field | Value |
|---|---|
| **Why** | Temperature effects on curved bridges |
| **Recommended source type** | LIBRARY_SEARCH_CANDIDATE |
| **Search keywords (JA)** | 温度荷重 曲線橋 鋼橋 |

### P1-6: 曲線橋の設計フローおよび設計手順書

| Field | Value |
|---|---|
| **Why** | Design workflow sequence for curved bridges differs from straight |
| **Recommended source type** | COMPANY_ARCHIVE_CANDIDATE |
| **Search keywords (JA)** | 曲線橋 設計フロー 設計手順 鋼橋 |

---

## P2 Missing Sources (Analysis possible, but design check/report blocked)

### P2-1: 曲線橋の図面テンプレート

| Field | Value |
|---|---|
| **Why** | Drawing templates for curved bridges |
| **Recommended source type** | COMPANY_ARCHIVE_CANDIDATE |
| **Search keywords (JA)** | 曲線橋 一般図 製作図 |

### P2-2: 曲線橋の計算書テンプレート

| Field | Value |
|---|---|
| **Why** | Report templates for curved bridges |
| **Recommended source type** | COMPANY_ARCHIVE_CANDIDATE |
| **Search keywords (JA)** | 計算書 曲線橋 鋼橋 |

### P2-3: NEXCO設計基準（曲線橋編）

| Field | Value |
|---|---|
| **Why** | Highway design standards |
| **Recommended source type** | PURCHASE_CANDIDATE |
| **Search keywords (JA)** | NEXCO 設計基準 曲線橋 |

### P2-4: 曲線橋の数量算出要領

| Field | Value |
|---|---|
| **Why** | Quantity takeoff rules differ for curved bridges |
| **Recommended source type** | COMPANY_ARCHIVE_CANDIDATE |
| **Search keywords (JA)** | 曲線橋 数量算出 鋼橋 数量計算 |

---

## P3 Missing Sources (Future expansion)

### P3-1: 曲線橋の耐震設計

| Field | Value |
|---|---|
| **Why** | Seismic design for curved bridges |
| **Recommended source type** | LIBRARY_SEARCH_CANDIDATE |
| **Search keywords (JA)** | 曲線橋 耐震 設計 地震応答 |

### P3-2: 曲線橋の施工・製作基準

| Field | Value |
|---|---|
| **Why** | Fabrication and construction standards |
| **Recommended source type** | LIBRARY_SEARCH_CANDIDATE |
| **Search keywords (JA)** | 曲線橋 製作 溶接 曲げ加工 |

---

## Summary

| Priority | Count | Key blockers |
|---|---|---|
| P0 | 8 | Design standards, warping torsion, lateral bracing stress, centrifugal load, bearing direction, cross-beam direction, camber theory, golden data |
| P1 | 6 | Design manual, calculation examples, sign convention, fatigue, temperature load, design workflow |
| P2 | 4 | Drawing templates, report templates, NEXCO standards, quantity takeoff |
| P3 | 2 | Seismic design, fabrication standards |
| **Total** | **20** | |