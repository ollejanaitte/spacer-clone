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
  type ApolloVisualizationAssumption,
  type ApolloSolidGeometryParameter,
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
  readonly ux?: boolean;
  readonly uy?: boolean;
  readonly uz?: boolean;
  readonly rx?: boolean;
  readonly ry?: boolean;
  readonly rz?: boolean;
};

type Axis3 = readonly [number, number, number];

type LocalFrame = {
  readonly origin: readonly [number, number, number];
  readonly xAxis: Axis3;
  readonly yAxis: Axis3;
  readonly zAxis: Axis3;
};

type SpanGeometry = {
  readonly member: MemberSource;
  readonly start: NodeSource;
  readonly end: NodeSource;
  readonly midpoint: readonly [number, number, number];
  readonly lengthM: number;
  readonly frame: LocalFrame;
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
    ux: support.ux === "FIXED",
    uy: support.uy === "FIXED",
    uz: support.uz === "FIXED",
    rx: support.rx === "FIXED",
    ry: support.ry === "FIXED",
    rz: support.rz === "FIXED",
  };
}

function isPositiveFiniteNumber(value: unknown): value is number {
  return isFiniteNumber(value) && value > 1e-9;
}

function vectorFromPoints(
  start: readonly [number, number, number],
  end: readonly [number, number, number],
): Axis3 {
  return [end[0] - start[0], end[1] - start[1], end[2] - start[2]];
}

function vectorLength(vector: Axis3): number {
  return Math.hypot(vector[0], vector[1], vector[2]);
}

function normalize(vector: Axis3): Axis3 | null {
  const length = vectorLength(vector);
  if (!Number.isFinite(length) || length <= 1e-9) return null;
  return [vector[0] / length, vector[1] / length, vector[2] / length];
}

function cross(left: Axis3, right: Axis3): Axis3 {
  return [
    left[1] * right[2] - left[2] * right[1],
    left[2] * right[0] - left[0] * right[2],
    left[0] * right[1] - left[1] * right[0],
  ];
}

function addScaled(
  point: readonly [number, number, number],
  axis: Axis3,
  distance: number,
): readonly [number, number, number] {
  return [
    point[0] + axis[0] * distance,
    point[1] + axis[1] * distance,
    point[2] + axis[2] * distance,
  ];
}

function midpoint(
  start: readonly [number, number, number],
  end: readonly [number, number, number],
): readonly [number, number, number] {
  return [
    (start[0] + end[0]) / 2,
    (start[1] + end[1]) / 2,
    (start[2] + end[2]) / 2,
  ];
}

function interpolate(
  start: readonly [number, number, number],
  end: readonly [number, number, number],
  t: number,
): readonly [number, number, number] {
  return [
    start[0] + (end[0] - start[0]) * t,
    start[1] + (end[1] - start[1]) * t,
    start[2] + (end[2] - start[2]) * t,
  ];
}

function buildSpanGeometry(
  member: MemberSource,
  start: NodeSource,
  end: NodeSource,
): SpanGeometry | null {
  const startPoint: readonly [number, number, number] = [start.x, start.y, start.z];
  const endPoint: readonly [number, number, number] = [end.x, end.y, end.z];
  const xAxis = normalize(vectorFromPoints(startPoint, endPoint));
  if (!xAxis) return null;
  const upSeed: Axis3 = Math.abs(xAxis[2]) < 0.999 ? [0, 0, 1] : [0, 1, 0];
  const yAxis = normalize(cross(upSeed, xAxis));
  if (!yAxis) return null;
  const zAxis = normalize(cross(xAxis, yAxis));
  if (!zAxis) return null;
  return {
    member,
    start,
    end,
    midpoint: midpoint(startPoint, endPoint),
    lengthM: Math.hypot(end.x - start.x, end.y - start.y, end.z - start.z),
    frame: {
      origin: midpoint(startPoint, endPoint),
      xAxis,
      yAxis,
      zAxis,
    },
  };
}

function supportKind(support: SupportSource): "fixed" | "movable" {
  return support.rx && support.ry && support.rz ? "fixed" : "movable";
}

