# SPACER Sign, Coordinate, and Member-End Conventions — DS-08

## Apollo-side observable convention

Current repository code orders node DOFs `ux, uy, uz, rx, ry, rz`, orders member DOFs I then J,
derives local x from I toward J, forms reactions as `K u - f`, and produces local I/J end actions.
These are `PROJECT_SPECIFIC` observations documented in DS-06; they are not SPACER conventions.

## Required SPACER evidence

SPACER global, local, support, DOF, I/J, member-action, reaction, and moment signs remain blocked.
Closure requires:

- fixed installed version/module/executable checksum;
- asymmetric coordinates, orientation, supports, and loads;
- positive probes for all six force/moment and displacement/rotation components;
- native full-precision outputs at both member ends and supports;
- an independently checked transformation matrix/permutation/sign vector;
- force and moment equilibrium in both representations;
- input/output and worksheet SHA-256 manifests.

## Transformation gates

Coordinate matrix `R` must satisfy `R Rᵀ = I` within a predeclared bound and `det(R)=+1`. Translation
and rotation blocks must be stated separately if conventions differ. An I/J swap requires topology
mapping evidence and cannot be inferred from a sign flip. Reaction transformation must state whether
the producer reports support-on-structure or structure-on-support.

Viewer axis-swap presentation is excluded from analysis transformation evidence. Report diagram
orientation, displayed arrows, or matching magnitudes cannot establish signs.
