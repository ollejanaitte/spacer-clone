import * as THREE from "three";
import type {
  ApolloVisualizationElement,
  ApolloVisualizationLabelAnchorGeometry,
  ApolloVisualizationLineGeometry,
  ApolloVisualizationModel,
  ApolloVisualizationPointGeometry,
  ApolloSolidGeometryParameter,
} from "../../apollo/visualization";
import type { SectionKey } from "../../types";
import { assignLabelPriority } from "../labelCollisionAvoidance";
import { createLabelSprite, createLine } from "../threeUtils";
import type {
  ApolloViewerValidationHighlight,
  ViewerScales,
  ViewerSelection,
} from "../types";

const nodeMaterial = new THREE.MeshStandardMaterial({ color: "#222222", roughness: 0.55 });
const selectedNodeMaterial = new THREE.MeshStandardMaterial({ color: "#f2c94c", roughness: 0.35 });
const warningNodeMaterial = new THREE.MeshStandardMaterial({ color: "#d5a021", roughness: 0.35 });
const errorNodeMaterial = new THREE.MeshStandardMaterial({ color: "#d14343", roughness: 0.35 });
const supportMaterial = new THREE.MeshStandardMaterial({ color: "#444444", roughness: 0.65 });
const selectedSupportMaterial = new THREE.MeshStandardMaterial({ color: "#f2c94c", roughness: 0.4 });
const warningSupportMaterial = new THREE.MeshStandardMaterial({ color: "#d5a021", roughness: 0.4 });
const errorSupportMaterial = new THREE.MeshStandardMaterial({ color: "#d14343", roughness: 0.4 });
const deckMaterial = new THREE.MeshStandardMaterial({ color: "#9fbe7a", roughness: 0.55, transparent: true, opacity: 0.78 });
const girderMaterial = new THREE.MeshStandardMaterial({ color: "#6f7783", roughness: 0.45 });
const crossBeamMaterial = new THREE.MeshStandardMaterial({ color: "#8b7f6b", roughness: 0.5 });
const bracingMaterial = new THREE.MeshStandardMaterial({ color: "#537188", roughness: 0.4 });
const bearingMaterial = new THREE.MeshStandardMaterial({ color: "#5b4b3a", roughness: 0.55 });
const markerMaterial = new THREE.MeshStandardMaterial({ color: "#4d6174", roughness: 0.5, transparent: true, opacity: 0.45 });
const appurtenanceMaterial = new THREE.MeshStandardMaterial({ color: "#7a8f6a", roughness: 0.5 });
const haunchMaterial = new THREE.MeshStandardMaterial({ color: "#b8a078", roughness: 0.55 });
const pavementMaterial = new THREE.MeshStandardMaterial({ color: "#4a4a4a", roughness: 0.85 });
const roadMarkingMaterial = new THREE.MeshStandardMaterial({ color: "#f5f5f0", roughness: 0.4 });

type ApolloSelectionRenderState = {
  readonly primarySelection: ViewerSelection;
  readonly selectedKeys: ReadonlySet<string>;
  readonly validationHighlight: ApolloViewerValidationHighlight | null;
};

export function renderApolloVisualizationNodes(
  model: ApolloVisualizationModel,
  selectedSection: SectionKey,
  selectionState: ApolloSelectionRenderState,
  scales: ViewerScales,
): THREE.Object3D[] {
  const radius = Math.max(scales.nodeSize, 0.02);
  const geometry = new THREE.SphereGeometry(radius, 18, 12);
  return model.elements
    .filter((entry): entry is ApolloVisualizationElement & { geometry: ApolloVisualizationPointGeometry } =>
      entry.elementKind === "node" && entry.geometry.type === "point")
    .map((entry) => {
      const renderState = resolveElementRenderState(entry, selectionState);
      const mesh = new THREE.Mesh(
        geometry.clone(),
        materialForState(renderState, nodeMaterial, selectedNodeMaterial, warningNodeMaterial, errorNodeMaterial),
      );
      mesh.position.set(entry.geometry.position[0], entry.geometry.position[1], entry.geometry.position[2]);
      mesh.userData = {
        selectable: true,
        type: entry.sourceEntityKind,
        id: entry.sourceEntityId,
        apolloVisualizationElementId: entry.id,
      };
      if (selectedSection === "nodes") {
        mesh.scale.setScalar(renderState.selected ? 1.65 : 1.25);
      } else if (renderState.selected) {
        mesh.scale.setScalar(1.4);
      }
      return mesh;
    });
}

