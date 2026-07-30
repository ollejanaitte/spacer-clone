import type {
  ApolloPhase1Unit2Draft,
  ApolloPhase1Unit2Member,
  ApolloPhase1Unit2Node,
  ApolloPhase1Unit2Support,
  ProjectModel,
  Support,
} from "../../types";
import {
  APOLLO_VISUALIZATION_CONTRACT_VERSION,
  APOLLO_VISUALIZATION_SCHEMA_VERSION,
  DEFAULT_APOLLO_BRIDGE_GEOMETRY_DEFAULTS,
  type ApolloBridgeGeometryDefaultsProvider,
  type ApolloVisualizationBuildInput,
  type ApolloVisualizationBuildResult,
  type ApolloVisualizationCommonGeometryParameter,
  type ApolloVisualizationElement,
  type ApolloVisualizationEntityKind,
  type ApolloVisualizationGeometry,
  type ApolloVisualizationModel,
  type ApolloVisualizationWarning,
} from "./types";

const MODEL_AXIS_CONVENTION = "x-longitudinal-y-transverse-z-up";

type DraftLike = Pick<ApolloPhase1Unit2Draft, "nodes" | "members" | "supports" | "metadata">;

type DraftNode = ApolloPhase1Unit2Node;
type DraftMember = ApolloPhase1Unit2Member;
type DraftSupport = ApolloPhase1Unit2Support;

type NodeSource = {
  readonly id: string;
  readonly label: string;
  readonly x: number;
  readonly y: number;
  readonly z: number;
};

type MemberSource = {
  readonly id: string;
  readonly label: string;
  readonly nodeI: string;
  readonly nodeJ: string;
};

type SupportSource = {
  readonly id: string;
  readonly label: string;
  readonly nodeId: string;
};

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function cloneDefaultsProvider(
  provider: ApolloBridgeGeometryDefaultsProvider | undefined,
): ApolloBridgeGeometryDefaultsProvider {
  return provider
    ? {
        girder: { ...provider.girder },
        crossBeam: { ...provider.crossBeam },
        bracing: { ...provider.bracing },
        deck: { ...provider.deck },
        bearing: { ...provider.bearing },
        marker: { ...provider.marker },
      }
    : {
        girder: { ...DEFAULT_APOLLO_BRIDGE_GEOMETRY_DEFAULTS.girder },
        crossBeam: { ...DEFAULT_APOLLO_BRIDGE_GEOMETRY_DEFAULTS.crossBeam },
        bracing: { ...DEFAULT_APOLLO_BRIDGE_GEOMETRY_DEFAULTS.bracing },
        deck: { ...DEFAULT_APOLLO_BRIDGE_GEOMETRY_DEFAULTS.deck },
        bearing: { ...DEFAULT_APOLLO_BRIDGE_GEOMETRY_DEFAULTS.bearing },
        marker: { ...DEFAULT_APOLLO_BRIDGE_GEOMETRY_DEFAULTS.marker },
      };
}

function warning(
  code: ApolloVisualizationWarning["code"],
  message: string,
  sourceEntityKind?: ApolloVisualizationEntityKind,
  sourceEntityId?: string,
): ApolloVisualizationWarning {
  return {
    code,
    severity: code === "duplicate-id" || code === "non-finite-coordinate" ? "error" : "warning",
    message,
    ...(sourceEntityKind ? { sourceEntityKind } : {}),
    ...(sourceEntityId ? { sourceEntityId } : {}),
  };
}

function sortById<T extends { readonly id: string }>(items: readonly T[]): T[] {
  return [...items].sort((left, right) => left.id.localeCompare(right.id));
}

function projectToDraftLike(project: ProjectModel): DraftLike {
  const nodes: DraftNode[] = project.nodes.map((node) => ({
    id: node.id,
    label: node.label ?? node.id,
    x: node.x,
    y: node.y,
    z: node.z,
    active: true,
    comment: "",
  }));
  const members: DraftMember[] = project.members.map((member) => ({
    id: member.id,
    label: member.label ?? member.id,
    nodeI: member.nodeI,
    nodeJ: member.nodeJ,
    materialRefId: member.materialId,
    active: true,
    comment: "",
  }));
  const supports: DraftSupport[] = project.supports.map((support, index) => ({
    id: support.id ?? `SUP-${index + 1}`,
    nodeId: support.nodeId,
    label: support.label ?? support.nodeId,
    ux: support.ux ? "FIXED" : "FREE",
    uy: support.uy ? "FIXED" : "FREE",
    uz: support.uz ? "FIXED" : "FREE",
    rx: support.rx ? "FIXED" : "FREE",
    ry: support.ry ? "FIXED" : "FREE",
    rz: support.rz ? "FIXED" : "FREE",
    active: true,
    comment: "",
  }));
  return {
    nodes,
    members,
    supports,
    metadata: {
      projectId: project.project.id,
      name: project.project.name,
      description: project.project.description,
      createdAt: project.project.createdAt,
      updatedAt: project.project.updatedAt,
      provisionalStatus: "unverified",
      localDraftStatus: "saved",
    },
  };
}

