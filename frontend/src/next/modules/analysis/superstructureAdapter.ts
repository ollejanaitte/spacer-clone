/**
 * Superstructure -> Analysis adapter (Phase 7-01 B FROZEN / Phase 7-02 WP-B).
 *
 * SuperstructureDocument (sole source) + GeometrySnapshot (geometry authority)
 * -> AnalysisDocument superstructure-origin fragment: nodes (supportPoint /
 * crossBeamPoint / girderPanel) + members (mainGirder / crossBeam) + sections +
 * materials + bearings.
 *
 * Deterministic: same upstream -> same fragment (D-11 uuid5 IDs, member-local
 * orientation derived from tangent + global up, Sol review #16).
 */

import type { GeometrySnapshot } from "../../../apollo/geometry/types";
import { computeSuperstructureSectionProperties } from "../superstructure/superstructureComponents";
import type { SuperstructureDocument } from "../superstructure/superstructureTypes";
import type {
  AnalysisBearing,
  AnalysisMaterial,
  AnalysisMember,
  AnalysisNode,
  AnalysisSection,
  AnalysisVec3,
} from "./analysisDocumentTypes";
import { deriveAnalysisEntityId } from "./analysisId";
import type { UuidString } from "../../../contracts/uuid";

/** Frozen engineering default steel (section_material_contract §3.1: DERIVED). */
export const DEFAULT_STEEL_MATERIAL: AnalysisMaterial = {
  entityId: deriveAnalysisEntityId("material", "MAT-STEEL"),
  sourceEntityId: "MAT-STEEL",
  sourceKind: "structuralSteel",
  name: "steel (declared default, E=205 GPa)",
  elasticModulus: 205000000,
  shearModulus: 78846153.846,
  poissonRatio: 0.3,
  density: 78.5,
  source: "DERIVED",
};

/**
 * Resolve the steel material for the analysis model (Phase 7-01C §3.1).
 * When SuperstructureDocument.materialConfiguration is declared the values are
 * CONFIRMED (AUTHORIZED upstream input overrides the frozen default).
 * Otherwise the frozen engineering default steel applies (DERIVED). No value
 * is invented in either case.
 */
export function resolveSteelMaterial(
  materialConfiguration: SuperstructureDocument["materialConfiguration"],
): AnalysisMaterial {
  if (materialConfiguration === null) {
    return DEFAULT_STEEL_MATERIAL;
  }
  const e = finitePositive(materialConfiguration.elasticModulusKN_M2);
  const g = finitePositive(materialConfiguration.shearModulusKN_M2);
  const nu = finitePositive(materialConfiguration.poissonRatio);
  const rho = finitePositive(materialConfiguration.densityKN_M3);
  if (e === null || g === null || nu === null || rho === null) {
    // Partial declaration is NOT_AUTHORIZED: the frozen default must not be
    // silently mixed with user values. Fall back to the DERIVED default and
    // record NOT_AVAILABLE (the caller surfaces the issue).
    return DEFAULT_STEEL_MATERIAL;
  }
  return {
    entityId: deriveAnalysisEntityId("material", "MAT-STEEL"),
    sourceEntityId: "MAT-STEEL",
    sourceKind: "structuralSteel",
    name: "steel (declared materialConfiguration)",
    elasticModulus: e,
    shearModulus: g,
    poissonRatio: nu,
    density: rho,
    source: "CONFIRMED",
  };
}

function finitePositive(value: number | null | undefined): number | null {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : null;
}

export interface SuperstructureAnalysisFragment {
  readonly nodes: readonly AnalysisNode[];
  readonly members: readonly AnalysisMember[];
  readonly sections: readonly AnalysisSection[];
  readonly materials: readonly AnalysisMaterial[];
  readonly bearings: readonly AnalysisBearing[];
  readonly issues: readonly { path: string; message: string }[];
}

const EPS = 1e-12;

function unit(v: AnalysisVec3): AnalysisVec3 | null {
  const norm = Math.hypot(v.x, v.y, v.z);
  if (norm < EPS) {
    return null;
  }
  return { x: v.x / norm, y: v.y / norm, z: v.z / norm };
}