export function renderApolloVisualizationMembers(
  model: ApolloVisualizationModel,
  selectedSection: SectionKey,
  selectionState: ApolloSelectionRenderState,
  scales: ViewerScales,
): THREE.Object3D[] {
  const objects: THREE.Object3D[] = [];
  for (const entry of model.elements) {
    if (entry.elementKind !== "member" || entry.geometry.type !== "line") continue;
    const geometry = entry.geometry as ApolloVisualizationLineGeometry;
    const start = new THREE.Vector3(geometry.start[0], geometry.start[1], geometry.start[2]);
    const end = new THREE.Vector3(geometry.end[0], geometry.end[1], geometry.end[2]);
    const delta = new THREE.Vector3().subVectors(end, start);
    const length = delta.length();
    if (!Number.isFinite(length) || length <= 1e-9) continue;
    const renderState = resolveElementRenderState(entry, selectionState);
    const color = renderState.validationSeverity === "error"
      ? "#d14343"
      : renderState.validationSeverity === "warning"
        ? "#d5a021"
        : selectedSection === "members" || renderState.selected
          ? "#f2c94c"
          : "#222222";
    const line = createLine([start, end], color, undefined, scales.memberLineWidth ?? 1);
    line.userData = {
      selectable: true,
      type: entry.sourceEntityKind,
      id: entry.sourceEntityId,
      apolloVisualizationElementId: entry.id,
    };
    objects.push(line);

    const directionMarker = new THREE.ArrowHelper(
      delta.clone().normalize(),
      start.clone().lerp(end, 0.68),
      Math.max(length * 0.16, 0.18),
      renderState.validationSeverity === "error"
        ? 0xd14343
        : renderState.validationSeverity === "warning"
          ? 0xd5a021
          : renderState.selected
            ? 0xf2c94c
            : 0x222222,
      Math.max(length * 0.045, 0.06),
      Math.max(length * 0.028, 0.04),
    );
    directionMarker.userData = {
      selectable: true,
      type: entry.sourceEntityKind,
      id: entry.sourceEntityId,
      apolloVisualizationElementId: `${entry.id}:arrow`,
    };
    objects.push(directionMarker);
  }
  return objects;
}

export function renderApolloVisualizationSupports(
  model: ApolloVisualizationModel,
  selectedSection: SectionKey,
  selectionState: ApolloSelectionRenderState,
  scales: ViewerScales,
): THREE.Object3D[] {
  const size = Math.max(scales.nodeSize * 2.2, 0.16) * (scales.supportSize ?? 1);
  return model.elements
    .filter((entry): entry is ApolloVisualizationElement & { geometry: ApolloVisualizationPointGeometry } =>
      entry.elementKind === "support" && entry.geometry.type === "point")
    .map((entry) => {
      const position = new THREE.Vector3(entry.geometry.position[0], entry.geometry.position[1], entry.geometry.position[2]);
      const group = new THREE.Group();
      group.position.copy(position).add(new THREE.Vector3(0, 0, -size * 1.7));
      const renderState = resolveElementRenderState(entry, selectionState);
      const cone = new THREE.Mesh(
        new THREE.ConeGeometry(size * 0.9, size * 1.35, 4),
        materialForState(
          renderState,
          supportMaterial,
          selectedSupportMaterial,
          warningSupportMaterial,
          errorSupportMaterial,
        ),
      );
      cone.rotation.y = Math.PI / 4;
      cone.userData = {
        selectable: true,
        type: entry.sourceEntityKind,
        id: entry.sourceEntityId,
        apolloVisualizationElementId: `${entry.id}:cone`,
      };
      group.add(cone);
      if (selectedSection === "supports") {
        group.scale.setScalar(renderState.selected ? 1.32 : 1.18);
      } else if (renderState.selected) {
        group.scale.setScalar(1.18);
      }
      group.userData = {
        selectable: true,
        type: entry.sourceEntityKind,
        id: entry.sourceEntityId,
        apolloVisualizationElementId: entry.id,
      };
      return group;
    });
}

