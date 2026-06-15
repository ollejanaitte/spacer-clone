import type { ProjectModel } from "../types";

export const createDefaultProject = (): ProjectModel => {
  const deckNode = (id: string, x: number, z = 0) => ({ id, x, y: BRIDGE_DECK_Y, z });
  const baseNode = (id: string, x: number, z = 0) => ({ id, x, y: 0, z });
  const nodes = [
    deckNode("G0", 0),
    deckNode("G1", 30),
    deckNode("G2", 60),
    deckNode("G3", 90),
    deckNode("G4", 120),
    deckNode("G5", 150),
    baseNode("B1", 30),
    baseNode("B2", 60),
    baseNode("B3", 90),
    baseNode("B4", 120),
  ];
  const members = [
    { id: "MG0", nodeI: "G0", nodeJ: "G1", materialId: "MAT_DECK", sectionId: "SEC_DECK" },
    { id: "MG1", nodeI: "G1", nodeJ: "G2", materialId: "MAT_DECK", sectionId: "SEC_DECK" },
    { id: "MG2", nodeI: "G2", nodeJ: "G3", materialId: "MAT_DECK", sectionId: "SEC_DECK" },
    { id: "MG3", nodeI: "G3", nodeJ: "G4", materialId: "MAT_DECK", sectionId: "SEC_DECK" },
    { id: "MG4", nodeI: "G4", nodeJ: "G5", materialId: "MAT_DECK", sectionId: "SEC_DECK" },
    { id: "MP1", nodeI: "G1", nodeJ: "B1", materialId: "MAT_PIER", sectionId: "SEC_PIER" },
    { id: "MP2", nodeI: "G2", nodeJ: "B2", materialId: "MAT_PIER", sectionId: "SEC_PIER" },
    { id: "MP3", nodeI: "G3", nodeJ: "B3", materialId: "MAT_PIER", sectionId: "SEC_PIER" },
    { id: "MP4", nodeI: "G4", nodeJ: "B4", materialId: "MAT_PIER", sectionId: "SEC_PIER" },
  ];
  const fixed = (nodeId: string) => ({ nodeId, ux: true, uy: true, uz: true, rx: true, ry: true, rz: true });
  const soft = (nodeId: string) => ({ nodeId, ux: false, uy: true, uz: false, rx: false, ry: false, rz: false });
  const supports = [
    fixed("G0"),
    fixed("G5"),
    fixed("B1"),
    fixed("B2"),
    soft("B3"),
    soft("B4"),
  ];
  return {
    project: {
      id: "bridge-continuous",
      name: "5-Span Continuous Viaduct (Plan A)",
      schemaVersion: "1.0.0",
      description: "Continuous deck across 5 spans / 150m / P1,P2 rock; P3,P4 soft",
      createdAt: "2026-06-15T00:00:00Z",
      updatedAt: "2026-06-15T00:00:00Z",
    },
    units: { length: "m", force: "kN", moment: "kN_m", modulus: "kN_per_m2", area: "m2", inertia: "m4" },
    nodes,
    materials: [
      { id: "MAT_DECK", name: "Deck Concrete", elasticModulus: 2.5e7, shearModulus: 1.0e7, poissonRatio: 0.2, density: 0 },
      { id: "MAT_PIER", name: "RC Pier", elasticModulus: 2.5e7, shearModulus: 1.0e7, poissonRatio: 0.2, density: 0 },
    ],
    sections: [
      { id: "SEC_DECK", name: "Deck Section", area: 2.5, iy: 1.2, iz: 8.5, j: 4.0 },
      { id: "SEC_PIER", name: "Pier Section", area: 4.0, iy: 1.4, iz: 1.4, j: 2.0 },
    ],
    members,
    supports,
    loadCases: [
      { id: "LC_DEAD", name: "Dead Load", type: "static" as const },
      { id: "LC_LIVE", name: "Live Load", type: "static" as const },
    ],
    nodalLoads: [
      ...nodes
        .filter((n) => n.id.startsWith("G"))
        .map((n, i) => ({ id: `NL_DEAD_${i + 1}`, loadCaseId: "LC_DEAD", nodeId: n.id, fx: 0, fy: -120, fz: 0, mx: 0, my: 0, mz: 0 })),
      ...nodes
        .filter((n) => n.id.startsWith("G"))
        .map((n, i) => ({ id: `NL_LIVE_${i + 1}`, loadCaseId: "LC_LIVE", nodeId: n.id, fx: 0, fy: -60, fz: 0, mx: 0, my: 0, mz: 0 })),
    ],
    memberLoads: [],
    massCases: [
      {
        id: "mass-1",
        name: "Eigen Mass",
        method: "lumped" as const,
        source: "manual" as const,
        items: nodes
          .filter((n) => n.id.startsWith("G"))
          .map((n) => ({ nodeId: n.id, mx: 1, my: 1, mz: 1, irx: 0, iry: 0, irz: 0 })),
      },
    ],
    analysisSettings: {
      analysisType: "linear_static",
      includeShearDeformation: false,
      largeDisplacement: false,
      tolerance: 1e-9,
      eigen: { massCaseId: "mass-1", modeCount: 3 },
      influence: {
        caseId: "influence-line-1",
        line: { id: "line-MG0", memberId: "MG0", stationCount: 21, direction: { x: 0, y: -1, z: 0 }, magnitude: 1 },
        targets: [
          { id: "disp-G2-uy", type: "displacement", nodeId: "G2", component: "uy" },
          { id: "react-G0-fy", type: "reaction", nodeId: "G0", component: "fy" },
          { id: "member-MG0-Mz-i", type: "memberEndForce", memberId: "MG0", component: "Mz", end: "i" },
        ],
      },
    },
  };
};

