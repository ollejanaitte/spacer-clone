import { CURRENT_PROJECT_SCHEMA_VERSION } from "../../projectMigration";
import type {
  LoadCase,
  Member,
  MemberLoad,
  Material,
  NodeItem,
  NodalLoad,
  ProjectModel,
  Section,
  Support,
} from "../../types";
import type {
  BridgeDefinition,
  BridgeDefinitionGirder,
  BridgeDefinitionLoad,
  BridgeDefinitionSpan,
  BridgeDefinitionSupport,
} from "../types";

/** Options for deterministic BridgeDefinition → StructuralModel conversion. */
export interface BridgeDefinitionStructuralModelOptions {
  projectId?: string;
  projectName?: string;
  generatedAt?: string;
  defaultMaterialId?: string;
  defaultSectionId?: string;
  nodeIdPrefix?: string;
  memberIdPrefix?: string;
}

export interface BridgeDefinitionStructuralModelDiagnostic {
  severity: "info" | "warning" | "error";
  code: string;
  message: string;
  path?: string;
}

export interface StructuralModelGenerationResult {
  project: ProjectModel;
  diagnostics: BridgeDefinitionStructuralModelDiagnostic[];
}

const DEFAULT_MATERIAL_ID = "mat-steel-default";
const DEFAULT_SECTION_ID = "sec-girder-default";
const DEFAULT_NODE_ID_PREFIX = "N";
const DEFAULT_MEMBER_ID_PREFIX = "M";
const DEFAULT_GENERATED_AT = "2026-07-10T00:00:00.000Z";
const PLACEHOLDER_LOAD_CASE_ID = "LC_BD_PLACEHOLDER";

const DEFAULT_MATERIAL: Omit<Material, "id"> = {
  name: "Steel (default)",
  elasticModulus: 2.05e8,
  shearModulus: 7.88461538e7,
  poissonRatio: 0.3,
  density: 0,
};

const DEFAULT_SECTION: Omit<Section, "id"> = {
  name: "Girder Section (default)",
  area: 0.05,
  iy: 0.0008,
  iz: 0.0006,
  j: 0.0002,
};

type NodeKey = string;

function roundCoordinate(value: number): number {
  return Math.round(value * 1e6) / 1e6;
}

function nodeKey(station: number, offset: number): NodeKey {
  return `${roundCoordinate(station)}:${roundCoordinate(offset)}`;
}

function hasFatalDiagnostics(diagnostics: BridgeDefinitionStructuralModelDiagnostic[]): boolean {
  return diagnostics.some((diagnostic) => diagnostic.severity === "error");
}