export function renderApolloVisualizationLabels(
  model: ApolloVisualizationModel,
  scales: ViewerScales,
  selectionState: ApolloSelectionRenderState,
): THREE.Object3D[] {
  const objects: THREE.Object3D[] = [];
  for (const entry of model.elements) {
    if (!isLabelElement(entry) || entry.geometry.type !== "label-anchor") continue;
    const geometry = entry.geometry as ApolloVisualizationLabelAnchorGeometry;
    const renderState = resolveElementRenderState(entry, selectionState);
    const label = createLabelSprite(geometry.text, "#222222", scales.labelSize);
    label.position.set(geometry.position[0], geometry.position[1], geometry.position[2]);
    label.position.add(new THREE.Vector3(0, 0, scales.nodeSize * 2.4 + 0.08));
    assignLabelPriority(
      label,
      renderState.selected ? "selected" : entry.elementKind === "node-label" ? "node" : "member",
      entry.sourceEntityId,
      entry.sourceEntityKind === "member" ? "member" : entry.sourceEntityKind === "support" ? "node" : "node",
    );
    label.userData = {
      id: entry.id,
      ownerId: entry.sourceEntityId,
      ownerType: entry.sourceEntityKind === "member" ? "member" : "node",
    };
    objects.push(label);
  }
  return objects;
}

export function renderApolloVisualizationSolids(
  model: ApolloVisualizationModel,
  selectionState: ApolloSelectionRenderState,
): Record<
  "girders" | "crossBeams" | "bracings" | "deck" | "bearings" | "markers" | "appurtenances" | "haunches" | "pavement" | "roadMarkings",
  THREE.Object3D[]
> {
  const result = {
    girders: [] as THREE.Object3D[],
    crossBeams: [] as THREE.Object3D[],
    bracings: [] as THREE.Object3D[],
    deck: [] as THREE.Object3D[],
    bearings: [] as THREE.Object3D[],
    markers: [] as THREE.Object3D[],
    appurtenances: [] as THREE.Object3D[],
    haunches: [] as THREE.Object3D[],
    pavement: [] as THREE.Object3D[],
    roadMarkings: [] as THREE.Object3D[],
  };

  for (const solid of model.solidGeometryParameters) {
    const object = renderApolloSolid(solid, selectionState);
    if (!object) continue;
    if (solid.kind === "girder") {
      result.girders.push(object);
    } else if (solid.kind === "cross_beam") {
      result.crossBeams.push(object);
    } else if (solid.kind === "bracing") {
      result.bracings.push(object);
    } else if (solid.kind === "stiffener") {
      result.girders.push(object);
    } else if (solid.kind === "deck") {
      result.deck.push(object);
    } else if (solid.kind === "bearing") {
      result.bearings.push(object);
    } else if (solid.kind === "appurtenance") {
      result.appurtenances.push(object);
    } else if (solid.kind === "haunch") {
      result.haunches.push(object);
    } else if (solid.kind === "pavement") {
      result.pavement.push(object);
    } else if (solid.kind === "road_marking") {
      result.roadMarkings.push(object);
    } else {
      result.markers.push(object);
    }
  }

  return result;
}

function resolveElementRenderState(
  entry: ApolloVisualizationElement,
  selectionState: ApolloSelectionRenderState,
): {
  readonly selected: boolean;
  readonly validationSeverity: ApolloViewerValidationHighlight["severity"] | null;
} {
  return {
    selected:
      selectionState.selectedKeys.has(entry.selectionKey) ||
      isPrimarySelectionMatch(selectionState.primarySelection, entry),
    validationSeverity:
      selectionState.validationHighlight?.targetKey === entry.validationTargetKey
        ? selectionState.validationHighlight.severity
        : null,
  };
}

function resolveSolidRenderState(
  solid: ApolloSolidGeometryParameter,
  selectionState: ApolloSelectionRenderState,
): {
  readonly selected: boolean;
  readonly validationSeverity: ApolloViewerValidationHighlight["severity"] | null;
} {
  return {
    selected:
      selectionState.selectedKeys.has(solid.selectionKey) ||
      (selectionState.primarySelection?.type === solid.sourceEntityKind &&
        selectionState.primarySelection.id === solid.sourceEntityId),
    validationSeverity:
      selectionState.validationHighlight?.targetKey === solid.validationTargetKey
        ? selectionState.validationHighlight.severity
        : null,
  };
}

function isPrimarySelectionMatch(selection: ViewerSelection, entry: ApolloVisualizationElement): boolean {
  return selection?.type === entry.sourceEntityKind && selection.id === entry.sourceEntityId;
}

