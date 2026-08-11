import * as THREE from "three";
import type { TerrainMesh } from "../terrain/terrainSurface";
import { buildTerrainThreeScene, applyDomainToThreeTransform } from "../terrain/terrainViewerBuilder";
import type { Road3DMesh } from "../road/roadMesh";
import { buildExistingSceneGroup } from "../existingViewerBuilder";
import type { ExistingConditionEntity } from "../existingConditions";
import { domainVerticesToThree, domainToThree } from "../renderCoordinate";
import type { Origin3 } from "../terrain/terrainCoordinate";
import type { RoadAlignmentContext } from "./bridgeLayoutDomain";
import type { AbutmentPlacementCandidate } from "./bridgeLayoutTypes";

export interface BridgeRangeGeometry {
  readonly startStation: number;
  readonly endStation: number;
  readonly centerline: THREE.Mesh;
  readonly envelope: THREE.Mesh;
}

export interface BridgeLayoutSceneBuildResult {
  readonly group: THREE.Group;
  readonly bridgeGroup: THREE.Group;
  readonly a1Marker: THREE.Group | null;
  readonly a2Marker: THREE.Group | null;
  readonly bounds: THREE.Box3;
}

export interface BuildBridgeLayoutSceneInput {
  readonly terrain?: TerrainMesh | null;
  readonly road?: Road3DMesh | null;
  readonly existing?: readonly ExistingConditionEntity[] | null;
  readonly roadContext?: RoadAlignmentContext | null;
  readonly bridgeRange?: { startStation: number; endStation: number } | null;
  readonly candidateA1?: AbutmentPlacementCandidate | null;
  readonly candidateA2?: AbutmentPlacementCandidate | null;
  readonly localOrigin?: Origin3 | null;
  readonly showTerrainWireframe?: boolean;
}

const BRIDGE_LINE_COLOR = 0xff6d2b;
const A1_COLOR = 0x2f9e44;
const A2_COLOR = 0x1c6dd0;

function toThree(x: number, y: number, z: number, origin: Origin3): THREE.Vector3 {
  const t = domainToThree({ x: x - origin.x, y: y - origin.y, z: z - origin.z });
  return new THREE.Vector3(t[0], t[1], t[2]);
}

function makeLabelSprite(text: string, color: number): THREE.Sprite | null {
  if (typeof document === "undefined") return null;
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 128;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.font = "bold 72px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.strokeStyle = "rgba(0,0,0,0.85)";
    ctx.lineWidth = 14;
    ctx.strokeText(text, 128, 64);
    ctx.fillStyle = `#${color.toString(16).padStart(6, "0")}`;
    ctx.fillText(text, 128, 64);
  }
  const texture = new THREE.CanvasTexture(canvas);
  const material = new THREE.SpriteMaterial({ map: texture, depthTest: false });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(60, 30, 1);
  return sprite;
}

function makeAbutmentMarker(role: string, candidate: AbutmentPlacementCandidate, origin: Origin3): THREE.Group {
  const group = new THREE.Group();
  const pos = toThree(candidate.domainX, candidate.domainY, candidate.elevation, origin);

  const color = role === "A1" ? A1_COLOR : A2_COLOR;
  const stemMaterial = new THREE.MeshStandardMaterial({ color });
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(2, 2, 60, 12), stemMaterial);
  stem.position.set(pos.x, pos.y - 30, pos.z);
  group.add(stem);

  const head = new THREE.Mesh(new THREE.SphereGeometry(6, 16, 12), stemMaterial);
  head.position.set(pos.x, pos.y + 2, pos.z);
  group.add(head);

  const label = makeLabelSprite(role, color);
  if (label) {
    label.position.set(pos.x, pos.y + 24, pos.z);
    group.add(label);
  }

  group.name = `${role}-marker`;
  return group;
}

/**
 * Bridge Layout 3D scene (Terrain + Road + Existing + Bridge Range + A1/A2).
 *
 * - All layers share one Render Coordinate space (domain -> three mapping).
 * - Bridge Range centerline is sampled from the SAME road alignment used for
 *   the road mesh, so A1/A2 and the highlighted segment never drift off road.
 * - Display responsibility only; never mutates Road / Terrain / Existing truth.
 */
export function buildBridgeLayoutThreeScene(input: BuildBridgeLayoutSceneInput): BridgeLayoutSceneBuildResult {
  const group = new THREE.Group();
  const bridgeGroup = new THREE.Group();
  const origin = input.localOrigin ?? { x: 0, y: 0, z: 0 };

  if (input.terrain && input.terrain.vertices.length > 0) {
    const built = buildTerrainThreeScene(input.terrain);
    applyDomainToThreeTransform(built.mesh, origin);
    built.wireframe.visible = input.showTerrainWireframe ?? false;
    group.add(built.mesh);
    group.add(built.wireframe);
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
  }

  const existingGroup = input.existing && input.existing.length > 0
    ? buildExistingSceneGroup(input.existing, origin)
    : new THREE.Group();
  group.add(existingGroup);

  // Bridge Range: highlighted centerline + transparent envelope on the road.
  if (input.roadContext?.ok && input.bridgeRange) {
    const intermediate = input.roadContext.intermediate;
    if (intermediate) {
      const start = input.bridgeRange.startStation;
      const end = input.bridgeRange.endStation;
      const step = Math.max(2, (end - start) / 64);
      const points: THREE.Vector3[] = [];
      for (let s = start; s <= end + 1e-9; s += step) {
        const p = intermediate.sample(Math.min(s, end));
        if (p) points.push(toThree(p.x, p.y, p.z + 1.5, origin));
      }
      if (points.length >= 2) {
        const curve = new THREE.CatmullRomCurve3(points);
        const lineGeo = new THREE.TubeGeometry(curve, Math.max(2, points.length), 2.5, 8, false);
        const lineMesh = new THREE.Mesh(lineGeo, new THREE.MeshStandardMaterial({
          color: BRIDGE_LINE_COLOR,
          roughness: 0.4,
          emissive: 0x552000,
          emissiveIntensity: 0.4,
        }));
        lineMesh.name = "bridge-range-line";
        bridgeGroup.add(lineMesh);

        const envGeo = new THREE.TubeGeometry(curve, Math.max(2, points.length), 26, 10, false);
        const envMesh = new THREE.Mesh(envGeo, new THREE.MeshBasicMaterial({
          color: BRIDGE_LINE_COLOR,
          transparent: true,
          opacity: 0.12,
          depthWrite: false,
          side: THREE.DoubleSide,
        }));
        envMesh.name = "bridge-range-envelope";
        bridgeGroup.add(envMesh);
      }
    }
  }

  let a1Marker: THREE.Group | null = null;
  let a2Marker: THREE.Group | null = null;
  if (input.candidateA1) {
    a1Marker = makeAbutmentMarker("A1", input.candidateA1, origin);
    bridgeGroup.add(a1Marker);
  }
  if (input.candidateA2) {
    a2Marker = makeAbutmentMarker("A2", input.candidateA2, origin);
    bridgeGroup.add(a2Marker);
  }

  group.add(bridgeGroup);
  const bounds = new THREE.Box3().setFromObject(group);
  return { group, bridgeGroup, a1Marker, a2Marker, bounds };
}