/** Non-fatal and fatal checks for BridgeDefinition → StructuralModel generation. */
export function validateBridgeDefinitionForStructuralModel(
  bridgeDefinition: BridgeDefinition,
): BridgeDefinitionStructuralModelDiagnostic[] {
  const diagnostics: BridgeDefinitionStructuralModelDiagnostic[] = [];

  if (bridgeDefinition.spans.length === 0) {
    diagnostics.push({
      severity: "error",
      code: "BD_SM_NO_SPANS",
      message: "BridgeDefinition.spans is empty; at least one span is required.",
      path: "spans",
    });
  }

  for (const span of bridgeDefinition.spans) {
    if (span.length <= 0) {
      diagnostics.push({
        severity: "error",
        code: "BD_SM_INVALID_SPAN",
        message: `Span "${span.id}" has non-positive length.`,
        path: `spans/${span.id}`,
      });
    }
  }

  if (bridgeDefinition.generationSettings.meshDivision < 1) {
    diagnostics.push({
      severity: "error",
      code: "BD_SM_INVALID_MESH",
      message: "generationSettings.meshDivision must be >= 1.",
      path: "generationSettings.meshDivision",
    });
  }

  if (bridgeDefinition.stations.length === 0) {
    diagnostics.push({
      severity: "warning",
      code: "BD_SM_NO_STATIONS",
      message: "BridgeDefinition.stations is empty; mesh stations will be derived from spans only.",
      path: "stations",
    });
  }

  if (bridgeDefinition.supports.length === 0) {
    diagnostics.push({
      severity: "warning",
      code: "BD_SM_NO_SUPPORTS",
      message: "BridgeDefinition.supports is empty; no support constraints will be generated.",
      path: "supports",
    });
  }

  if (bridgeDefinition.girders.length === 0) {
    diagnostics.push({
      severity: "warning",
      code: "BD_SM_NO_GIRDERS",
      message: "BridgeDefinition.girders is empty; a centerline fallback beam model will be generated.",
      path: "girders",
    });
  }

  if (bridgeDefinition.crossBeams.length > 0 && bridgeDefinition.girders.length < 2) {
    diagnostics.push({
      severity: "warning",
      code: "BD_SM_CROSS_BEAM_SINGLE_GIRDER",
      message: "Cross beams require at least two girders for transverse members; cross beams may be skipped.",
      path: "crossBeams",
    });
  }

  for (const bearing of bridgeDefinition.bearings) {
    const support = bridgeDefinition.supports.find((item) => item.id === bearing.supportId);
    if (!support) {
      diagnostics.push({
        severity: "warning",
        code: "BD_SM_ORPHAN_BEARING",
        message: `Bearing "${bearing.id}" references missing support "${bearing.supportId}".`,
        path: `bearings/${bearing.id}`,
      });
    }
  }

  for (const load of bridgeDefinition.loads) {
    if (load.type === "temperature") {
      diagnostics.push({
        severity: "warning",
        code: "BD_SM_UNSUPPORTED_LOAD_TYPE",
        message: `Load "${load.id}" type "temperature" is not converted in MVP generator.`,
        path: `loads/${load.id}`,
      });
    }
    if (load.target.kind === "node") {
      diagnostics.push({
        severity: "warning",
        code: "BD_SM_UNSUPPORTED_LOAD_TARGET",
        message: `Load "${load.id}" targets a node ref; nodal target resolution is not implemented in MVP.`,
        path: `loads/${load.id}`,
      });
    }
  }

  const policy = bridgeDefinition.coordinatePolicy;
  diagnostics.push({
    severity: "info",
    code: "BD_SM_COORDINATE_POLICY",
    message: `Using coordinate policy "${policy.policyId}" (frame=${policy.frame}, axis=${policy.axisConvention ?? "unspecified"}, sign=${JSON.stringify(policy.sign ?? {})}). Station→X, offset→Y, elevation→Z (unknown=0); no complex frame transform applied.`,
    path: "coordinatePolicy",
  });

  return diagnostics;
}

/**
 * Converts a canonical `BridgeDefinition` into a `ProjectModel` structural candidate.
 * Pure function — does not mutate input or generate non-deterministic values.
 */