function materialForState(
  state: { readonly selected: boolean; readonly validationSeverity: ApolloViewerValidationHighlight["severity"] | null },
  base: THREE.MeshStandardMaterial,
  selected: THREE.MeshStandardMaterial,
  warning: THREE.MeshStandardMaterial,
  error: THREE.MeshStandardMaterial,
): THREE.MeshStandardMaterial {
  if (state.validationSeverity === "error") {
    return error.clone();
  }
  if (state.validationSeverity === "warning") {
    return warning.clone();
  }
  return state.selected ? selected.clone() : base.clone();
}

function isLabelElement(entry: ApolloVisualizationElement): boolean {
  return entry.elementKind === "node-label" || entry.elementKind === "member-label";
}

function renderApolloSolid(
  solid: ApolloSolidGeometryParameter,
  selectionState: ApolloSelectionRenderState,
): THREE.Object3D | null {
  const state = resolveSolidRenderState(solid, selectionState);
  if (solid.kind === "girder") {
    return renderGirderSolid(solid, state);
  }
  if (solid.kind === "cross_beam") {
    return renderBoxLikeSolid(solid, state, crossBeamMaterial, solid.dimensionsM.length, solid.dimensionsM.width, solid.dimensionsM.depth);
  }
  if (solid.kind === "deck") {
    return renderBoxLikeSolid(solid, state, deckMaterial, solid.dimensionsM.length, solid.dimensionsM.width, solid.dimensionsM.thickness);
  }
  if (solid.kind === "bearing") {
    return renderBoxLikeSolid(solid, state, bearingMaterial, solid.dimensionsM.length, solid.dimensionsM.width, solid.dimensionsM.height);
  }
  if (solid.kind === "bracing") {
    return renderBracingSolid(solid, state);
  }
  if (solid.kind === "stiffener") {
    return renderBoxLikeSolid(solid, state, girderMaterial, solid.dimensionsM.length, solid.dimensionsM.width, solid.dimensionsM.height);
  }
  if (solid.kind === "appurtenance") {
    return renderBoxLikeSolid(solid, state, appurtenanceMaterial, solid.dimensionsM.length, solid.dimensionsM.width, solid.dimensionsM.height);
  }
  if (solid.kind === "haunch") {
    return renderBoxLikeSolid(solid, state, haunchMaterial, solid.dimensionsM.length, solid.dimensionsM.width, solid.dimensionsM.height);
  }
  if (solid.kind === "pavement") {
    return renderBoxLikeSolid(solid, state, pavementMaterial, solid.dimensionsM.length, solid.dimensionsM.width, solid.dimensionsM.thickness);
  }
  if (solid.kind === "road_marking") {
    return renderBoxLikeSolid(solid, state, roadMarkingMaterial, solid.dimensionsM.length, solid.dimensionsM.width, solid.dimensionsM.thickness);
  }
  return renderBoxLikeSolid(solid, state, markerMaterial, solid.dimensionsM.length, solid.dimensionsM.width, solid.dimensionsM.height);
}

function renderGirderSolid(
  solid: ApolloSolidGeometryParameter,
  state: { readonly selected: boolean; readonly validationSeverity: ApolloViewerValidationHighlight["severity"] | null },
): THREE.Object3D | null {
  const length = finiteOrNull(solid.dimensionsM.length);
  const depth = finiteOrNull(solid.dimensionsM.depth);
  const flangeWidth = finiteOrNull(solid.dimensionsM.flangeWidth);
  const flangeThickness = finiteOrNull(solid.dimensionsM.flangeThickness);
  const webThickness = finiteOrNull(solid.dimensionsM.webThickness);
  if (!length || !depth || !flangeWidth || !flangeThickness || !webThickness) return null;

  if (solid.dimensionsM.shape === 0) {
    return renderBoxLikeSolid(solid, state, girderMaterial, length, flangeWidth, depth);
  }

  const group = new THREE.Group();
  const material = materialForState(state, girderMaterial, selectedNodeMaterial, warningNodeMaterial, errorNodeMaterial);
  const halfDepth = depth / 2;
  const halfCoreDepth = Math.max(halfDepth - flangeThickness / 2, flangeThickness / 2);
  const topFlange = new THREE.Mesh(new THREE.BoxGeometry(length, flangeWidth, flangeThickness), material.clone());
  topFlange.position.z = halfDepth - flangeThickness / 2;
  const bottomFlange = new THREE.Mesh(new THREE.BoxGeometry(length, flangeWidth, flangeThickness), material.clone());
  bottomFlange.position.z = -halfDepth + flangeThickness / 2;
  const web = new THREE.Mesh(
    new THREE.BoxGeometry(length, webThickness, Math.max(depth - flangeThickness * 2, flangeThickness)),
    material.clone(),
  );
  web.position.z = 0;
  group.add(topFlange, bottomFlange, web);
  applySolidFrame(group, solid.localFrame);
  applySolidMetadata(group, solid);
  for (const child of group.children) {
    child.userData = { ...group.userData };
  }
  return group;
}