function buildSolidGeometryParameters(
  members: readonly MemberSource[],
  supports: readonly SupportSource[],
  nodeById: ReadonlyMap<string, NodeSource>,
  defaultsProvider: ApolloBridgeGeometryDefaultsProvider,
  warnings: ApolloVisualizationWarning[],
  assumptions: ApolloVisualizationAssumption[],
): ApolloSolidGeometryParameter[] {
  const solids: ApolloSolidGeometryParameter[] = [];
  const spanGeometries = members
    .map((member) => {
      const start = nodeById.get(member.nodeI);
      const end = nodeById.get(member.nodeJ);
      if (!start || !end) return null;
      return buildSpanGeometry(member, start, end);
    })
    .filter((entry): entry is SpanGeometry => entry !== null);

  const requestedOffsets = defaultsProvider.girder.transverseOffsetsM ?? [];
  const offsets = [...new Set(requestedOffsets.filter(isFiniteNumber))].sort((left, right) => left - right);
  const girderOffsets = offsets.length > 0 ? offsets : [0];
  if (offsets.length === 0) {
    warnings.push(
      warning(
        "missing-bridge-geometry",
        "No girder transverse offsets were provided. Falling back to a single centerline girder.",
      ),
    );
  }
  assumptions.push({
    code: "simple-solid-girder-offsets",
    message: `Simple solid girder offsets derived from defaults provider: ${girderOffsets.join(", ")} m.`,
  });

  const deckThicknessM = defaultsProvider.deck.thicknessM;
  const deckWidthM = isPositiveFiniteNumber(defaultsProvider.deck.widthM)
    ? defaultsProvider.deck.widthM
    : Math.max(0, Math.max(...girderOffsets) - Math.min(...girderOffsets) + defaultsProvider.deck.overhangM * 2);
  if (!isPositiveFiniteNumber(deckWidthM)) {
    warnings.push(warning("invalid-solid-dimension", "Deck width defaults are invalid. Deck solids were skipped."));
  } else {
    assumptions.push({
      code: "simple-solid-deck-width",
      message: `Simple solid deck width derived as ${deckWidthM}m.`,
    });
  }

  const crossBeamStations = (defaultsProvider.crossBeam.stationFractions ?? [0.25, 0.5, 0.75])
    .filter((value) => isFiniteNumber(value) && value > 0 && value < 1)
    .sort((left, right) => left - right);
  assumptions.push({
    code: "simple-solid-cross-beam-stations",
    message: `Cross beam station fractions: ${crossBeamStations.join(", ")}.`,
  });

  for (const span of spanGeometries) {
    if (!isPositiveFiniteNumber(span.lengthM)) continue;

    const girderShape = defaultsProvider.girder.shape;
    const girderDepthM = defaultsProvider.girder.depthM;
    const flangeWidthM = defaultsProvider.girder.flangeWidthM;
    const flangeThicknessM = defaultsProvider.girder.flangeThicknessM;
    const webThicknessM = defaultsProvider.girder.webThicknessM;
    const useBoxFallback =
      !isPositiveFiniteNumber(girderDepthM) ||
      !isPositiveFiniteNumber(flangeWidthM) ||
      !isPositiveFiniteNumber(flangeThicknessM) ||
      !isPositiveFiniteNumber(webThicknessM) ||
      flangeThicknessM * 2 >= girderDepthM ||
      webThicknessM >= flangeWidthM;

    if (useBoxFallback) {
      warnings.push(
        warning(
          "invalid-solid-dimension",
          `Girder defaults were invalid for member "${span.member.id}". Falling back to simple box girders.`,
          "member",
          span.member.id,
        ),
      );
    }

    for (const [index, offsetM] of girderOffsets.entries()) {
      solids.push({
        id: `solid:girder:${span.member.id}:${index}`,
        sourceEntityKind: "member",
        sourceEntityId: span.member.id,
        selectionKey: `member:${span.member.id}`,
        validationTargetKey: `member:${span.member.id}`,
        displayLabel: `${span.member.label} G${index + 1}`,
        kind: "girder",
        visibilityGroup: "girders",
        exportable: true,
        dimensionsM: {
          length: span.lengthM,
          offset: offsetM,
          depth: Math.max(girderDepthM, 0.1),
          flangeWidth: Math.max(flangeWidthM, 0.1),
          flangeThickness: Math.max(flangeThicknessM, 0.02),
          webThickness: Math.max(webThicknessM, 0.02),
          shape: useBoxFallback || girderShape === "simple_box" ? 0 : 1,
        },
        localFrame: {
          ...span.frame,
          origin: addScaled(
            addScaled(span.midpoint, span.frame.yAxis, offsetM),
            span.frame.zAxis,
            -Math.max(girderDepthM, 0.1) / 2,
          ),
        },
      });
    }

    if (isPositiveFiniteNumber(deckWidthM) && isPositiveFiniteNumber(deckThicknessM)) {
      solids.push({
        id: `solid:deck:${span.member.id}`,
        sourceEntityKind: "member",
        sourceEntityId: span.member.id,
        selectionKey: `member:${span.member.id}`,
        validationTargetKey: `member:${span.member.id}`,
        displayLabel: `${span.member.label} deck`,
        kind: "deck",
        visibilityGroup: "deck",
        exportable: true,
        dimensionsM: {
          length: span.lengthM,
          width: deckWidthM,
          thickness: deckThicknessM,
          overhang: defaultsProvider.deck.overhangM,
        },
        localFrame: {
          ...span.frame,
          origin: addScaled(span.midpoint, span.frame.zAxis, deckThicknessM / 2),
        },
      });
    }

    if (girderOffsets.length >= 2) {
      const leftOffset = Math.min(...girderOffsets);
      const rightOffset = Math.max(...girderOffsets);
      const beamLengthM = rightOffset - leftOffset;
      for (const [stationIndex, fraction] of crossBeamStations.entries()) {
        if (!isPositiveFiniteNumber(beamLengthM)) continue;
        const station = interpolate([span.start.x, span.start.y, span.start.z], [span.end.x, span.end.y, span.end.z], fraction);
        solids.push({
          id: `solid:cross-beam:${span.member.id}:${stationIndex}`,
          sourceEntityKind: "member",
          sourceEntityId: span.member.id,
          selectionKey: `member:${span.member.id}`,
          validationTargetKey: `member:${span.member.id}`,
          displayLabel: `${span.member.label} cross beam ${stationIndex + 1}`,
          kind: "cross_beam",
          visibilityGroup: "cross-beams",
          exportable: true,
          dimensionsM: {
            length: beamLengthM,
            width: Math.max(defaultsProvider.crossBeam.widthM, 0.1),
            depth: Math.max(defaultsProvider.crossBeam.depthM, 0.1),
          },
          localFrame: {
            origin: addScaled(
              addScaled(station, span.frame.zAxis, -Math.max(girderDepthM, 0.1) / 2),
              span.frame.zAxis,
              Math.max(defaultsProvider.crossBeam.depthM, 0.1) / 2,
            ),
            xAxis: span.frame.yAxis,
            yAxis: span.frame.zAxis,
            zAxis: span.frame.xAxis,
          },
        });
      }

      if (defaultsProvider.bracing.pattern !== "none" && crossBeamStations.length >= 2) {
        for (let stationIndex = 0; stationIndex < crossBeamStations.length - 1; stationIndex += 1) {
          const startStation = interpolate(
            [span.start.x, span.start.y, span.start.z],
            [span.end.x, span.end.y, span.end.z],
            crossBeamStations[stationIndex],
          );
          const endStation = interpolate(
            [span.start.x, span.start.y, span.start.z],
            [span.end.x, span.end.y, span.end.z],
            crossBeamStations[stationIndex + 1],
          );
          const startPoint = addScaled(
            addScaled(startStation, span.frame.yAxis, leftOffset),
            span.frame.zAxis,
            -Math.max(girderDepthM, 0.1) * 0.55,
          );
          const endPoint = addScaled(
            addScaled(endStation, span.frame.yAxis, rightOffset),
            span.frame.zAxis,
            -Math.max(girderDepthM, 0.1) * 0.55,
          );
          const braceAxis = normalize(vectorFromPoints(startPoint, endPoint));
          if (!braceAxis) continue;
          const braceY = normalize(cross(span.frame.zAxis, braceAxis)) ?? span.frame.yAxis;
          const braceZ = normalize(cross(braceAxis, braceY)) ?? span.frame.zAxis;
          solids.push({
            id: `solid:bracing:${span.member.id}:${stationIndex}`,
            sourceEntityKind: "member",
            sourceEntityId: span.member.id,
            selectionKey: `member:${span.member.id}`,
            validationTargetKey: `member:${span.member.id}`,
            displayLabel: `${span.member.label} bracing ${stationIndex + 1}`,
            kind: "bracing",
            visibilityGroup: "bracings",
            exportable: true,
            dimensionsM: {
              length: vectorLength(vectorFromPoints(startPoint, endPoint)),
              diameter: Math.max(defaultsProvider.bracing.diameterM, 0.04),
            },
            localFrame: {
              origin: midpoint(startPoint, endPoint),
              xAxis: braceAxis,
              yAxis: braceY,
              zAxis: braceZ,
            },
          });
        }
      }
    } else {
      warnings.push(
        warning(
          "missing-bridge-geometry",
          `Member "${span.member.id}" has fewer than two girder offsets. Cross beams and bracing were omitted.`,
          "member",
          span.member.id,
        ),
      );
    }
  }

  const supportEntries = supports
    .map((support) => {
      const node = nodeById.get(support.nodeId);
      return node ? { support, node } : null;
    })
    .filter((entry): entry is { support: SupportSource; node: NodeSource } => entry !== null)
    .sort((left, right) => left.node.x - right.node.x || left.support.id.localeCompare(right.support.id));

  for (const [supportIndex, entry] of supportEntries.entries()) {
    const classification =
      supportIndex === 0 || supportIndex === supportEntries.length - 1
        ? "abutment_marker"
        : "pier_marker";
    const startPoint: readonly [number, number, number] = [entry.node.x, entry.node.y, entry.node.z];
    for (const [girderIndex, offsetM] of girderOffsets.entries()) {
      solids.push({
        id: `solid:bearing:${entry.support.id}:${girderIndex}`,
        sourceEntityKind: "support",
        sourceEntityId: entry.support.id,
        selectionKey: `support:${entry.support.id}`,
        validationTargetKey: `support:${entry.support.id}`,
        displayLabel: `${entry.support.label} bearing ${girderIndex + 1}`,
        kind: "bearing",
        visibilityGroup: "bearings",
        exportable: true,
        dimensionsM: {
          width: Math.max(defaultsProvider.bearing.widthM, 0.1),
          length: Math.max(defaultsProvider.bearing.lengthM, 0.1),
          height: Math.max(defaultsProvider.bearing.heightM, 0.05),
          offset: offsetM,
          fixed: supportKind(entry.support) === "fixed" ? 1 : 0,
        },
        localFrame: {
          origin: [
            startPoint[0],
            startPoint[1] + offsetM,
            startPoint[2] - Math.max(defaultsProvider.bearing.heightM, 0.05) / 2,
          ],
          xAxis: [1, 0, 0],
          yAxis: [0, 1, 0],
          zAxis: [0, 0, 1],
        },
      });
    }

    solids.push({
      id: `solid:marker:${entry.support.id}`,
      sourceEntityKind: "support",
      sourceEntityId: entry.support.id,
      selectionKey: `support:${entry.support.id}`,
      validationTargetKey: `support:${entry.support.id}`,
      displayLabel: `${entry.support.label} marker`,
      kind: classification,
      visibilityGroup: "markers",
      exportable: false,
      dimensionsM: {
        width: Math.max(defaultsProvider.marker.widthM, 0.5),
        length: Math.max(defaultsProvider.marker.lengthM, 0.5),
        height: Math.max(defaultsProvider.marker.heightM, 0.5),
      },
      localFrame: {
        origin: [
          startPoint[0],
          startPoint[1],
          startPoint[2] - Math.max(defaultsProvider.marker.heightM, 0.5) / 2 - Math.max(defaultsProvider.bearing.heightM, 0.05),
        ],
        xAxis: [1, 0, 0],
        yAxis: [0, 1, 0],
        zAxis: [0, 0, 1],
      },
    });
  }

  return solids.sort((left, right) => left.id.localeCompare(right.id));
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
  const assumptions: ApolloVisualizationAssumption[] = [];

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

  const solidGeometryParameters = buildSolidGeometryParameters(
    members,
    supports,
    nodeById,
    defaultsProvider,
    warnings,
    assumptions,
  );

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
      ...assumptions,
      {
        code: "poc-defaults-provider",
        message: `PoC defaults provider prepared with girder depth ${defaultsProvider.girder.depthM}m.`,
      },
    ],
    elements,
    commonGeometryParameters,
    solidGeometryParameters,
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