export function createStructuralModelFromBridgeDefinition(
  bridgeDefinition: BridgeDefinition,
  options?: BridgeDefinitionStructuralModelOptions,
): StructuralModelGenerationResult {
  const diagnostics = validateBridgeDefinitionForStructuralModel(bridgeDefinition);

  if (hasFatalDiagnostics(diagnostics)) {
    const messages = diagnostics
      .filter((diagnostic) => diagnostic.severity === "error")
      .map((diagnostic) => diagnostic.message)
      .join(" ");
    throw new Error(
      `createStructuralModelFromBridgeDefinition: ${messages || "fatal validation errors"}`,
    );
  }

  const meshDivision = bridgeDefinition.generationSettings.meshDivision;
  const spans = bridgeDefinition.spans.filter((span) => span.length > 0);
  const meshStations = computeMeshStations(spans, meshDivision);
  const girderOffsets = resolveGirderOffsets(bridgeDefinition.girders);
  const signX = bridgeDefinition.coordinatePolicy.sign?.x ?? 1;
  const signY = bridgeDefinition.coordinatePolicy.sign?.y ?? 1;
  const signZ = bridgeDefinition.coordinatePolicy.sign?.z ?? 1;

  const nodeIdPrefix = options?.nodeIdPrefix ?? DEFAULT_NODE_ID_PREFIX;
  const memberIdPrefix = options?.memberIdPrefix ?? DEFAULT_MEMBER_ID_PREFIX;
  const materialId =
    options?.defaultMaterialId ??
    bridgeDefinition.generationSettings.defaultMaterialId ??
    DEFAULT_MATERIAL_ID;
  const sectionId =
    options?.defaultSectionId ??
    bridgeDefinition.generationSettings.defaultSectionId ??
    DEFAULT_SECTION_ID;
  const generatedAt = options?.generatedAt ?? DEFAULT_GENERATED_AT;

  const nodes: NodeItem[] = [];
  const nodeIdByKey = new Map<NodeKey, string>();
  let nodeCounter = 0;

  for (const offset of girderOffsets) {
    for (const station of meshStations) {
      nodeCounter += 1;
      const id = `${nodeIdPrefix}${nodeCounter}`;
      const key = nodeKey(station, offset);
      nodeIdByKey.set(key, id);
      nodes.push({
        id,
        x: roundCoordinate(signX * station),
        y: roundCoordinate(signY * offset),
        z: roundCoordinate(signZ * 0),
        label: id,
      });
    }
  }

  const members = buildMembers(
    meshStations,
    girderOffsets,
    nodeIdByKey,
    memberIdPrefix,
    materialId,
    sectionId,
    bridgeDefinition.girders,
    bridgeDefinition.crossBeams,
    diagnostics,
  );

  const supports = buildSupports(
    bridgeDefinition.supports,
    bridgeDefinition.bearings,
    meshStations,
    girderOffsets,
    nodeIdByKey,
    diagnostics,
  );

  const { loadCases, nodalLoads, memberLoads } = buildLoads(
    bridgeDefinition.loads,
    bridgeDefinition.girders,
    meshStations,
    girderOffsets,
    nodeIdByKey,
    members,
    diagnostics,
  );

  const materials = buildMaterials(bridgeDefinition, materialId, diagnostics);
  const sections = buildSections(bridgeDefinition, sectionId, diagnostics);

  const project: ProjectModel = {
    schemaVersion: CURRENT_PROJECT_SCHEMA_VERSION,
    project: {
      id: options?.projectId ?? bridgeDefinition.id,
      name: options?.projectName ?? bridgeDefinition.name,
      schemaVersion: "1.0.0",
      description: buildProjectDescription(bridgeDefinition),
      createdAt: generatedAt,
      updatedAt: generatedAt,
    },
    units: {
      length: "m",
      force: "kN",
      moment: "kN_m",
      modulus: "kN_per_m2",
      area: "m2",
      inertia: "m4",
    },
    nodes,
    materials,
    sections,
    members,
    supports,
    loadCases,
    nodalLoads,
    memberLoads,
    analysisSettings: {
      analysisType: "linear_static",
      solver: "scipy_sparse",
      includeShearDeformation: false,
      largeDisplacement: false,
      tolerance: 1e-9,
    },
  };

  if (nodes.length === 0) {
    diagnostics.push({
      severity: "error",
      code: "BD_SM_NO_NODES",
      message: "No nodes were generated from BridgeDefinition.",
    });
    throw new Error("createStructuralModelFromBridgeDefinition: no nodes were generated.");
  }

  return { project, diagnostics };
}

function computeMeshStations(spans: BridgeDefinitionSpan[], meshDivision: number): number[] {
  if (spans.length === 0) {
    return [];
  }

  const stations: number[] = [];
  for (const span of spans) {
    for (let division = 0; division < meshDivision; division += 1) {
      const fraction = division / meshDivision;
      stations.push(span.startStation + fraction * span.length);
    }
  }
  const lastSpan = spans[spans.length - 1]!;
  stations.push(lastSpan.endStation);

  return [...new Set(stations.map((station) => roundCoordinate(station)))].sort(
    (left, right) => left - right,
  );
}

