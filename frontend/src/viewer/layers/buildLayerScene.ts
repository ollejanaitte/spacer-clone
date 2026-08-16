/**
 * Unified viewer scene builder (Wave 1 Lane V).
 *
 * Converts a UnifiedViewerModel (Layer Contract) into THREE.js scene groups,
 * one group per layer kind, all in the shared render coordinate space.
 * The canonical -> render transform is applied ONLY here via the model's
 * renderTransform (default = domainToThree convention). No CRS logic.
 */

import * as THREE from "three";
import type {
  ExistingEntity3D,
  LayerData,
  OrientedBox3D,
  Point3D,
  RenderCoordinateTransform,
  UnifiedViewerModel,
  ViewerLayer,
} from "./layerContract";

export interface LayerSceneResult {
  readonly root: THREE.Group;
  readonly layerGroups: Record<string, THREE.Group>;
  readonly bounds: THREE.Box3;
}

export const LAYER_GROUP_NAMES: Record<string, string> = {
  terrain: "Terrain",
  road: "Road",
  superstructure: "Superstructure",
  bearing: "Bearings",
  substructure: "Substructure",
  existingConditions: "ExistingConditions",
};

export function buildLayerScene(model: UnifiedViewerModel): LayerSceneResult {
  const root = new THREE.Group();
  root.name = "UnifiedViewer";
  root.userData.contractVersion = model.contractVersion;

  const layerGroups: Record<string, THREE.Group> = {};
  for (const layer of model.layers) {
    const group = new THREE.Group();
    group.name = LAYER_GROUP_NAMES[layer.kind] ?? layer.kind;
    group.userData.layerId = layer.id;
    group.userData.kind = layer.kind;
    layerGroups[layer.id] = group;
    // Build geometry for every ready layer so toggling visibility later
    // works; initial on/off state is controlled by group.visible only.
    if (layer.status.state === "ready") {
      const meshes = buildLayerMeshes(layer, model.renderTransform, model.worldBasis.renderOrigin);
      for (const mesh of meshes) group.add(mesh);
    }
    group.visible = layer.visible && layer.status.state === "ready";
    root.add(group);
  }

  const bounds = new THREE.Box3().setFromObject(root);
  return { root, layerGroups, bounds };
}

/** Toggle group visibility without rebuilding geometry. */
export function applyLayerVisibility(result: LayerSceneResult, model: UnifiedViewerModel): void {
  for (const layer of model.layers) {
    const group = result.layerGroups[layer.id];
    if (group) {
      group.visible = layer.visible && layer.status.state === "ready";
    }
  }
}

function buildLayerMeshes(
  layer: ViewerLayer,
  transform: RenderCoordinateTransform,
  origin: Point3D | null | undefined,
): THREE.Object3D[] {
  const data = layer.data as LayerData;
  switch (data.kind) {
    case "terrain":
      return [buildTerrainMesh(data, transform, origin, layer)];
    case "road":
      return buildRoadMeshes(data, transform, origin, layer);
    case "superstructure": {
      const meshes: THREE.Object3D[] = [];
      for (const girder of data.girders) meshes.push(buildOrientedBox(girder, transform, origin, layer));
      if (data.deck) meshes.push(buildOrientedBox(data.deck, transform, origin, layer));
      for (const beam of data.crossBeams ?? []) meshes.push(buildOrientedBox(beam, transform, origin, layer));
      return meshes;
    }
    case "bearing":
      return data.bearings.map((b) => buildOrientedBox(b, transform, origin, layer));
    case "substructure": {
      const meshes: THREE.Object3D[] = [];
      for (const support of data.supports) {
        meshes.push(buildOrientedBox(support.column, transform, origin, layer, support.supportId));
        if (support.cap) meshes.push(buildOrientedBox(support.cap, transform, origin, layer, support.supportId));
        if (support.foundation) {
          meshes.push(buildOrientedBox(support.foundation, transform, origin, layer, support.supportId));
        }
      }
      return meshes;
    }
    case "existingConditions":
      return data.entities.map((entity) => buildExistingEntity(entity, transform, origin, layer));
  }
}

function transformCenter(
  box: OrientedBox3D,
  transform: RenderCoordinateTransform,
  origin: Point3D | null | undefined,
): THREE.Vector3 {
  const t = transform.apply({ x: box.center.x, y: box.center.y, z: box.center.z }, origin);
  return new THREE.Vector3(t[0], t[1], t[2]);
}

