import * as THREE from "three";
import type { TerrainMesh } from "../terrain/terrainSurface";
import { buildTerrainThreeScene, applyDomainToThreeTransform } from "../terrain/terrainViewerBuilder";
import type { Road3DMesh } from "../road/roadMesh";
import { buildExistingSceneGroup } from "../existingViewerBuilder";
import type { ExistingConditionEntity } from "../existingConditions";
import { domainVerticesToThree, domainToThree } from "../renderCoordinate";
import type { Origin3 } from "../terrain/terrainCoordinate";
import type { RoadAlignmentContext } from "./bridgeLayoutDomain";
import type { AbutmentPlacementCandidate, PierPlacementCandidate } from "./bridgeLayoutTypes";

export interface BridgeRangeGeometry {
  readonly startStation: number;
  readonly endStation: number;
  readonly centerline: THREE.Mesh;
  readonly envelope: THREE.Mesh;
}

export interface PierSceneMarker {
  readonly supportId: string;
  readonly label: string;
  readonly station: number;
  readonly candidate: PierPlacementCandidate;
  readonly skewAngleRad: number | null;
}

export interface BridgeLayoutSceneBuildResult {
  readonly group: THREE.Group;
  readonly bridgeGroup: THREE.Group;
  readonly a1Marker: THREE.Group | null;
  readonly a2Marker: THREE.Group | null;
  readonly pierMarkers: readonly THREE.Group[];
  /** 橋梁範囲に絞ったcamera focus box（Terrain全域ではなく橋周辺をframing） */
  readonly focusBounds: THREE.Box3 | null;
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
  readonly piers?: readonly PierSceneMarker[] | null;
  readonly spans?: readonly { spanId: string; from: string; to: string; length: number }[] | null;
  readonly localOrigin?: Origin3 | null;
  readonly showTerrainWireframe?: boolean;
}

const BRIDGE_LINE_COLOR = 0xff6d2b;
const A1_COLOR = 0x2f9e44;
const A2_COLOR = 0x1c6dd0;
const PIER_COLOR = 0xb02ff0;
const SPAN_LABEL_COLOR = 0xffd166;

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
 * P1..Pn の配置確認用 marker を作る（詳細橋脚モデルではない）。
 * skew指示線: 道路接線の直角（skew=0）から skewAngleRad だけ反時計回りに
 * 回転した方向へ伸ばす水平ライン（counterclockwise-positive）。
 */
function makePierMarker(marker: PierSceneMarker, origin: Origin3): THREE.Group {
  const group = new THREE.Group();
  const pos = toThree(marker.candidate.domainX, marker.candidate.domainY, marker.candidate.elevation, origin);

  const material = new THREE.MeshStandardMaterial({ color: PIER_COLOR });
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.2, 60, 12), material);
  stem.position.set(pos.x, pos.y - 30, pos.z);
  group.add(stem);

  const head = new THREE.Mesh(new THREE.BoxGeometry(6, 6, 6), material);
  head.position.set(pos.x, pos.y + 2, pos.z);
  group.add(head);

  const label = makeLabelSprite(marker.label, PIER_COLOR);
  if (label) {
    label.position.set(pos.x, pos.y + 26, pos.z);
    group.add(label);
  }

  // skew 指示線（配置線方向）
  const tangent = marker.candidate.tangentAzimuthRad;
  const perpendicular = tangent + Math.PI / 2;
  const lineAngle = perpendicular + (marker.skewAngleRad ?? 0);
  const halfLength = 18;
  const dir = { x: Math.cos(lineAngle), y: Math.sin(lineAngle) };
  const p0 = toThree(marker.candidate.domainX - dir.x * halfLength, marker.candidate.domainY - dir.y * halfLength, marker.candidate.elevation + 1, origin);
  const p1 = toThree(marker.candidate.domainX + dir.x * halfLength, marker.candidate.domainY + dir.y * halfLength, marker.candidate.elevation + 1, origin);
  const curve = new THREE.CatmullRomCurve3([p0, p1]);
  const skewGeo = new THREE.TubeGeometry(curve, 2, 0.8, 6, false);
  const skewMesh = new THREE.Mesh(skewGeo, new THREE.MeshStandardMaterial({
    color: 0xf5c542,
    emissive: 0x6a4a00,
    emissiveIntensity: 0.5,
  }));
  skewMesh.name = `${marker.label}-skew-line`;
  group.add(skewMesh);

  group.name = `${marker.label}-marker`;
  return group;
}

function makeSpanLabel(spanId: string, midpoint: THREE.Vector3): THREE.Sprite | null {
  const sprite = makeLabelSprite(spanId, SPAN_LABEL_COLOR);
  if (sprite) {
    sprite.position.set(midpoint.x, midpoint.y + 16, midpoint.z);
    sprite.scale.set(48, 24, 1);
  }
  return sprite;
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

  // Phase 4-03: P1..Pn markers + skew 指示線
  const pierMarkers: THREE.Group[] = [];
  if (input.piers) {
    for (const pier of input.piers) {
      const marker = makePierMarker(pier, origin);
      bridgeGroup.add(marker);
      pierMarkers.push(marker);
    }
  }

  // Phase 4-03: span ラベル（支間中点）
  if (input.roadContext?.ok && input.spans && input.spans.length > 0) {
    const intermediate = input.roadContext.intermediate;
    if (intermediate) {
      const spanStations = new Map<string, number>();
      if (input.bridgeRange) {
        spanStations.set("A1", input.bridgeRange.startStation);
        spanStations.set("A2", input.bridgeRange.endStation);
      }
      for (const pier of input.piers ?? []) {
        spanStations.set(pier.supportId, pier.station);
      }
      for (const span of input.spans) {
        const start = spanStations.get(span.from);
        const end = spanStations.get(span.to);
        if (start === undefined || end === undefined) continue;
        const midpointStation = (start + end) / 2;
        const p = intermediate.sample(midpointStation);
        if (!p) continue;
        const midPoint = toThree(p.x, p.y, p.z + 1, origin);
        const label = makeSpanLabel(span.spanId, midPoint);
        if (label) bridgeGroup.add(label);
      }
    }
  }

  group.add(bridgeGroup);
  const bounds = new THREE.Box3().setFromObject(group);

  // 橋梁焦点box: A1/A2/P1..Pn の配置点を包み、横断方向に広げて framing する
  const focusBounds = computeBridgeFocusBounds(input, origin, bridgeGroup);

  return { group, bridgeGroup, a1Marker, a2Marker, pierMarkers, focusBounds, bounds };
}

/** 橋梁範囲（A1/A2/P1..Pn周辺）のcamera focus box を算出する。 */
function computeBridgeFocusBounds(
  input: BuildBridgeLayoutSceneInput,
  origin: Origin3,
  bridgeGroup: THREE.Group,
): THREE.Box3 | null {
  const points: THREE.Vector3[] = [];
  const push = (p: { domainX: number; domainY: number; elevation: number }) => {
    points.push(toThree(p.domainX, p.domainY, p.elevation, origin));
  };
  if (input.candidateA1) push(input.candidateA1);
  if (input.candidateA2) push(input.candidateA2);
  for (const pier of input.piers ?? []) push(pier.candidate);
  if (points.length === 0) return null;

  const box = new THREE.Box3();
  for (const p of points) box.expandByPoint(p);
  // 横断方向（three.z）と高さ方向にマージンを確保
  box.expandByVector(new THREE.Vector3(80, 60, 160));
  // 橋梁全体を確実に含む（spanラベル・skew線・envelope）
  if (bridgeGroup.children.length > 0) {
    box.expandByObject(bridgeGroup);
  }
  return box;
}