function resolveGirderOffsets(girders: BridgeDefinitionGirder[]): number[] {
  if (girders.length === 0) {
    return [0];
  }
  const offsets = [...new Set(girders.map((girder) => roundCoordinate(girder.offset)))].sort(
    (left, right) => left - right,
  );
  return offsets.length > 0 ? offsets : [0];
}

function buildMembers(
  meshStations: number[],
  girderOffsets: number[],
  nodeIdByKey: Map<NodeKey, string>,
  memberIdPrefix: string,
  materialId: string,
  sectionId: string,
  girders: BridgeDefinitionGirder[],
  crossBeams: BridgeDefinition["crossBeams"],
  diagnostics: BridgeDefinitionStructuralModelDiagnostic[],
): Member[] {
  const members: Member[] = [];
  const usedPairs = new Set<string>();
  let memberCounter = 0;

  const addMember = (nodeI: string, nodeJ: string, label?: string) => {
    if (nodeI === nodeJ) {
      return;
    }
    const pairKey = [nodeI, nodeJ].sort().join(":");
    if (usedPairs.has(pairKey)) {
      return;
    }
    usedPairs.add(pairKey);
    memberCounter += 1;
    members.push({
      id: `${memberIdPrefix}${memberCounter}`,
      nodeI,
      nodeJ,
      materialId: resolveMaterialForGirders(girders, materialId),
      sectionId: resolveSectionForGirders(girders, sectionId),
      orientationVector: { x: 0, y: 0, z: 1 },
      ...(label ? { label } : {}),
    });
  };

  for (const offset of girderOffsets) {
    for (let index = 0; index < meshStations.length - 1; index += 1) {
      const startStation = meshStations[index]!;
      const endStation = meshStations[index + 1]!;
      const nodeI = nodeIdByKey.get(nodeKey(startStation, offset));
      const nodeJ = nodeIdByKey.get(nodeKey(endStation, offset));
      if (nodeI && nodeJ) {
        addMember(nodeI, nodeJ);
      }
    }
  }

  if (girders.length === 0 && members.length > 0) {
    diagnostics.push({
      severity: "info",
      code: "BD_SM_CENTERLINE_FALLBACK",
      message: `Generated ${members.length} centerline fallback member(s) along offset 0.`,
    });
  }

  if (crossBeams.length > 0 && girderOffsets.length >= 2) {
    for (const crossBeam of crossBeams) {
      const station = nearestStation(meshStations, crossBeam.station);
      const targetOffsets =
        crossBeam.girderIds && crossBeam.girderIds.length >= 2
          ? girderOffsets.filter((offset) =>
              girders.some(
                (girder) =>
                  crossBeam.girderIds!.includes(girder.id) &&
                  roundCoordinate(girder.offset) === offset,
              ),
            )
          : girderOffsets;

      if (targetOffsets.length < 2) {
        diagnostics.push({
          severity: "warning",
          code: "BD_SM_CROSS_BEAM_SKIPPED",
          message: `Cross beam "${crossBeam.id}" could not be connected across girders.`,
          path: `crossBeams/${crossBeam.id}`,
        });
        continue;
      }

      for (let index = 0; index < targetOffsets.length - 1; index += 1) {
        const leftOffset = targetOffsets[index]!;
        const rightOffset = targetOffsets[index + 1]!;
        const nodeI = nodeIdByKey.get(nodeKey(station, leftOffset));
        const nodeJ = nodeIdByKey.get(nodeKey(station, rightOffset));
        if (nodeI && nodeJ) {
          addMember(nodeI, nodeJ, crossBeam.id);
        }
      }
    }
  }

  return members;
}

function resolveMaterialForGirders(
  girders: BridgeDefinitionGirder[],
  fallbackMaterialId: string,
): string {
  const materialRef = girders.find((girder) => girder.materialRefId)?.materialRefId;
  return materialRef ?? fallbackMaterialId;
}

function resolveSectionForGirders(
  girders: BridgeDefinitionGirder[],
  fallbackSectionId: string,
): string {
  const sectionRef = girders.find((girder) => girder.sectionRefId)?.sectionRefId;
  return sectionRef ?? fallbackSectionId;
}