function hasDuplicates(items: readonly { readonly id: string }[]): string[] {
  const counts = new Map<string, number>();
  for (const item of items) {
    counts.set(item.id, (counts.get(item.id) ?? 0) + 1);
  }
  return [...counts.entries()]
    .filter(([, count]) => count > 1)
    .map(([id]) => id)
    .sort((left, right) => left.localeCompare(right));
}

function supportAnchorPosition(
  support: SupportSource,
  nodeById: ReadonlyMap<string, NodeSource>,
): readonly [number, number, number] | null {
  const node = nodeById.get(support.nodeId);
  if (!node) return null;
  return [node.x, node.y, node.z];
}

function toMm(lengthM: number): number {
  return Math.round(lengthM * 1000);
}

export function convertLengthMetersToMillimeters(lengthM: number): number {
  return toMm(lengthM);
}

function buildNodeElement(node: NodeSource): {
  readonly elements: readonly ApolloVisualizationElement[];
  readonly commonGeometryParameters: readonly ApolloVisualizationCommonGeometryParameter[];
} {
  const geometry: ApolloVisualizationGeometry = {
    type: "point",
    position: [node.x, node.y, node.z],
  };
  const commonGeometryParameterId = `geom-node:${node.id}`;
  return {
    elements: [
      {
        id: `node:${node.id}`,
        elementKind: "node",
        sourceEntityKind: "node",
        sourceEntityId: node.id,
        selectionKey: `node:${node.id}`,
        validationTargetKey: `node:${node.id}`,
        displayLabel: node.label,
        visibilityGroup: "nodes",
        exportable: false,
        geometry,
        commonGeometryParameterId,
        validationState: "none",
      },
      {
        id: `node-label:${node.id}`,
        elementKind: "node-label",
        sourceEntityKind: "node",
        sourceEntityId: node.id,
        selectionKey: `node:${node.id}`,
        validationTargetKey: `node:${node.id}`,
        displayLabel: node.label,
        visibilityGroup: "labels",
        exportable: false,
        geometry: {
          type: "label-anchor",
          position: [node.x, node.y, node.z],
          text: node.label,
        },
        validationState: "none",
      },
    ],
    commonGeometryParameters: [
      {
        id: commonGeometryParameterId,
        sourceEntityKind: "node",
        sourceEntityId: node.id,
        geometryType: "point",
        coordinatesM: {
          position: [node.x, node.y, node.z],
        },
        exportable: false,
        visibilityGroup: "nodes",
      },
    ],
  };
}

function buildMemberElement(
  member: MemberSource,
  nodeById: ReadonlyMap<string, NodeSource>,
): {
  readonly elements: readonly ApolloVisualizationElement[];
  readonly commonGeometryParameters: readonly ApolloVisualizationCommonGeometryParameter[];
} | null {
  const nodeI = nodeById.get(member.nodeI);
  const nodeJ = nodeById.get(member.nodeJ);
  if (!nodeI || !nodeJ) return null;
  const deltaX = nodeJ.x - nodeI.x;
  const deltaY = nodeJ.y - nodeI.y;
  const deltaZ = nodeJ.z - nodeI.z;
  const length = Math.hypot(deltaX, deltaY, deltaZ);
  if (!Number.isFinite(length) || length <= 1e-9) return null;

  const commonGeometryParameterId = `geom-member:${member.id}`;
  return {
    elements: [
      {
        id: `member:${member.id}`,
        elementKind: "member",
        sourceEntityKind: "member",
        sourceEntityId: member.id,
        selectionKey: `member:${member.id}`,
        validationTargetKey: `member:${member.id}`,
        displayLabel: member.label,
        visibilityGroup: "members",
        exportable: false,
        geometry: {
          type: "line",
          start: [nodeI.x, nodeI.y, nodeI.z],
          end: [nodeJ.x, nodeJ.y, nodeJ.z],
        },
        commonGeometryParameterId,
        validationState: "none",
      },
      {
        id: `member-label:${member.id}`,
        elementKind: "member-label",
        sourceEntityKind: "member",
        sourceEntityId: member.id,
        selectionKey: `member:${member.id}`,
        validationTargetKey: `member:${member.id}`,
        displayLabel: member.label,
        visibilityGroup: "labels",
        exportable: false,
        geometry: {
          type: "label-anchor",
          position: [
            (nodeI.x + nodeJ.x) / 2,
            (nodeI.y + nodeJ.y) / 2,
            (nodeI.z + nodeJ.z) / 2,
          ],
          text: member.label,
        },
        validationState: "none",
      },
    ],
    commonGeometryParameters: [
      {
        id: commonGeometryParameterId,
        sourceEntityKind: "member",
        sourceEntityId: member.id,
        geometryType: "line",
        coordinatesM: {
          start: [nodeI.x, nodeI.y, nodeI.z],
          end: [nodeJ.x, nodeJ.y, nodeJ.z],
          lengthMm: [toMm(length)],
        },
        exportable: false,
        visibilityGroup: "members",
      },
    ],
  };
}