function buildOrientedBox(
  box: OrientedBox3D,
  transform: RenderCoordinateTransform,
  origin: Point3D | null | undefined,
  layer: ViewerLayer,
  entityIdOverride?: string,
): THREE.Mesh {
  const geometry = new THREE.BoxGeometry(box.size.x, box.size.z, box.size.y);
  const material = new THREE.MeshStandardMaterial({
    color: box.color ?? "#bbbbbb",
    roughness: 0.7,
    metalness: 0.1,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.copy(transformCenter(box, transform, origin));
  if (box.yawDeg) {
    mesh.rotation.y = THREE.MathUtils.degToRad(box.yawDeg);
  }
  attachSelection(mesh, layer, box.id, entityIdOverride ?? box.id, "solid");
  return mesh;
}

function buildTerrainMesh(
  data: Extract<LayerData, { kind: "terrain" }>,
  transform: RenderCoordinateTransform,
  origin: Point3D | null | undefined,
  layer: ViewerLayer,
): THREE.Mesh {
  const vertices = new Float32Array(data.width * data.height * 3);
  let vi = 0;
  for (let row = 0; row < data.height; row += 1) {
    for (let col = 0; col < data.width; col += 1) {
      vertices[vi++] = data.originX + col * data.cellSize;
      vertices[vi++] = data.originY + row * data.cellSize;
      vertices[vi++] = data.heights[row * data.width + col];
    }
  }
  const indices: number[] = [];
  for (let row = 0; row < data.height - 1; row += 1) {
    for (let col = 0; col < data.width - 1; col += 1) {
      const a = row * data.width + col;
      const b = a + 1;
      const c = a + data.width;
      const d = c + 1;
      // Skip cells that contain NO_DATA so missing elevations never render.
      if (
        data.noDataValue !== undefined &&
        [a, b, c, d].some((i) => data.heights[i] === data.noDataValue)
      ) {
        continue;
      }
      indices.push(a, b, c, b, d, c);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(transform.applyVertices(vertices, origin), 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();

  const material = new THREE.MeshStandardMaterial({
    color: 0x8a9a6a,
    roughness: 1,
    metalness: 0,
    side: THREE.DoubleSide,
  });
  const mesh = new THREE.Mesh(geometry, material);
  attachSelection(mesh, layer, layer.id, layer.id, "terrain");
  return mesh;
}

function buildRoadMeshes(
  data: Extract<LayerData, { kind: "road" }>,
  transform: RenderCoordinateTransform,
  origin: Point3D | null | undefined,
  layer: ViewerLayer,
): THREE.Mesh[] {
  const alignment = data.alignment;
  if (alignment.length < 2) return [];
  const leftHalf = data.halfWidth?.left ?? data.width / 2;
  const rightHalf = data.halfWidth?.right ?? data.width / 2;

  const vertices = new Float32Array(alignment.length * 2 * 3);
  let vi = 0;
  for (let i = 0; i < alignment.length; i += 1) {
    const p = alignment[i];
    let dirX = 1;
    let dirY = 0;
    if (i > 0) {
      const prev = alignment[i - 1];
      const dx = p.x - prev.x;
      const dy = p.y - prev.y;
      const len = Math.hypot(dx, dy) || 1;
      dirX = dx / len;
      dirY = dy / len;
    }
    // Perpendicular in the canonical X-Y plane.
    const perpX = -dirY;
    const perpY = dirX;
    const left = { x: p.x + perpX * leftHalf, y: p.y + perpY * leftHalf, z: p.z };
    const right = { x: p.x - perpX * rightHalf, y: p.y - perpY * rightHalf, z: p.z };
    const tL = transform.apply(left, origin);
    const tR = transform.apply(right, origin);
    vertices[vi++] = tL[0];
    vertices[vi++] = tL[1];
    vertices[vi++] = tL[2];
    vertices[vi++] = tR[0];
    vertices[vi++] = tR[1];
    vertices[vi++] = tR[2];
  }

  const indices: number[] = [];
  for (let i = 0; i < alignment.length - 1; i += 1) {
    const a = i * 2;
    const b = a + 1;
    const c = a + 2;
    const d = a + 3;
    indices.push(a, c, b, b, c, d);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(vertices, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();

  const material = new THREE.MeshStandardMaterial({
    color: data.surfaceColor ?? 0x3b3b3b,
    roughness: 0.9,
    side: THREE.DoubleSide,
  });
  const mesh = new THREE.Mesh(geometry, material);
  attachSelection(mesh, layer, layer.id, layer.id, "road");
  return [mesh];
}

function buildExistingEntity(
  entity: ExistingEntity3D,
  transform: RenderCoordinateTransform,
  origin: Point3D | null | undefined,
  layer: ViewerLayer,
): THREE.Object3D {
  const color = entity.color ?? "#bbbbbb";
  const g = entity.geometry;
  if (g.geometryKind === "polyline") {
    return buildPolylineEntity(entity, transform, origin, layer);
  }
  if (g.geometryKind === "polygon") {
    const points = g.points.map((p) => {
      const t = transform.apply(p, origin);
      return new THREE.Vector3(t[0], t[1], t[2]);
    });
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineBasicMaterial({ color });
    const line = new THREE.LineLoop(geometry, material);
    attachSelection(line, layer, entity.id, entity.id, "existing");
    return line;
  }
  const t = transform.apply(g.point, origin);
  const marker = new THREE.Mesh(
    new THREE.SphereGeometry(1.2, 12, 8),
    new THREE.MeshStandardMaterial({ color }),
  );
  marker.position.set(t[0], t[1], t[2]);
  attachSelection(marker, layer, entity.id, entity.id, "existing");
  return marker;
}

function buildPolylineEntity(
  entity: ExistingEntity3D,
  transform: RenderCoordinateTransform,
  origin: Point3D | null | undefined,
  layer: ViewerLayer,
): THREE.Object3D {
  const g = entity.geometry;
  if (g.geometryKind !== "polyline") throw new Error("not a polyline");
  const points = g.points.map((p) => {
    const t = transform.apply(p, origin);
    return new THREE.Vector3(t[0], t[1], t[2]);
  });
  const tubeRadius = entity.type === "river" ? 1.4 : entity.type === "pipe" ? 0.6 : 0.8;
  const curve = new THREE.CatmullRomCurve3(points);
  const geometry = new THREE.TubeGeometry(curve, Math.max(2, points.length * 2), tubeRadius, 8, false);
  const material = new THREE.MeshStandardMaterial({
    color: entity.color ?? "#bbbbbb",
    roughness: 0.8,
  });
  const mesh = new THREE.Mesh(geometry, material);
  attachSelection(mesh, layer, entity.id, entity.id, "existing");
  return mesh;
}

function attachSelection(
  object: THREE.Object3D,
  layer: ViewerLayer,
  entityId: string,
  stableId: string,
  kind: string,
): void {
  object.userData.selectable = layer.selectable;
  object.userData.layerId = layer.id;
  object.userData.kind = layer.kind;
  object.userData.entityId = entityId;
  object.userData.stableId = stableId;
  object.userData.type = kind;
}