// -----------------------------------------------------------------------------
// Plan B: 5-span suspended deck model (suspended junction at P3).
// G3L/G3R are split into two distinct deck nodes around the centerline of the
// bridge (Z = -/+ 0.5 m).  The center pier rises to a new top node P3TOP, which
// is shared by G3L and G3R through two short pier members.  All other nodes,
// materials, sections, and supports match Plan A so that only the suspended
// junction is the discriminator between the two plans.
// -----------------------------------------------------------------------------

export const BRIDGE_NUM_SPANS = 5;
export const BRIDGE_SPAN_LENGTH = 30;
export const BRIDGE_TOTAL_LENGTH = BRIDGE_NUM_SPANS * BRIDGE_SPAN_LENGTH;
export const BRIDGE_PIER_HEIGHT = 20;
export const BRIDGE_DECK_Y = BRIDGE_PIER_HEIGHT;
export const BRIDGE_SUSPENDED_OFFSET = 0.5;

export const BRIDGE_SOFT_PIERS = ["B3", "B4"] as const;
export const BRIDGE_ROCK_PIERS = ["B1", "B2"] as const;
export type BridgeGroundCondition = "rock" | "soft";

export function pierBaseGroundCondition(pierId: string): BridgeGroundCondition {
  return (BRIDGE_SOFT_PIERS as readonly string[]).includes(pierId) ? "soft" : "rock";
}

const MATERIAL_DECK = {
  id: "MAT_DECK",
  name: "Deck Concrete",
  elasticModulus: 2.5e7,
  shearModulus: 1.0e7,
  poissonRatio: 0.2,
  density: 0,
};
const MATERIAL_PIER = {
  id: "MAT_PIER",
  name: "RC Pier",
  elasticModulus: 2.5e7,
  shearModulus: 1.0e7,
  poissonRatio: 0.2,
  density: 0,
};
const SECTION_DECK = {
  id: "SEC_DECK",
  name: "Deck Section",
  area: 2.5,
  iy: 1.2,
  iz: 8.5,
  j: 4.0,
};
const SECTION_PIER = {
  id: "SEC_PIER",
  name: "Pier Section",
  area: 4.0,
  iy: 1.4,
  iz: 1.4,
  j: 2.0,
};

