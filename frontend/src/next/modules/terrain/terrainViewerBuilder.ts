import * as THREE from "three";
import type { TerrainMesh } from "./terrainSurface";

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

export function applyDomainToThreeTransform(mesh: THREE.Mesh, localOrigin: { x: number; y: number; z: number } | null): void {
  // domain (x, y, z) -> three (x, height=z, -y), then subtract local origin.
  const origin = localOrigin ?? { x: 0, y: 0, z: 0 };
  mesh.rotation.set(0, 0, 0);
  // We bake the transform by re-mapping positions: three.x = x - ox, three.y = z - oz, three.z = -(y - oy)
  const position = mesh.geometry.getAttribute("position") as THREE.BufferAttribute;
  const arr = position.array as Float32Array;
  for (let i = 0; i < arr.length; i += 3) {
    const x = arr[i];
    const y = arr[i + 1];
    const z = arr[i + 2];
    arr[i] = x - origin.x;
    arr[i + 1] = z - origin.z;
    arr[i + 2] = -(y - origin.y);
  }
  position.needsUpdate = true;
  mesh.geometry.computeVertexNormals();
}