function buildSupports(
  supports: BridgeDefinitionSupport[],
  bearings: BridgeDefinition["bearings"],
  meshStations: number[],
  girderOffsets: number[],
  nodeIdByKey: Map<NodeKey, string>,
  diagnostics: BridgeDefinitionStructuralModelDiagnostic[],
): Support[] {
  if (supports.length === 0) {
    return [];
  }

  const centerOffset = girderOffsets.reduce((closest, offset) =>
    Math.abs(offset) < Math.abs(closest) ? offset : closest,
  );
  const result: Support[] = [];

  for (const support of supports) {
    const station = nearestStation(meshStations, support.station);
    const nodeId = nodeIdByKey.get(nodeKey(station, centerOffset));
    if (!nodeId) {
      diagnostics.push({
        severity: "warning",
        code: "BD_SM_SUPPORT_NODE_MISSING",
        message: `Support "${support.id}" at station ${support.station} has no matching node.`,
        path: `supports/${support.id}`,
      });
      continue;
    }

    const bearing = bearings.find((item) => item.supportId === support.id);
    const kind = bearing?.type === "fixed" ? "fixed" : support.kind;
    result.push(supportKindToConstraint(nodeId, kind));

    if (bearing) {
      diagnostics.push({
        severity: "info",
        code: "BD_SM_BEARING_REFLECTED",
        message: `Bearing "${bearing.id}" (${bearing.type}) reflected on support "${support.id}".`,
        path: `bearings/${bearing.id}`,
      });
    }
  }

  return result;
}

function supportKindToConstraint(nodeId: string, kind: BridgeDefinitionSupport["kind"]): Support {
  switch (kind) {
    case "fixed":
      return { nodeId, ux: true, uy: true, uz: true, rx: true, ry: true, rz: true };
    case "roller":
      return { nodeId, ux: false, uy: true, uz: false, rx: false, ry: false, rz: false };
    case "pinned":
    case "custom":
    default:
      return { nodeId, ux: false, uy: true, uz: true, rx: true, ry: true, rz: true };
  }
}

function buildLoads(
  loads: BridgeDefinitionLoad[],
  girders: BridgeDefinitionGirder[],
  meshStations: number[],
  girderOffsets: number[],
  nodeIdByKey: Map<NodeKey, string>,
  members: Member[],
  diagnostics: BridgeDefinitionStructuralModelDiagnostic[],
): {
  loadCases: LoadCase[];
  nodalLoads: NodalLoad[];
  memberLoads: MemberLoad[];
} {
  const loadCases: LoadCase[] = [];
  const nodalLoads: NodalLoad[] = [];
  const memberLoads: MemberLoad[] = [];
  let nodalCounter = 0;
  let memberCounter = 0;

  const ensureLoadCase = (caseId: string, name?: string) => {
    if (!loadCases.some((loadCase) => loadCase.id === caseId)) {
      loadCases.push({ id: caseId, name: name ?? caseId, type: "static" });
    }
  };

  for (const load of loads) {
    if (load.type === "temperature") {
      continue;
    }

    ensureLoadCase(load.caseId, load.id);
    const magnitude = applyImpactFactor(load.magnitude, load.impactFactor);
    const [fx, fy, fz] = directionToComponents(load.direction, magnitude);

    if (load.type === "self_weight") {
      const perNode = nodesForLoadTarget(load, girders, meshStations, girderOffsets, nodeIdByKey);
      if (perNode.length === 0) {
        diagnostics.push({
          severity: "warning",
          code: "BD_SM_LOAD_TARGET_UNRESOLVED",
          message: `Self-weight load "${load.id}" could not be resolved to nodes.`,
          path: `loads/${load.id}`,
        });
        continue;
      }
      const perNodeMagnitude = fz / perNode.length;
      for (const nodeId of perNode) {
        nodalCounter += 1;
        nodalLoads.push({
          id: `NL${nodalCounter}`,
          loadCaseId: load.caseId,
          nodeId,
          fx: 0,
          fy: 0,
          fz: perNodeMagnitude,
          mx: 0,
          my: 0,
          mz: 0,
        });
      }
      continue;
    }

    if (load.type === "vehicle") {
      const targetNodes = nodesForLoadTarget(
        load,
        girders,
        meshStations,
        girderOffsets,
        nodeIdByKey,
      );
      const nodeId = targetNodes[0];
      if (!nodeId) {
        diagnostics.push({
          severity: "warning",
          code: "BD_SM_LOAD_TARGET_UNRESOLVED",
          message: `Vehicle load "${load.id}" could not be resolved to a node.`,
          path: `loads/${load.id}`,
        });
        continue;
      }
      nodalCounter += 1;
      nodalLoads.push({
        id: `NL${nodalCounter}`,
        loadCaseId: load.caseId,
        nodeId,
        fx,
        fy,
        fz,
        mx: 0,
        my: 0,
        mz: 0,
      });
      continue;
    }

    if (load.type === "distributed") {
      const targetMembers = membersForLoadTarget(load, girders, members, meshStations, nodeIdByKey);
      if (targetMembers.length === 0) {
        diagnostics.push({
          severity: "warning",
          code: "BD_SM_LOAD_TARGET_UNRESOLVED",
          message: `Distributed load "${load.id}" could not be resolved to members.`,
          path: `loads/${load.id}`,
        });
        continue;
      }
      for (const memberId of targetMembers) {
        memberCounter += 1;
        memberLoads.push({
          id: `ML${memberCounter}`,
          loadCaseId: load.caseId,
          memberId,
          coordinateSystem: "global",
          type: "uniform",
          wx: fx,
          wy: fy,
          wz: fz,
        });
      }
    }
  }

  if (loadCases.length === 0) {
    loadCases.push({
      id: PLACEHOLDER_LOAD_CASE_ID,
      name: "Bridge Definition Placeholder",
      type: "static",
    });
  }

  return { loadCases, nodalLoads, memberLoads };
}