function cross(a: AnalysisVec3, b: AnalysisVec3): AnalysisVec3 {
  return {
    x: a.y * b.z - a.z * b.y,
    y: a.z * b.x - a.x * b.z,
    z: a.x * b.y - a.y * b.x,
  };
}

function dot(a: AnalysisVec3, b: AnalysisVec3): number {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}

/**
 * Build the member local frame deterministically (FROZEN §5 / Sol review #16).
 * localX = unit(nodeJ-nodeI); localZ = global up projected onto the plane
 * orthogonal to localX (always +up); localY = localZ x localX.
 */
export function buildMemberLocalFrame(
  nodeI: AnalysisVec3,
  nodeJ: AnalysisVec3,
): { frame: { x: AnalysisVec3; y: AnalysisVec3; z: AnalysisVec3 }; orientationVector: AnalysisVec3 } {
  const localX = unit({ x: nodeJ.x - nodeI.x, y: nodeJ.y - nodeI.y, z: nodeJ.z - nodeI.z });
  if (localX === null) {
    throw new Error("INVALID_ORIENTATION: zero-length member.");
  }
  const globalUp = { x: 0, y: 0, z: 1 };
  const upComponent = dot(globalUp, localX);
  const projectedZ = {
    x: globalUp.x - upComponent * localX.x,
    y: globalUp.y - upComponent * localX.y,
    z: globalUp.z - upComponent * localX.z,
  };
  let localZ = unit(projectedZ);
  if (localZ === null) {
    const altUp = { x: 0, y: 1, z: 0 };
    const altComponent = dot(altUp, localX);
    const altProjected = {
      x: altUp.x - altComponent * localX.x,
      y: altUp.y - altComponent * localX.y,
      z: altUp.z - altComponent * localX.z,
    };
    localZ = unit(altProjected);
    if (localZ === null) {
      throw new Error("INVALID_ORIENTATION: cannot resolve member local frame.");
    }
  }
  const localY = unit(cross(localZ, localX));
  if (localY === null) {
    throw new Error("INVALID_ORIENTATION: cannot resolve member local frame.");
  }
  return { frame: { x: localX, y: localY, z: localZ }, orientationVector: localY };
}

/** Rectangular cross-beam section properties (FROZEN §7.1). */
export function deriveRectangularSection(widthM: number, depthM: number): {
  area: number;
  iy: number;
  iz: number;
  j: number;
} {
  const b = Math.max(widthM, depthM);
  const h = Math.min(widthM, depthM);
  const ratio = h / b;
  const c = 1 / 3 - 0.21 * ratio * (1 - ratio ** 4 / 12);
  return {
    area: widthM * depthM,
    iy: (widthM * depthM ** 3) / 12,
    iz: (depthM * widthM ** 3) / 12,
    j: c * b * h ** 3,
  };
}

function near(a: number, b: number): boolean {
  return Math.abs(a - b) < 1e-9;
}

/**
 * Build the superstructure-origin analysis fragment.
 * Issues are returned (fail-closed) rather than thrown for MISSING sections.
 */
