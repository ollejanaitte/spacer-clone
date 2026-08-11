import * as THREE from "three";
import type { TerrainMesh } from "./terrain/terrainSurface";
import { buildTerrainThreeScene, applyDomainToThreeTransform } from "./terrain/terrainViewerBuilder";
import type { Road3DMesh } from "./road/roadMesh";
import { buildExistingSceneGroup } from "./existingViewerBuilder";
import type { ExistingConditionEntity } from "./existingConditions";
import { domainVerticesToThree } from "./renderCoordinate";
import type { Origin3 } from "./terrain/terrainCoordinate";

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
  readonly localOrigin?: Origin3 | null;
  readonly showTerrainWireframe?: boolean;
}

export function buildIntegratedThreeScene(input: BuildIntegratedSceneInput): IntegratedSceneBuildResult {
  const group = new THREE.Group();
  const origin = input.localOrigin ?? { x: 0, y: 0, z: 0 };

  let terrainMesh: THREE.Mesh | null = null;
  let roadMesh: THREE.Mesh | null = null;

  if (input.terrain && input.terrain.vertices.length > 0) {
    const built = buildTerrainThreeScene(input.terrain);
    // terrain geometry is shared between mesh and wireframe, so apply the
    // domain->three transform exactly once (shared Render Coordinate Adapter).
    applyDomainToThreeTransform(built.mesh, origin);
    built.wireframe.visible = input.showTerrainWireframe ?? false;
    group.add(built.mesh);
    group.add(built.wireframe);
    terrainMesh = built.mesh;
  }

  if (input.road && input.road.vertices.length > 0) {
    const triples = new Float32Array(input.road.vertices.length * 3);
    for (let i = 0; i < input.road.vertices.length; i += 1) {
      const v = input.road.vertices[i];
      triples[i * 3] = v.x;
      triples[i * 3 + 1] = v.y;
      triples[i * 3 + 2] = v.z;
    }
    const position = domainVerticesToThree(triples, origin);
    const geo = new THREE.BufferGeometry();
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
    ? buildExistingSceneGroup(input.existing, origin)
    : new THREE.Group();
  group.add(existingGroup);

  const bounds = new THREE.Box3().setFromObject(group);
  return { group, terrainMesh, roadMesh, existingGroup, bounds };
}
