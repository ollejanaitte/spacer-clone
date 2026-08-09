# Required Source Categories for Curved Bridge Development

## Layer Definitions (L0–L10)

### L0 — 適用範囲・用語 (Applicability and Terminology)

| Field | Value |
|---|---|
| **required_for** | Scoping and terminology |
| **minimum_content** | 適用範囲と用語の定義 |
| **preferred_content** | 曲線橋の設計体系 |
| **current_candidate** | spacer-clone docs |
| **current_status** | MISSING |
| **blocks_geometry** | false |
| **blocks_model** | false |
| **blocks_analysis** | false |
| **blocks_design_check** | false |
| **blocks_report** | false |
| **priority** | P1 |

---

### L1 — 平面線形・座標 (Horizontal Alignment and Coordinates)

| Field | Value |
|---|---|
| **required_for** | Horizontal alignment implementation |
| **minimum_content** | 単円曲線・クロソイド・複合線形の定義、測点・方位角・曲率、offset line・主桁線、横断線・片勾配・拡幅、縦断、局所T/N/B・3D座標、曲率ゼロ極限 |
| **preferred_content** | 複合線形の組合せ規則、C0/C1/G2連続性、曲線上の局所フレーム、数値安定性 |
| **current_candidate** | liner core geometry/ (arc.ts, clothoid.ts, horizontal.ts, vertical.ts), liner core station/, liner core coordinate3d.ts, liner core crossfallResolution.ts, liner core vector.ts |
| **current_status** | AVAILABLE (RSQ-L1-05 offset line is PARTIAL) |
| **blocks_geometry** | true |
| **blocks_model** | false |
| **blocks_analysis** | false |
| **blocks_design_check** | false |
| **blocks_report** | false |
| **priority** | P0 |

---

### L2 — 橋梁幾何・部材配置 (Bridge Geometry and Member Arrangement)

| Field | Value |
|---|---|
| **required_for** | Structural model geometry and member layout |
| **minimum_content** | 主桁節点、部材局所軸、横桁方向、対傾構、横構、偏心、支承方向、剛域、多主桁、連続曲線橋 |
| **preferred_content** | 曲線上の節点生成、曲率に沿った局所軸、ラジアル方向の横桁、曲線上の配置規則、偏心の定義 |
| **current_candidate** | liner core gridGeneration.ts, frame contracts 04_input_schema.md, liner schema CrossBeamDraft, apollo crossFrameAttachmentModel.ts, apollo bracingSystemGeometry, apollo bridgeStructure, liner schema PierBearingOffsetDraft, liner grid multiple offsets, apollo continuous_girder |
| **current_status** | PARTIAL (many items SCHEMA_ONLY or MISSING) |
| **blocks_geometry** | true |
| **blocks_model** | true |
| **blocks_analysis** | false |
| **blocks_design_check** | false |
| **blocks_report** | false |
| **priority** | P0 |

---

### L3 — 立体骨組モデル (3D Frame Model)

| Field | Value |
|---|---|
| **required_for** | Node/member generation, 6DOF, local coordinate systems, element connectivity, curved grid generation |
| **minimum_content** | 節点・部材生成、立体骨組モデル |
| **preferred_content** | 6自由度、6成分断面力 |
| **current_candidate** | frame contracts/, frame result schema |
| **current_status** | AVAILABLE |
| **blocks_geometry** | false |
| **blocks_model** | false |
| **blocks_analysis** | false |
| **blocks_design_check** | false |
| **blocks_report** | false |
| **priority** | P0 |

---

### L4 — 荷重・境界条件 (Loads and Boundary Conditions)

| Field | Value |
|---|---|
| **required_for** | Load application and boundary definition |
| **minimum_content** | 死荷重、活荷重、遠心荷重、制動荷重、風荷重、温度荷重、沈下荷重、地震荷重、支承条件、反力6成分 |
| **preferred_content** | 曲線桁の死荷重、曲線上の移動載荷、遠心・制動・風荷重の算定、曲線橋の支承配置 |
| **current_candidate** | apollo loads/, frame influence-moving-load.md, frame support definitions, frame result schema |
| **current_status** | PARTIAL (several load types MISSING, bearing conditions PARTIAL) |
| **blocks_geometry** | false |
| **blocks_model** | true |
| **blocks_analysis** | true |
| **blocks_design_check** | false |
| **blocks_report** | false |
| **priority** | P0 |