export function createSuspendedDeckProject(): ProjectModel {
  const node = (id: string, x: number, y: number, z = 0) => ({ id, x, y, z });
  const nodes = [
    node("G0", 0, BRIDGE_DECK_Y),
    node("G1", 30, BRIDGE_DECK_Y),
    node("G2", 60, BRIDGE_DECK_Y),
    node("G3L", 90, BRIDGE_DECK_Y, -BRIDGE_SUSPENDED_OFFSET),
    node("G3R", 90, BRIDGE_DECK_Y, BRIDGE_SUSPENDED_OFFSET),
    node("G4", 120, BRIDGE_DECK_Y),
    node("G5", 150, BRIDGE_DECK_Y),
    node("B1", 30, 0),
    node("B2", 60, 0),
    node("B3", 90, 0),
    node("B4", 120, 0),
    node("P3TOP", 90, BRIDGE_DECK_Y, 0),
  ];
  const members = [
    { id: "MG_L0", nodeI: "G0", nodeJ: "G1", materialId: "MAT_DECK", sectionId: "SEC_DECK" },
    { id: "MG_L1", nodeI: "G1", nodeJ: "G2", materialId: "MAT_DECK", sectionId: "SEC_DECK" },
    { id: "MG_L2", nodeI: "G2", nodeJ: "G3L", materialId: "MAT_DECK", sectionId: "SEC_DECK" },
    { id: "MG_R3", nodeI: "G3R", nodeJ: "G4", materialId: "MAT_DECK", sectionId: "SEC_DECK" },
    { id: "MG_R4", nodeI: "G4", nodeJ: "G5", materialId: "MAT_DECK", sectionId: "SEC_DECK" },
    { id: "MBR3L", nodeI: "G3L", nodeJ: "P3TOP", materialId: "MAT_PIER", sectionId: "SEC_PIER" },
    { id: "MBR3R", nodeI: "G3R", nodeJ: "P3TOP", materialId: "MAT_PIER", sectionId: "SEC_PIER" },
    { id: "MP1", nodeI: "G1", nodeJ: "B1", materialId: "MAT_PIER", sectionId: "SEC_PIER" },
    { id: "MP2", nodeI: "G2", nodeJ: "B2", materialId: "MAT_PIER", sectionId: "SEC_PIER" },
    { id: "MP3", nodeI: "P3TOP", nodeJ: "B3", materialId: "MAT_PIER", sectionId: "SEC_PIER" },
    { id: "MP4", nodeI: "G4", nodeJ: "B4", materialId: "MAT_PIER", sectionId: "SEC_PIER" },
  ];
  const fixed = (nodeId: string) => ({ nodeId, ux: true, uy: true, uz: true, rx: true, ry: true, rz: true });
  const soft = (nodeId: string) => ({ nodeId, ux: false, uy: true, uz: false, rx: false, ry: false, rz: false });
  const supports = [
    fixed("G0"),
    fixed("G5"),
    fixed("B1"),
    fixed("B2"),
    soft("B3"),
    soft("B4"),
  ];
  return {
    project: {
      id: "bridge-suspended",
      name: "5-Span Suspended Viaduct (Plan B)",
      schemaVersion: "1.0.0",
      description: "Split at P3. G3L z=-0.5 / G3R z=+0.5 / no shared deck node",
      createdAt: "2026-06-15T00:00:00Z",
      updatedAt: "2026-06-15T00:00:00Z",
    },
    units: { length: "m", force: "kN", moment: "kN_m", modulus: "kN_per_m2", area: "m2", inertia: "m4" },
    nodes,
    materials: [MATERIAL_DECK, MATERIAL_PIER],
    sections: [SECTION_DECK, SECTION_PIER],
    members,
    supports,
    loadCases: [
      { id: "LC_DEAD", name: "Dead Load", type: "static" as const },
      { id: "LC_LIVE", name: "Live Load", type: "static" as const },
    ],
    nodalLoads: [
      ...nodes
        .filter((n) => n.id.startsWith("G") || n.id === "P3TOP")
        .map((n, i) => ({
          id: `NL_DEAD_${i + 1}`,
          loadCaseId: "LC_DEAD",
          nodeId: n.id,
          fx: 0, fy: -120, fz: 0, mx: 0, my: 0, mz: 0,
        })),
      ...nodes
        .filter((n) => n.id.startsWith("G") || n.id === "P3TOP")
        .map((n, i) => ({
          id: `NL_LIVE_${i + 1}`,
          loadCaseId: "LC_LIVE",
          nodeId: n.id,
          fx: 0, fy: -60, fz: 0, mx: 0, my: 0, mz: 0,
        })),
    ],
    memberLoads: [],
    massCases: [
      {
        id: "MASS_BRIDGE",
        name: "Eigen Mass (Bridge)",
        method: "lumped" as const,
        source: "manual" as const,
        items: nodes
          .filter((n) => n.id.startsWith("G") || n.id === "P3TOP")
          .map((n) => ({ nodeId: n.id, mx: 1, my: 1, mz: 1, irx: 0, iry: 0, irz: 0 })),
      },
    ],
    analysisSettings: {
      analysisType: "linear_static",
      includeShearDeformation: false,
      largeDisplacement: false,
      tolerance: 1e-9,
      eigen: { massCaseId: "MASS_BRIDGE", modeCount: 6 },
      influence: {
        caseId: "influence-line-1",
        line: { id: "line-MG_L0", memberId: "MG_L0", stationCount: 21, direction: { x: 0, y: -1, z: 0 }, magnitude: 1 },
        targets: [],
      },
    },
  };
}