function buildSupportElement(
  support: SupportSource,
  nodeById: ReadonlyMap<string, NodeSource>,
): {
  readonly elements: readonly ApolloVisualizationElement[];
  readonly commonGeometryParameters: readonly ApolloVisualizationCommonGeometryParameter[];
} | null {
  const position = supportAnchorPosition(support, nodeById);
  if (!position) return null;
  const commonGeometryParameterId = `geom-support:${support.id}`;
  return {
    elements: [
      {
        id: `support:${support.id}`,
        elementKind: "support",
        sourceEntityKind: "support",
        sourceEntityId: support.id,
        selectionKey: `support:${support.id}`,
        validationTargetKey: `support:${support.id}`,
        displayLabel: support.label,
        visibilityGroup: "supports",
        exportable: false,
        geometry: {
          type: "point",
          position,
        },
        commonGeometryParameterId,
        validationState: "none",
      },
    ],
    commonGeometryParameters: [
      {
        id: commonGeometryParameterId,
        sourceEntityKind: "support",
        sourceEntityId: support.id,
        geometryType: "point",
        coordinatesM: {
          position,
        },
        exportable: false,
        visibilityGroup: "supports",
      },
    ],
  };
}

function collectNodeWarnings(nodes: readonly NodeSource[]): ApolloVisualizationWarning[] {
  const warnings: ApolloVisualizationWarning[] = [];
  for (const id of hasDuplicates(nodes)) {
    warnings.push(warning("duplicate-id", `Duplicate node id "${id}" detected.`, "node", id));
  }
  for (const node of nodes) {
    if (!isFiniteNumber(node.x) || !isFiniteNumber(node.y) || !isFiniteNumber(node.z)) {
      warnings.push(
        warning(
          "non-finite-coordinate",
          `Node "${node.id}" contains non-finite coordinates.`,
          "node",
          node.id,
        ),
      );
    }
  }
  return warnings;
}

function collectMemberWarnings(
  members: readonly MemberSource[],
  nodeById: ReadonlyMap<string, NodeSource>,
): ApolloVisualizationWarning[] {
  const warnings: ApolloVisualizationWarning[] = [];
  for (const id of hasDuplicates(members)) {
    warnings.push(warning("duplicate-id", `Duplicate member id "${id}" detected.`, "member", id));
  }
  for (const member of members) {
    const nodeI = nodeById.get(member.nodeI);
    const nodeJ = nodeById.get(member.nodeJ);
    if (!nodeI || !nodeJ) {
      warnings.push(
        warning(
          "missing-node-reference",
          `Member "${member.id}" references a missing node.`,
          "member",
          member.id,
        ),
      );
      continue;
    }
    const length = Math.hypot(nodeJ.x - nodeI.x, nodeJ.y - nodeI.y, nodeJ.z - nodeI.z);
    if (!Number.isFinite(length) || length <= 1e-9) {
      warnings.push(
        warning("zero-length-member", `Member "${member.id}" has zero length.`, "member", member.id),
      );
    }
  }
  return warnings;
}

function collectSupportWarnings(
  supports: readonly SupportSource[],
  nodeById: ReadonlyMap<string, NodeSource>,
): ApolloVisualizationWarning[] {
  const warnings: ApolloVisualizationWarning[] = [];
  for (const id of hasDuplicates(supports)) {
    warnings.push(warning("duplicate-id", `Duplicate support id "${id}" detected.`, "support", id));
  }
  for (const support of supports) {
    if (!nodeById.has(support.nodeId)) {
      warnings.push(
        warning(
          "invalid-support-reference",
          `Support "${support.id}" references a missing node "${support.nodeId}".`,
          "support",
          support.id,
        ),
      );
    }
  }
  return warnings;
}