function nodesForLoadTarget(
  load: BridgeDefinitionLoad,
  girders: BridgeDefinitionGirder[],
  meshStations: number[],
  girderOffsets: number[],
  nodeIdByKey: Map<NodeKey, string>,
): string[] {
  const { target } = load;

  if (target.kind === "deck") {
    const midStation = meshStations[Math.floor(meshStations.length / 2)] ?? meshStations[0]!;
    const nodeId = nodeIdByKey.get(nodeKey(midStation, girderOffsets[0] ?? 0));
    return nodeId ? [nodeId] : [];
  }

  if (target.kind === "girder") {
    const girder = girders.find((item) => item.id === target.refId);
    if (!girder) {
      return [];
    }
    const midStation = meshStations[Math.floor(meshStations.length / 2)] ?? meshStations[0]!;
    const nodeId = nodeIdByKey.get(nodeKey(midStation, roundCoordinate(girder.offset)));
    return nodeId ? [nodeId] : [];
  }

  if (target.kind === "line") {
    const girder = girders.find((item) => item.id === target.refId);
    const offset = girder ? roundCoordinate(girder.offset) : (girderOffsets[0] ?? 0);
    const midStation = meshStations[Math.floor(meshStations.length / 2)] ?? meshStations[0]!;
    const nodeId = nodeIdByKey.get(nodeKey(midStation, offset));
    return nodeId ? [nodeId] : [];
  }

  return [];
}

function membersForLoadTarget(
  load: BridgeDefinitionLoad,
  girders: BridgeDefinitionGirder[],
  members: Member[],
  meshStations: number[],
  nodeIdByKey: Map<NodeKey, string>,
): string[] {
  if (load.target.kind === "deck") {
    return members.map((member) => member.id);
  }

  const girder =
    load.target.kind === "girder" || load.target.kind === "line"
      ? girders.find((item) => item.id === load.target.refId)
      : undefined;

  if (!girder) {
    return members.map((member) => member.id);
  }

  const offset = roundCoordinate(girder.offset);
  const nodeIdsAtOffset = meshStations
    .map((station) => nodeIdByKey.get(nodeKey(station, offset)))
    .filter((nodeId): nodeId is string => nodeId != null);
  const nodeIdSet = new Set(nodeIdsAtOffset);

  return members
    .filter((member) => nodeIdSet.has(member.nodeI) && nodeIdSet.has(member.nodeJ))
    .map((member) => member.id);
}