export type BridgeVariantInfo = {
  variant: "continuous" | "suspended";
  name: string;
  description: string;
  totalLength: number;
  spanCount: number;
  pierCount: number;
  rockPierCount: number;
  softPierCount: number;
  suspendedJunctionCount: number;
  nodeCount: number;
  memberCount: number;
};

export function describeBridgeVariant(project: ProjectModel): BridgeVariantInfo {
  const rockPierCount = (BRIDGE_ROCK_PIERS as readonly string[]).filter((id) => project.supports.some((s) => s.nodeId === id)).length;
  const softPierCount = (BRIDGE_SOFT_PIERS as readonly string[]).filter((id) => project.supports.some((s) => s.nodeId === id)).length;
  const isSuspended = project.nodes.some((n) => n.id === "G3L" || n.id === "G3R" || n.id === "P3TOP");
  // Count deck nodes (G* ids) to derive the span count for the continuous
  // variant.  For the suspended variant we use the well-known BRIDGE_NUM_SPANS.
  const deckNodes = project.nodes.filter((n) => typeof n.id === "string" && n.id.startsWith("G") && !n.id.startsWith("GB"));
  const derivedSpanCount = isSuspended
    ? BRIDGE_NUM_SPANS
    : Math.max(0, deckNodes.length - 1);
  const derivedPierCount = isSuspended
    ? rockPierCount + softPierCount
    : project.supports.filter((s) => /^B\d+$/.test(s.nodeId)).length;
  const derivedRockPierCount = isSuspended
    ? rockPierCount
    : project.supports.filter((s) => (BRIDGE_ROCK_PIERS as readonly string[]).includes(s.nodeId)).length;
  const derivedSoftPierCount = isSuspended
    ? softPierCount
    : project.supports.filter((s) => (BRIDGE_SOFT_PIERS as readonly string[]).includes(s.nodeId)).length;
  return {
    variant: isSuspended ? "suspended" : "continuous",
    name: project.project.name,
    description: project.project.description,
    totalLength: isSuspended ? BRIDGE_TOTAL_LENGTH : BRIDGE_SPAN_LENGTH * derivedSpanCount,
    spanCount: derivedSpanCount,
    pierCount: derivedPierCount,
    rockPierCount: derivedRockPierCount,
    softPierCount: derivedSoftPierCount,
    suspendedJunctionCount: isSuspended ? 1 : 0,
    nodeCount: project.nodes.length,
    memberCount: project.members.length,
  };
}
