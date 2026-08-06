# Chapter 2: 合成床版の設計 (Composite Deck Design) — Extraction Summary

## Scope
- PDF pages: 16–114 (printed pages 11–109)
- Sections: 2.1 一般部 (General Part, PDF 17-69), 2.2 桁端部 (Girder End, PDF 70-114)

## Content Extracted

### 2.1 一般部 (PDF 17-69 / Printed 12-64)
- Design conditions: total width 8032mm, pavement 80mm, slab spans (span 4512mm, cantilever 1760mm)
- Loads: B活荷重, wind 3.00/1.50 kN/m², collision 13.0 kN/m, no snow
- Materials: steel SM490Y (σy=355MPa), rib SS400 (σy=235MPa), rebar SD345 (σy=345MPa), concrete σck=30MPa
- Deck thickness: hc=230mm (RC slab span 222mm, support 330mm, haunch 100mm)
- Steel: bottom plate 8mm, transverse ribs 625mm@100mm×12mm, angle L75×75×9
- Studs: φ16×160mm, pitch 250mm (main) / 208mm (distribution), 2 per rib
- Rebar: D19@100 (main), D19@250 (distribution), D22@300 (haunch), D22@125 (intermediate support)
- Section force calculations: membrane action, beam action, pre/post-composite, span/cantilever/haunch
- Fatigue durability checks: stress superposition (max 72.9/44.5 N/mm²)
- Shear connector checks: stud max τ=41.8 N/mm² (span), 23.6 N/mm² (cantilever) < τa=50.0
- Load-bearing checks: limit states 1 and 3 verified OK

### 2.2 桁端部 (PDF 70-114 / Printed 65-109)
- Girder end part composite deck design
- Extraction status: INITIATED — key structural values captured from visible text

## Files Created
- `page_elements.csv`: 25 elements (sections, subsections, key structural annotations)
- `tables.csv`: 34 rows (material specs, dimensions, rebar layout, stud specs)
- `values.csv`: 38 values (all key design parameters)
- `formulas.csv`: 11 formulas (deck thickness, moments, stress checks, shear)
- `notes.csv`: 9 notes (scope, methods, references, design notes)

## Confidence
- Full-text-layer values: HIGH
- Parsed table values from structured layout: HIGH
- Section 2.2 (girder end) detailed content pending deeper extraction