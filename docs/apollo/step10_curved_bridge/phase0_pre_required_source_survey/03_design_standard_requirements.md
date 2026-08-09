# Design Standard Requirements for Curved Steel Girder Bridges

## Required Japanese Design Standards

### Road Bridge Specification (道路橋示方書)

The primary governing standard for all highway bridges in Japan. Three parts are relevant:

- **Common Part (共通編)** — General design principles, material properties, load combinations, allowable stress increases. Defines the allowable stress design framework used throughout.
- **Steel Bridge Part (鋼橋編)** — Steel girder design provisions, including curved girder-specific clauses:
  - Section 11: Curved girder design (曲線桁の設計)
  - Torsional stress check requirements
  - Lateral bracing design for curved girders
  - Cross frame spacing and stiffness requirements
  - Bearing design for curved alignment
- **Seismic Design Part (耐震設計編)** — Seismic performance requirements. Curved bridges have specific seismic behavior (rotation, unseating prevention) addressed in this part.

### Steel Bridge Design Manual (鋼橋設計便覧)

Published by Japan Road Association. Practical design guidance supplementing the specification:

- Detailed calculation procedures for curved I-girders
- Torsional moment distribution methods
- Cross frame design force calculation
- Bearing reaction distribution for curved girders
- Deflection and camber calculation for curved alignment
- Worked examples and design tables

### NEXCO Design Standards

NEXCO (Nippon Expressway Company) standards apply when the bridge is on expressways:

- NEXCO Design Standard for Steel Bridges (NEXCO 鋼橋設計要領)
- Stricter deflection limits
- Additional fatigue design requirements
- Specific detailing rules for curved girders on expressways

### Related JIS Standards

- JIS G 3106: Rolled steel for welded structure (SM400, SM490, SM520, SM570)
- JIS G 3114: Atmospheric corrosion resisting steel (SMA)
- JIS G 3136: Building structure steel (SN400, SN490)
- JIS G 3101: General steel (SS400 — limited use for bridges)

### JSCE Guidelines

- JSCE Steel Bridge Design Guidelines (鋼構造物設計指針)
- Alternative design methods and commentary
- Fatigue design guidance (鋼構造物の疲労設計指針)

## Key Design Requirements

### Allowable Stress Method

Japanese standards use allowable stress design (許容応力度法), not LRFD:

- Load combinations: Dead + Live, Dead + Live + Wind, Dead + Live + Seismic, etc.
- Allowable stress increases: 1.25 for combined loads, 1.5 for seismic, 1.7 for Level 2 seismic
- Curved girders have additional limits on combined bending + torsional stress

### Curved Girder Design Provisions

- Curvature classification: Large curvature (R < 100m), medium curvature (100m ≤ R < 300m), small curvature (R ≥ 300m)
- For large curvature: warping stress must be considered
- For medium curvature: simplified torsion check permitted
- For small curvature: straight girder design may be applicable with curvature correction

### Torsional Check Requirements

- Combined bending + torsion stress check: σ = σb + σt ≤ σa
- Warping normal stress (σw) for open section I-girders
- Saint-Venant shear stress (τsv) + warping shear stress (τw)
- Lateral bracing force due to torsion

## Status in Repository

**ALL MISSING.** No Japanese design standards are stored in the spacer-clone repository. The repository contains no reference documents, no design standard excerpts, and no compliance check rules based on Japanese standards.

## Recommendation

1. Purchase latest editions of 道路橋示方書 (Common, Steel, Seismic) from Japan Road Association
2. Obtain 鋼橋設計便覧 (latest edition)
3. Search company archive for existing licensed copies
4. For NEXCO standards, contact NEXCO design division
5. Store as reference PDFs in a `docs/standards/` directory (not committed to public repo if license restricts)