export function buildSuperstructureAnalysisFragment(
  document: SuperstructureDocument,
  snapshot: GeometrySnapshot,
): SuperstructureAnalysisFragment {
  const issues: { path: string; message: string }[] = [];
  const nodes: AnalysisNode[] = [];
  const members: AnalysisMember[] = [];
  const sections: AnalysisSection[] = [];
  const bearings: AnalysisBearing[] = [];

  if (snapshot.supportPoints.length === 0) {
    issues.push({ path: "snapshot.supportPoints", message: "no support points (generation rejected)." });
    const earlyMaterials: AnalysisMaterial[] = [resolveSteelMaterial(document.materialConfiguration)];
    return { nodes, members, sections, materials: earlyMaterials, bearings, issues };
  }

  const material = resolveSteelMaterial(document.materialConfiguration);
  if (material.source === "CONFIRMED") {
    // no issue: declared material is AUTHORIZED
  } else if (document.materialConfiguration !== null) {
    issues.push({
      path: "materialConfiguration",
      message: "materialConfiguration is partially declared; the frozen default steel (DERIVED) applies (NOT_AVAILABLE).",
    });
  }
  const materials: AnalysisMaterial[] = [material];
  const materialId = material.entityId;
  const nodeBySource = new Map<string, AnalysisNode>();

  // supportPoint nodes
  for (const sp of snapshot.supportPoints) {
    const sourceEntityId = `supportPoint:${sp.supportId}:${sp.girderId}`;
    if (nodeBySource.has(sourceEntityId)) continue;
    const node: AnalysisNode = {
      entityId: deriveAnalysisEntityId("node", sourceEntityId),
      sourceEntityId,
      sourceKind: "supportPoint",
      x: sp.position.x,
      y: sp.position.y,
      z: sp.position.z,
      stationM: sp.stationM,
      offsetM: sp.offsetM,
    };
    nodeBySource.set(sourceEntityId, node);
    nodes.push(node);
  }

  // girder panel nodes (intermediate stations, not supports)
  for (const line of snapshot.girderLines) {
    for (const point of line.points) {
      if (!Number.isFinite(point.stationM)) continue;
      const isSupport = snapshot.supportPoints.some(
        (sp) => sp.girderId === line.girderId && near(sp.stationM, point.stationM),
      );
      if (isSupport) continue;
      const sourceEntityId = `girderPanel:${line.girderId}:${String(point.stationM)}`;
      if (nodeBySource.has(sourceEntityId)) continue;
      const node: AnalysisNode = {
        entityId: deriveAnalysisEntityId("node", sourceEntityId),
        sourceEntityId,
        sourceKind: "girderPanel",
        x: point.position.x,
        y: point.position.y,
        z: point.position.z,
        stationM: point.stationM,
        offsetM: point.offsetM,
      };
      nodeBySource.set(sourceEntityId, node);
      nodes.push(node);
    }
  }

  // crossBeamPoint nodes (cross girder station x girder)
  for (const cg of snapshot.crossGirderReferences) {
    for (const line of snapshot.girderLines) {
      const isSupport = snapshot.supportPoints.some(
        (sp) => sp.girderId === line.girderId && near(sp.stationM, cg.stationM),
      );
      if (isSupport) continue;
      const panel = line.points.find((p) => near(p.stationM, cg.stationM));
      if (!panel) continue;
      const sourceEntityId = `crossBeamPoint:${cg.crossGirderId}:${line.girderId}`;
      if (nodeBySource.has(sourceEntityId)) continue;
      const node: AnalysisNode = {
        entityId: deriveAnalysisEntityId("node", sourceEntityId),
        sourceEntityId,
        sourceKind: "crossBeamPoint",
        x: panel.position.x,
        y: panel.position.y,
        z: panel.position.z,
        stationM: cg.stationM,
        offsetM: panel.offsetM,
      };
      nodeBySource.set(sourceEntityId, node);
      nodes.push(node);
    }
  }

  // main girder section (R7) + cross beam section
  const girderSectionModel = document.girderConfiguration.girderSectionModel;
  const bridgeLength = snapshot.alignmentReferences[0]?.bridgeLengthM.value ?? 1;
  const computed = computeSuperstructureSectionProperties(girderSectionModel, bridgeLength);
  const girderSectionId = "SECTION-GIRDER";
  const sectionAvailable = computed !== null || girderSectionModel.areaM2 !== null;
  if (!sectionAvailable) {
    issues.push({
      path: "girderConfiguration.girderSectionModel",
      message: "girder section properties are NOT_AVAILABLE (analysis cannot run).",
    });
  }
  // Always emit the girder section so member references resolve and the
  // AnalysisDocument stays structurally consistent. When properties are
  // NOT_AVAILABLE the section is degenerate (zero stiffness) and the solver
  // reports MODEL_UNSTABLE (fail-closed); no section property is invented.
  {
    const area = girderSectionModel.areaM2 ?? computed?.totalArea ?? 0;
    // iy = strong axis (vertical bending), iz = weak axis (lateral bending).
    const iy = computed?.secondMomentOfArea ?? 0;
    const iz = computed?.secondMomentOfArea !== undefined ? computed.secondMomentOfArea / 8 : 0;
    const j = iy * 0.5;
    const section: AnalysisSection = {
      entityId: deriveAnalysisEntityId("section", girderSectionId),
      sourceEntityId: girderSectionId,
      sourceKind: "girderSectionModel",
      name: "main girder (from girderSectionModel)",
      area,
      iy,
      iz,
      j,
      depthM: girderSectionModel.depthM,
      webThicknessM: girderSectionModel.webThicknessM,
      topFlangeWidthM: girderSectionModel.topFlange?.widthM ?? null,
      topFlangeThicknessM: girderSectionModel.topFlange?.thicknessM ?? null,
      bottomFlangeWidthM: girderSectionModel.bottomFlange?.widthM ?? null,
      bottomFlangeThicknessM: girderSectionModel.bottomFlange?.thicknessM ?? null,
      derivation: girderSectionModel.areaM2 !== null ? "DECLARED_INTENT" : "COMPUTED",
      unitWeightPerM: girderSectionModel.unitWeightPerM,
    };
    sections.push(section);
  }

  const crossBeamConfig = document.crossBeamConfiguration;
  if (crossBeamConfig) {
    for (const cb of crossBeamConfig.crossBeams) {
      if (cb.depthM === null || cb.widthM === null) {
        issues.push({
          path: `crossBeamConfiguration.crossBeams[${cb.crossBeamId}]`,
          message: "cross beam depth/width are MISSING; cross beam excluded (NOT_AVAILABLE).",
        });
        continue;
      }
      const props = deriveRectangularSection(cb.widthM, cb.depthM);
      const sectionId = `X-SEC-${cb.crossBeamId}`;
      sections.push({
        entityId: deriveAnalysisEntityId("section", sectionId),
        sourceEntityId: sectionId,
        sourceKind: "computed",
        name: `cross beam ${cb.crossBeamId}`,
        area: props.area,
        iy: props.iy,
        iz: props.iz,
        j: props.j,
        depthM: cb.depthM,
        webThicknessM: null,
        topFlangeWidthM: null,
        topFlangeThicknessM: null,
        bottomFlangeWidthM: null,
        bottomFlangeThicknessM: null,
        derivation: "COMPUTED",
        unitWeightPerM: null,
      });
    }
  }

  // main girder members per span (support point -> support point along each girder)
  for (const line of snapshot.girderLines) {
    const stationNodes = snapshot.supportPoints
      .filter((sp) => sp.girderId === line.girderId)
      .sort((a, b) => a.stationM - b.stationM);
    for (let i = 0; i < stationNodes.length - 1; i += 1) {
      const nodeI = nodeBySource.get(`supportPoint:${stationNodes[i].supportId}:${line.girderId}`);
      const nodeJ = nodeBySource.get(`supportPoint:${stationNodes[i + 1].supportId}:${line.girderId}`);
      if (!nodeI || !nodeJ) continue;
      const { frame, orientationVector } = buildMemberLocalFrame(
        { x: nodeI.x, y: nodeI.y, z: nodeI.z },
        { x: nodeJ.x, y: nodeJ.y, z: nodeJ.z },
      );
      const sourceEntityId = `M-L-${line.girderId}-S${i + 1}`;
      members.push({
        entityId: deriveAnalysisEntityId("member", sourceEntityId),
        sourceEntityId,
        sourceKind: "mainGirder",
        elementType: "frame",
        nodeIId: nodeI.entityId,
        nodeJId: nodeJ.entityId,
        materialId,
        sectionId: (sections[0]?.entityId ?? "") as UuidString,
        memberKind: "mainGirder",
        orientationVector,
        localAxis: frame,
        release: null,
        eccentricity: null,
      });
    }
  }

  // cross beam members (between connected girder lines at each cross girder station)
  for (const cg of snapshot.crossGirderReferences) {
    const girderIds = cg.connectedGirderIds;
    for (let i = 0; i < girderIds.length - 1; i += 1) {
      const nodeI = nodeBySource.get(`crossBeamPoint:${cg.crossGirderId}:${girderIds[i]}`)
        ?? nodeBySource.get(`supportPoint:${findSupportAt(snapshot, cg.stationM, girderIds[i])}:${girderIds[i]}`);
      const nodeJ = nodeBySource.get(`crossBeamPoint:${cg.crossGirderId}:${girderIds[i + 1]}`)
        ?? nodeBySource.get(`supportPoint:${findSupportAt(snapshot, cg.stationM, girderIds[i + 1])}:${girderIds[i + 1]}`);
      if (!nodeI || !nodeJ) continue;
      const { frame, orientationVector } = buildMemberLocalFrame(
        { x: nodeI.x, y: nodeI.y, z: nodeI.z },
        { x: nodeJ.x, y: nodeJ.y, z: nodeJ.z },
      );
      const sourceEntityId = `M-T-${cg.crossGirderId}-${i}`;
      members.push({
        entityId: deriveAnalysisEntityId("member", sourceEntityId),
        sourceEntityId,
        sourceKind: "crossBeam",
        elementType: "frame",
        nodeIId: nodeI.entityId,
        nodeJId: nodeJ.entityId,
        materialId,
        sectionId: findCrossBeamSection(sections, cg.crossGirderId) as UuidString,
        memberKind: "crossBeam",
        orientationVector,
        localAxis: frame,
        release: null,
        eccentricity: null,
      });
    }
  }

  // bearings (superstructure-origin fragment; joined by BearingSupportResolver)
  for (const seat of document.bearingConfiguration.bearingSeats) {
    const bearingPoint = snapshot.bearingPoints.find(
      (bp) => bp.supportId === seat.supportId && bp.girderId === seat.girderId,
    );
    const supportNode = nodeBySource.get(`supportPoint:${seat.supportId}:${seat.girderId}`);
    if (!bearingPoint && !supportNode) continue;
    const position = bearingPoint?.position ?? (supportNode ? { x: supportNode.x, y: supportNode.y, z: supportNode.z } : null);
    if (!position) continue;
    const localFrame = bearingPoint?.localFrame;
    const seatId = `BRG-${seat.supportId}-${seat.girderId}`;
    bearings.push({
      entityId: deriveAnalysisEntityId("bearing", seatId),
      sourceEntityId: seatId,
      sourceKind: "bearingSeat",
      seatId,
      supportId: seat.supportId,
      girderId: seat.girderId,
      bearingType: seat.bearingType,
      fixedOrMovable: seat.fixedOrMovable,
      position,
      localFrame: localFrame
        ? {
            tangent: localFrame.tangent,
            transverse: localFrame.binormal,
            vertical: localFrame.normal,
          }
        : {
            tangent: { x: 1, y: 0, z: 0 },
            transverse: { x: 0, y: 1, z: 0 },
            vertical: { x: 0, y: 0, z: 1 },
          },
      dofConstraint: { ux: false, uy: true, uz: true, rx: false, ry: false, rz: false },
      constraintApproximation: null,
      springIds: [],
    });
  }

  return { nodes, members, sections, materials, bearings, issues };
}

function findSupportAt(snapshot: GeometrySnapshot, stationM: number, girderId: string): string | null {
  const sp = snapshot.supportPoints.find(
    (p) => p.girderId === girderId && near(p.stationM, stationM),
  );
  return sp ? sp.supportId : null;
}

function findCrossBeamSection(sections: readonly AnalysisSection[], crossBeamId: string): string {
  const section = sections.find((s) => s.sourceEntityId === `X-SEC-${crossBeamId}`);
  return section ? section.entityId : (sections[0]?.entityId ?? "");
}