---

### L5 — 構造解析理論 (Structural Analysis Theory)

| Field | Value |
|---|---|
| **required_for** | Analysis theory and solver capability |
| **minimum_content** | 3D frame、6DOF、6成分断面力、Saint-Venantねじり、そりねじり、二軸曲げ、横構二次応力、影響線、移動荷重、支承ばね |
| **preferred_content** | Vlasov理論、二軸曲げの組合せ、曲線による横構の二次応力 |
| **current_candidate** | frame solver, examples cantilever_torsion.json, frame influence-analysis.md, frame influence-moving-load.md |
| **current_status** | PARTIAL (warping torsion, biaxial bending secondary stress, bearing spring all MISSING) |
| **blocks_geometry** | false |
| **blocks_model** | false |
| **blocks_analysis** | true |
| **blocks_design_check** | false |
| **blocks_report** | false |
| **priority** | P0 |

---

### L6 — 断面力・符号規約 (Section Forces and Sign Conventions)

| Field | Value |
|---|---|
| **required_for** | Sign conventions and rounding rules |
| **minimum_content** | 断面力の正方向、符号規約、丸め規則 |
| **preferred_content** | 曲線部材の符号規約、中間値の丸め |
| **current_candidate** | frame result schema, frame contracts |
| **current_status** | PARTIAL |
| **blocks_geometry** | false |
| **blocks_model** | false |
| **blocks_analysis** | false |
| **blocks_design_check** | false |
| **blocks_report** | false |
| **priority** | P0 |

---

### L7 — 設計照査 (Design Checks)

| Field | Value |
|---|---|
| **required_for** | Design verification |
| **minimum_content** | 主桁照査、二軸曲げ照査、ねじり・そり応力度、横倒れ・局部座屈、疲労、横桁・対傾構照査、横構照査、支点部・補剛材・添接、支承照査、たわみ・キャンバー |
| **preferred_content** | 曲げ+ねじり+軸力の組合せ、相関照査、そり応力度の算定、二次応力を含む照査 |
| **current_candidate** | apollo step5_design |
| **current_status** | MISSING (all items MISSING, straight-only where exists) |
| **blocks_geometry** | false |
| **blocks_model** | false |
| **blocks_analysis** | false |
| **blocks_design_check** | true |
| **blocks_report** | false |
| **priority** | P0 |

---

### L8 — 計算書 (Calculation Report)

| Field | Value |
|---|---|
| **required_for** | Report generation |
| **minimum_content** | 計算書の章構成 |
| **preferred_content** | 中間値・符号・丸めの明記 |
| **current_candidate** | apollo report model |
| **current_status** | PARTIAL (straight only) |
| **blocks_geometry** | false |
| **blocks_model** | false |
| **blocks_analysis** | false |
| **blocks_design_check** | false |
| **blocks_report** | true |
| **priority** | P1 |

---

### L9 — 図面・製作情報 (Drawings and Fabrication Information)

| Field | Value |
|---|---|
| **required_for** | Drawing and fabrication output |
| **minimum_content** | 一般図・部材表 |
| **preferred_content** | 製作図・溶接詳細 |
| **current_candidate** | apollo drawing model |
| **current_status** | PARTIAL (straight only) |
| **blocks_geometry** | false |
| **blocks_model** | false |
| **blocks_analysis** | false |
| **blocks_design_check** | false |
| **blocks_report** | true |
| **priority** | P1 |

---

### L10 — 検証用計算例・Golden (Verification Examples and Golden Data)

| Field | Value |
|---|---|
| **required_for** | Golden verification |
| **minimum_content** | 単純曲線鈑桁の中間値、節点表・部材表・局所軸 |
| **preferred_content** | 連続曲線鈑桁の計算例、局所軸の定義 |
| **current_candidate** | examples/verification/ (straight only) |
| **current_status** | MISSING |
| **blocks_geometry** | false |
| **blocks_model** | false |
| **blocks_analysis** | false |
| **blocks_design_check** | false |
| **blocks_report** | false |
| **priority** | P0 |

---

## Priority Summary

| Priority | Layers | Rationale |
|---|---|---|
| **P0** | L1, L2, L3, L4, L5, L6, L7, L10 | Blocks geometry/model/analysis/design_check — critical path for curved bridge capability |
| **P1** | L0, L8, L9 | Important but non-blocking — documentation, report, and drawing layers |