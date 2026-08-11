import * as THREE from "three";
import type { TerrainMesh } from "./terrainSurface";
import { domainVerticesToThree } from "../renderCoordinate";
import type { Origin3 } from "./terrainCoordinate";

export interface TerrainSceneBuildResult {
  readonly geometry: THREE.BufferGeometry;
  readonly material: THREE.MeshStandardMaterial;
  readonly wireframeMaterial: THREE.MeshBasicMaterial;
  readonly mesh: THREE.Mesh;
  readonly wireframe: THREE.Mesh;
  readonly bounds: THREE.Box3;
}

export function buildTerrainThreeScene(meshData: TerrainMesh): TerrainSceneBuildResult {
  // Clone the position array so applying the domain->three transform does not
  // mutate the terrain source-of-truth mesh data.
  const positionArray = Float32Array.from(meshData.vertices);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positionArray, 3));
  geometry.setIndex(new THREE.BufferAttribute(meshData.indices, 1));
  geometry.computeVertexNormals();

  const material = new THREE.MeshStandardMaterial({
    color: 0x7a9c5e,
    roughness: 0.9,
    metalness: 0.0,
    side: THREE.DoubleSide,
    flatShading: false,
  });

  const wireframeMaterial = new THREE.MeshBasicMaterial({
    color: 0x4a6b3a,
    wireframe: true,
  });

  const mesh = new THREE.Mesh(geometry, material);
  const wireframe = new THREE.Mesh(geometry, wireframeMaterial);
  wireframe.visible = false;

  const bounds = new THREE.Box3().setFromObject(mesh);

  return { geometry, material, wireframeMaterial, mesh, wireframe, bounds };
}

export function applyDomainToThreeTransform(mesh: THREE.Mesh, localOrigin: Origin3 | null): void {
  // domain (x, y, z) -> three (x, height=z, -y) minus local origin.
  // Uses the shared Render Coordinate Adapter. IMPORTANT: mesh and wireframe
  // share one geometry object, so this must be applied exactly ONCE per
  // geometry (double application would turn the terrain into a vertical wall).
  const position = mesh.geometry.getAttribute("position") as THREE.BufferAttribute;
  const arr = position.array as Float32Array;
  const mapped = domainVerticesToThree(arr, localOrigin);
  for (let i = 0; i < arr.length; i += 1) arr[i] = mapped[i];
  position.needsUpdate = true;
  mesh.geometry.computeVertexNormals();
}