function buildMaterials(
  bridgeDefinition: BridgeDefinition,
  defaultMaterialId: string,
  diagnostics: BridgeDefinitionStructuralModelDiagnostic[],
): Material[] {
  const materialsById = new Map<string, Material>();
  materialsById.set(defaultMaterialId, { id: defaultMaterialId, ...DEFAULT_MATERIAL });

  for (const girder of bridgeDefinition.girders) {
    if (girder.materialRefId && !materialsById.has(girder.materialRefId)) {
      materialsById.set(girder.materialRefId, {
        id: girder.materialRefId,
        ...DEFAULT_MATERIAL,
        name: `Material ${girder.materialRefId}`,
      });
      diagnostics.push({
        severity: "warning",
        code: "BD_SM_DEFAULT_MATERIAL",
        message: `Material "${girder.materialRefId}" referenced by girder "${girder.id}" uses placeholder properties.`,
        path: `girders/${girder.id}/materialRefId`,
      });
    }
  }

  return [...materialsById.values()];
}

function buildSections(
  bridgeDefinition: BridgeDefinition,
  defaultSectionId: string,
  diagnostics: BridgeDefinitionStructuralModelDiagnostic[],
): Section[] {
  const sectionsById = new Map<string, Section>();
  sectionsById.set(defaultSectionId, { id: defaultSectionId, ...DEFAULT_SECTION });

  for (const girder of bridgeDefinition.girders) {
    if (girder.sectionRefId && !sectionsById.has(girder.sectionRefId)) {
      sectionsById.set(girder.sectionRefId, {
        id: girder.sectionRefId,
        ...DEFAULT_SECTION,
        name: `Section ${girder.sectionRefId}`,
      });
      diagnostics.push({
        severity: "warning",
        code: "BD_SM_DEFAULT_SECTION",
        message: `Section "${girder.sectionRefId}" referenced by girder "${girder.id}" uses placeholder properties.`,
        path: `girders/${girder.id}/sectionRefId`,
      });
    }
  }

  for (const crossBeam of bridgeDefinition.crossBeams) {
    if (crossBeam.sectionRefId && !sectionsById.has(crossBeam.sectionRefId)) {
      sectionsById.set(crossBeam.sectionRefId, {
        id: crossBeam.sectionRefId,
        ...DEFAULT_SECTION,
        name: `Section ${crossBeam.sectionRefId}`,
      });
    }
  }

  return [...sectionsById.values()];
}

function buildProjectDescription(bridgeDefinition: BridgeDefinition): string {
  const parts = [
    "Generated from BridgeDefinition (Phase 4.5 Step 5 MVP generator).",
    `BridgeDefinition id: ${bridgeDefinition.id}`,
    `Source: ${bridgeDefinition.source.kind}`,
  ];
  if (bridgeDefinition.metadata.notes) {
    parts.push(bridgeDefinition.metadata.notes);
  }
  return parts.join(" ");
}

function nearestStation(meshStations: number[], station: number): number {
  return meshStations.reduce((closest, candidate) =>
    Math.abs(candidate - station) < Math.abs(closest - station) ? candidate : closest,
  );
}

function directionToComponents(
  direction: BridgeDefinitionLoad["direction"],
  magnitude: number,
): [number, number, number] {
  const sign = direction.startsWith("-") ? -1 : 1;
  const axis = direction.replace("-", "");
  if (axis === "X") {
    return [sign * magnitude, 0, 0];
  }
  if (axis === "Y") {
    return [0, sign * magnitude, 0];
  }
  return [0, 0, sign * magnitude];
}

function applyImpactFactor(magnitude: number, impactFactor?: number): number {
  if (impactFactor == null || impactFactor <= 0) {
    return magnitude;
  }
  return magnitude * (1 + impactFactor);
}
