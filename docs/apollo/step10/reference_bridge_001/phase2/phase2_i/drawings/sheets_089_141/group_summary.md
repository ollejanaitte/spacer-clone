# Group Summary: Sheets 89-141

## Processing Method
- Text extraction: `pdftotext -layout` (PDF pages 91-143 = sheets 89-141)
- 53 sheets processed across 16 drawing groups
- 14,871 lines of layout text extracted

## Extraction Status

| Group | Sheets | Status |
|-------|--------|--------|
| 伸縮装置 (Expansion joints) | 89-92 | TEXT_EXTRACTED |
| 壁高欄配筋図 (Parapet reinforcement) | 93-99 | TEXT_EXTRACTED |
| 照明受台配筋図 (Lighting pedestal) | 100 | TEXT_EXTRACTED |
| 上部工排水装置 (Deck drainage) | 101-111 | TEXT_EXTRACTED |
| 下部工排水装置 (Substructure drainage) | 112-114 | TEXT_EXTRACTED |
| 橋面排水工 (Bridge deck drainage) | 115 | TEXT_EXTRACTED |
| 上部工検査路 (Superstructure inspection) | 116-125 | TEXT_EXTRACTED |
| 下部工検査路 (Substructure inspection) | 126-130 | TEXT_EXTRACTED |
| 法面階段 (Slope stairs) | 131 | TEXT_EXTRACTED |
| 落下物防止柵 (Falling object prevention) | 132 | TEXT_EXTRACTED |
| 剥落防止対策工 (Spalling prevention) | 133-134 | TEXT_EXTRACTED |
| 段差防止構造 (Step prevention) | 135-136 | TEXT_EXTRACTED |
| 橋名板・橋歴板 (Bridge nameplate) | 137 | TEXT_EXTRACTED |
| ノーズ部ガードレール (Nose guardrail) | 138-139 | TEXT_EXTRACTED |
| ノーズ部止水構造図 (Nose water stop) | 140 | TEXT_EXTRACTED |
| 架設計画図 (Erection plan) | 141 | **UNREADABLE_REQUIRES_HUMAN** |

## Sheet 141 (Erection Plan) Visual Verification Result
PDF page 143 (sheet 141) extracted as blank — only the page number `141 141` was found in the raw text. The `.pdf` file contains 143 pages total; the last page likely is a scanned raster image without an embedded text layer.

**Recommendation**: Apply OCR or perform a manual visual inspection of PDF page 143.

## Key Extracted Data by Group

### 89-92: Expansion Joints (EJ-4, PU15)
- Design conditions: 100 kN wheel load, -10°C to +40°C, 162.264 m girder length
- Movement: 153.6 mm (normal), 236.5 mm (L1 seismic longitudinal), 211.6 mm (L1 seismic transverse)
- 31-part bill of materials (sheet 90): End beam (SM490YB), Mid beam (S355J2+N), Seal rubber (CR), Box (SM490A), Springs, Bearings, etc.
- Sheet 91 cover material list: 6 items, total weight 55.47 kg per set
- Sheet 92 rebar table: D19 (64 kg), D16 (62 kg), φ6x100x100 (22 kg), total 148 kg

### 93-99: Parapet Reinforcement
- Rebar material: All SD345
- Cross-section types A and B, each quantity 1
- Cross slopes: 2.000% (A-L2), 2.025% (A-R2)

### 101-115: Drainage Systems
- Main pipes: VP200 (φ200 mm) with rubber ring joints
- Secondary pipes: VP40, VP25
- System 1 pipe length: 25,990.4 mm
- DL1-DL5 dimension table extracted (H1-H4, Z1-Z3, slope i1)
- Drainage basin spacing: 4,500-8,500 mm on A-L2/A-R2

### 126-130: Substructure Inspection Walkways
- Text extracted; ladder and platform details present

### 131-140: Miscellaneous
- Slope stairs, falling object prevention fence, spalling prevention, step prevention, nameplate, nose guardrail, nose water stop — all reference drawings

## Data Files Created
1. `sheet_elements.csv` - 53 rows (one per sheet)
2. `views.csv` - 28 rows
3. `dimensions.csv` - 32 rows
4. `annotations.csv` - 21 rows
5. `members.csv` - 42 rows
6. `tables.csv` - 6 rows (material lists, rebar schedules, pipe lists, DL tables)
7. `title_blocks.csv` - 262 rows
8. `references.csv` - 17 rows
