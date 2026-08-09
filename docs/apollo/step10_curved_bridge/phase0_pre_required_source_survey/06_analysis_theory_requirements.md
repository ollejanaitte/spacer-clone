# Analysis Theory Requirements for Curved Bridges

## Current Capability

The solver provides:

- **3D frame (6DOF per node)**: Translation (UX, UY, UZ) + Rotation (RX, RY, RZ)
- **Influence line generation**: For any response quantity
- **Moving load (MVP)**: Basic live load positioning and enveloping
- **Saint-Venant torsion**: Uniform torsion (St. Venant) for closed and open sections
- **Eigenvalue analysis**: Natural frequencies and mode shapes
- **Response spectrum analysis**: Seismic response using CQC/SRSS

## What's Needed for Curved Bridge

### Warping Torsion (Vlasov Theory)

Curved steel I-girders are **open sections** that experience significant warping torsion:

- Warping normal stress (σw) due to constrained torsion
- Warping shear stress (τw)
- Bimoment (B) as a section force
- Warping statical moment (Ww)
- 7th DOF (warping DOF, typically denoted as θ'' or ω) required per node

**Current limitation**: The solver is 6DOF-per-node. Warping torsion is not implemented. For curved I-girders with small to medium radius, warping stress can exceed 30% of total stress. Ignoring warping is unconservative.

### Biaxial Bending Interaction

Curved girders experience biaxial bending due to curvature:

- Mx (major axis bending) + Mz (minor axis bending) from torsion
- Combined stress check: σ = Mx/Zx + Mz/Zz + B/Ww
- Current implementation: Mx only (major axis). Minor axis bending not connected to torsion.

### Secondary Stress in Lateral Bracing

Curved bridges develop secondary stresses in lateral bracing members:

- Lateral bracing resists torsional deformation
- Bracing members develop axial forces proportional to curvature
- These forces must be computed and checked in bracing design
- Current: no lateral bracing model in structural analysis

### Centrifugal Load Effect

- Moving vehicles on curved bridges generate centrifugal force (horizontal, outward)
- Centrifugal force = (W × V²) / (127 × R) where W = vehicle weight, V = speed (km/h), R = radius (m)
- Applied at 1.8m above road surface (specified in Japanese standards)
- Causes additional torsion and lateral bending

### Moving Load on Curved Alignment

- Current moving load MVP assumes straight alignment
- On curved alignment, load position must account for curvature
- Influence lines for curved girders differ from straight girders

## Gap Summary

| Feature | Status |
|---------|--------|
| 3D frame (6DOF) | ✅ IMPLEMENTED |
| Saint-Venant torsion | ✅ IMPLEMENTED |
| Influence line / moving load | ✅ PARTIAL (straight only) |
| Eigen / response spectrum | ✅ IMPLEMENTED |
| Warping torsion (7DOF) | ❌ NOT IMPLEMENTED |
| Biaxial bending interaction | ❌ NOT IMPLEMENTED |
| Secondary stress in bracing | ❌ NOT IMPLEMENTED |
| Centrifugal load | ❌ NOT IMPLEMENTED |
| Moving load on curve | ❌ NOT IMPLEMENTED |

**Gap: Significant.** The current solver is a 6DOF-per-node frame solver. Curved I-girder bridges typically require warping (7DOF) or shell element analysis. Adding warping torsion to the solver is a fundamental theoretical extension requiring:

1. Warping DOF (7th DOF) in element formulation
2. Warping section properties (Iw, Ww, Sw)
3. Bimoment as a section force output
4. Warping stress recovery
5. Verification against known solutions (Vlasov beam, curved beam theory)