function sourceRevision(project: ProjectModel, draft: DraftLike): string | null {
  return draft.metadata.updatedAt ?? project.project.updatedAt ?? null;
}

function toNodeSource(node: DraftNode): NodeSource {
  return {
    id: node.id,
    label: node.label,
    x: node.x,
    y: node.y,
    z: node.z,
  };
}

function toMemberSource(member: DraftMember): MemberSource {
  return {
    id: member.id,
    label: member.label,
    nodeI: member.nodeI,
    nodeJ: member.nodeJ,
  };
}

function toSupportSource(support: DraftSupport): SupportSource {
  return {
    id: support.id,
    label: support.label,
    nodeId: support.nodeId,
  };
}

function buildDraftLike(input: ApolloVisualizationBuildInput): DraftLike {
  return input.draft ?? input.project.apolloPhase1Unit2 ?? projectToDraftLike(input.project);
}

function hasFatalWarnings(warnings: readonly ApolloVisualizationWarning[]): boolean {
  return warnings.some((entry) => entry.severity === "error");
}

export function buildApolloVisualizationModel(
  input: ApolloVisualizationBuildInput,
): ApolloVisualizationBuildResult {
  const project = input.project;
  const draft = buildDraftLike(input);
  const defaultsProvider = cloneDefaultsProvider(input.defaultsProvider);
  const nodes = sortById(draft.nodes.map(toNodeSource));
  const nodeWarnings = collectNodeWarnings(nodes);
  const nodeById = new Map(
    nodes
      .filter((node) => isFiniteNumber(node.x) && isFiniteNumber(node.y) && isFiniteNumber(node.z))
      .map((node) => [node.id, node] as const),
  );
  const members = sortById(draft.members.map(toMemberSource));
  const supports = sortById(draft.supports.map(toSupportSource));
  const warnings = [
    ...nodeWarnings,
    ...collectMemberWarnings(members, nodeById),
    ...collectSupportWarnings(supports, nodeById),
  ];

  if (nodes.length === 0) {
    warnings.push(warning("empty-model", "Apollo visualization source contains no nodes."));
  }

  if (hasFatalWarnings(warnings)) {
    return { ok: false, diagnostics: warnings };
  }

  const elements: ApolloVisualizationElement[] = [];
  const commonGeometryParameters: ApolloVisualizationCommonGeometryParameter[] = [];

  for (const node of nodes) {
    const built = buildNodeElement(node);
    elements.push(...built.elements);
    commonGeometryParameters.push(...built.commonGeometryParameters);
  }

  for (const member of members) {
    const built = buildMemberElement(member, nodeById);
    if (!built) continue;
    elements.push(...built.elements);
    commonGeometryParameters.push(...built.commonGeometryParameters);
  }

  for (const support of supports) {
    const built = buildSupportElement(support, nodeById);
    if (!built) continue;
    elements.push(...built.elements);
    commonGeometryParameters.push(...built.commonGeometryParameters);
  }

  const model: ApolloVisualizationModel = {
    schemaVersion: APOLLO_VISUALIZATION_SCHEMA_VERSION,
    contractVersion: APOLLO_VISUALIZATION_CONTRACT_VERSION,
    sourceRevision: sourceRevision(project, draft),
    sourceProjectId: project.project.id,
    sourceProjectName: project.project.name,
    sourceSchemaVersion:
      typeof project.project.schemaVersion === "string"
        ? project.project.schemaVersion
        : String(project.project.schemaVersion),
    units: {
      sourceLength: project.units.length === "m" ? "m" : "m",
      displayLength: "m",
      exportLength: "mm",
    },
    coordinateSystem: {
      axisConvention: MODEL_AXIS_CONVENTION,
      originPolicy: "model-space",
    },
    warnings,
    assumptions: [
      {
        code: "poc-defaults-provider",
        message: `PoC defaults provider prepared with girder depth ${defaultsProvider.girder.depthM}m.`,
      },
    ],
    elements,
    commonGeometryParameters,
    solidGeometryParameters: [],
  };

  return { ok: true, model };
}

export function buildApolloVisualizationModelOrThrow(
  input: ApolloVisualizationBuildInput,
): ApolloVisualizationModel {
  const result = buildApolloVisualizationModel(input);
  if (!result.ok) {
    throw new Error(result.diagnostics.map((entry) => entry.message).join(" "));
  }
  return result.model;
}

export function createSupportSelectionKey(support: Support | DraftSupport): string {
  return `support:${"id" in support && typeof support.id === "string" ? support.id : support.nodeId}`;
}