function renderBracingSolid(
  solid: ApolloSolidGeometryParameter,
  state: { readonly selected: boolean; readonly validationSeverity: ApolloViewerValidationHighlight["severity"] | null },
): THREE.Object3D | null {
  const length = finiteOrNull(solid.dimensionsM.length);
  if (!length) return null;
  const material = materialForState(state, bracingMaterial, selectedNodeMaterial, warningNodeMaterial, errorNodeMaterial);

  const legA = finiteOrNull(solid.dimensionsM.legA);
  const legB = finiteOrNull(solid.dimensionsM.legB);
  const thickness = finiteOrNull(solid.dimensionsM.thickness);
  if (solid.dimensionsM.sectionType === 1 && legA && legB && thickness) {
    // Step 5-R: single L-polygon extrusion along member X (not two-plate).
    const shape = new THREE.Shape();
    shape.moveTo(0, 0);
    shape.lineTo(legA, 0);
    shape.lineTo(legA, thickness);
    shape.lineTo(thickness, thickness);
    shape.lineTo(thickness, legB);
    shape.lineTo(0, legB);
    shape.closePath();
    const geometry = new THREE.ExtrudeGeometry(shape, {
      depth: length,
      bevelEnabled: false,
      steps: 1,
    });
    // ExtrudeGeometry extends along +Z; member local length is +X.
    geometry.translate(0, 0, -length / 2);
    geometry.rotateY(-Math.PI / 2);
    const mesh = new THREE.Mesh(geometry, material);
    applySolidFrame(mesh, solid.localFrame);
    applySolidMetadata(mesh, solid);
    return mesh;
  }

  const diameter = finiteOrNull(solid.dimensionsM.diameter);
  if (!diameter) return null;
  const geometry = new THREE.CylinderGeometry(diameter / 2, diameter / 2, length, 14);
  geometry.rotateZ(Math.PI / 2);
  const mesh = new THREE.Mesh(geometry, material);
  applySolidFrame(mesh, solid.localFrame);
  applySolidMetadata(mesh, solid);
  return mesh;
}

function renderBoxLikeSolid(
  solid: ApolloSolidGeometryParameter,
  state: { readonly selected: boolean; readonly validationSeverity: ApolloViewerValidationHighlight["severity"] | null },
  baseMaterial: THREE.MeshStandardMaterial,
  lengthValue: unknown,
  widthValue: unknown,
  heightValue: unknown,
): THREE.Object3D | null {
  const length = finiteOrNull(lengthValue);
  const width = finiteOrNull(widthValue);
  const height = finiteOrNull(heightValue);
  if (!length || !width || !height) return null;
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(length, width, height),
    materialForState(state, baseMaterial, selectedNodeMaterial, warningNodeMaterial, errorNodeMaterial),
  );
  applySolidFrame(mesh, solid.localFrame);
  applySolidMetadata(mesh, solid);
  return mesh;
}

function applySolidFrame(object: THREE.Object3D, frame: ApolloSolidGeometryParameter["localFrame"]): void {
  object.position.set(frame.origin[0], frame.origin[1], frame.origin[2]);
  const basis = new THREE.Matrix4().makeBasis(
    new THREE.Vector3(...frame.xAxis),
    new THREE.Vector3(...frame.yAxis),
    new THREE.Vector3(...frame.zAxis),
  );
  object.quaternion.setFromRotationMatrix(basis);
}

function applySolidMetadata(object: THREE.Object3D, solid: ApolloSolidGeometryParameter): void {
  object.userData = {
    selectable: true,
    type: solid.sourceEntityKind,
    id: solid.sourceEntityId,
    apolloVisualizationSolidId: solid.id,
    apolloSolidKind: solid.kind,
    ...(solid.designEntityId ? { designEntityId: solid.designEntityId } : {}),
    ...(solid.designEntityKind ? { designEntityKind: solid.designEntityKind } : {}),
  };
}

function finiteOrNull(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) && value > 1e-9 ? value : null;
}
