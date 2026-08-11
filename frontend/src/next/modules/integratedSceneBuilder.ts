import * as THREE from "three";
import type { TerrainMesh } from "./terrain/terrainSurface";
import { buildTerrainThreeScene } from "./terrain/terrainViewerBuilder";
import type { Road3DMesh } from "./road/roadMesh";
import { buildExistingSceneGroup } from "./existingViewerBuilder";
import type { ExistingConditionEntity } from "./existingConditions";

export interface IntegratedSceneBuildResult {
  readonly group: THREE.Group;
  readonly terrainMesh: THREE.Mesh | null;
  readonly roadMesh: THREE.Mesh | null;
  readonly existingGroup: THREE.Group;
  readonly bounds: THREE.Box3;
}

export interface BuildIntegratedSceneInput {
  readonly terrain?: TerrainMesh | null;
  readonly road?: Road3DMesh | null;
  readonly existing?: readonly ExistingConditionEntity[] | null;
  readonly localOrigin?: { x: number; y: number; z: number } | null;
  readonly showTerrainWireframe?: boolean;
}

export function buildIntegratedThreeScene(input: BuildIntegratedSceneInput): IntegratedSceneBuildResult {
  const group = new THREE.Group();
  const origin = input.localOrigin ?? { x: 0, y: 0, z: 0 };

  let terrainMesh: THREE.Mesh | null = null;
  let roadMesh: THREE.Mesh | null = null;

  if (input.terrain && input.terrain.vertices.length > 0) {
    const built = buildTerrainThreeScene(input.terrain);
    built.wireframe.visible = input.showTerrainWireframe ?? false;
    group.add(built.mesh);
    group.add(built.wireframe);
    terrainMesh = built.mesh;
  }

  if (input.road && input.road.vertices.length > 0) {
    const geo = new THREE.BufferGeometry();
    const position = new Float32Array(input.road.vertices.length * 3);
    for (let i = 0; i < input.road.vertices.length; i += 1) {
      const v = input.road.vertices[i];
      position[i * 3] = v.x - origin.x;
      position[i * 3 + 1] = v.z - origin.z;
      position[i * 3 + 2] = -(v.y - origin.y);
    }
    geo.setAttribute("position", new THREE.BufferAttribute(position, 3));
    const indices: number[] = [];
    for (const t of input.road.triangles) {
      indices.push(t.a, t.b, t.c);
    }
    geo.setIndex(indices);
    geo.computeVertexNormals();
    const material = new THREE.MeshStandardMaterial({ color: 0x3d3d3d, roughness: 0.6, side: THREE.DoubleSide });
    const mesh = new THREE.Mesh(geo, material);
    mesh.name = "road-surface";
    group.add(mesh);
    roadMesh = mesh;
  }

  const existingGroup = input.existing && input.existing.length > 0
    ? buildExistingSceneGroup(input.existing)
    : new THREE.Group();
  group.add(existingGroup);

  const bounds = new THREE.Box3().setFromObject(group);
  return { group, terrainMesh, roadMesh, existingGroup, bounds };
}
