/**
 * Mountain Viaduct 500 — unified 3D viewer (MAIN3D P04).
 *
 * Renders the sample through the normal pipeline:
 *   Project State (draft) -> Unified3DScene -> Three.js
 *
 * Layers (Unified3DScene):
 *   - terrain mesh (deterministic heightfield, DISPLAY_LAYER)
 *   - road centerline polyline
 *   - superstructure (span deck polylines)
 *   - substructure (A1/P1..P7/A2: column + cap + support zone meshes)
 *   - frame (optional, from the existing frame viewer project)
 *
 * Camera presets / layer toggles are visual convenience only.
 */
import { Component, useEffect, useMemo, type ErrorInfo, type ReactNode } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { Line, OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import type { BuildIntermediateInput } from "../../core/pipeline/pipeline";
import { buildUnified3DScene, type Unified3DScene } from "./scene";
import type { SceneLayer } from "./scene";
import { terrainPositionsToThree } from "./threeCoords";

export type MountainViewerProps = {
  draft: BuildIntermediateInput;
  presetId?: string;
  /** per-layer visibility; defaults to all on. */
  layerState?: Partial<Record<SceneLayer, boolean>>;
  /** selected support id (A1/P1..P7/A2) to highlight, or undefined. */
  selectedSupportId?: string;
  /** Phase 3-6: fused ② superstructure + ③ substructure solids (three-space). */
  integrated?: import("../../../bridgeProject/integratedScene3d").IntegratedScene3d;
  /** Optional camera override (three coords). Falls back to the preset camera. */
  cameraOverride?: import("./camera").CameraState;
  /** Optional road surface half-width (m) to draw edge lines in the road layer. */
  roadHalfWidth?: number;
};

const TERRAIN_COLOR = "#4d7c4f";
const CENTERLINE_COLOR = "#2563eb";
const ABUTMENT_COLOR = "#ea580c";
const PIER_COLOR = "#16a34a";
const CAP_COLOR = "#0f766e";
const SPAN_COLOR = "#64748b";
const FRAME_COLOR = "#9333ea";

/** Terrain mesh from the unified scene (deterministic). */
function TerrainLayer({ scene }: { scene: Unified3DScene }) {
  const geometry = useMemo(() => {
    // terrain positions are (x, height, y); remap y -> -y to match the
    // domain->three mapping used by road/bridge/substructure (TERRAIN-FIX).
    const positions = terrainPositionsToThree(scene.terrain.positions);
    const buffer = new THREE.BufferGeometry();
    buffer.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    buffer.setIndex(new THREE.BufferAttribute(scene.terrain.indices, 1));
    const colors = new Float32Array(positions.length);
    for (let i = 0; i < positions.length; i += 3) {
      const height = positions[i + 1];
      const shade = 0.55 + ((height % 10) / 10) * 0.25;
      colors[i] = shade * 0.30;
      colors[i + 1] = shade * 0.49;
      colors[i + 2] = shade * 0.31;
    }
    buffer.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    buffer.computeVertexNormals();
    return buffer;
  }, [scene]);

  return (
    <mesh geometry={geometry}>
      <meshStandardMaterial vertexColors wireframe={false} side={THREE.DoubleSide} />
    </mesh>
  );
}

function Polyline({
  points,
  color,
  transparent,
}: {
  points: number[];
  color: string;
  transparent?: boolean;
}) {
  const object = useMemo(() => {
    const buffer = new THREE.BufferGeometry();
    buffer.setAttribute("position", new THREE.BufferAttribute(new Float32Array(points), 3));
    const material = new THREE.LineBasicMaterial({
      color,
      transparent,
      opacity: transparent ? 0.5 : 1,
    });
    return new THREE.Line(buffer, material);
  }, [points, color, transparent]);
  return <primitive object={object} />;
}

/** Substructure element mesh (column + cap + support zone boxes). */
function SubstructureLayer({
  scene,
  selectedSupportId,
}: {
  scene: Unified3DScene;
  selectedSupportId?: string;
}) {
  const HIGHLIGHT_COLOR = "#f59e0b";
  return (
    <group>
      {scene.substructure.map((element) => {
        const color = element.kind === "abutment" ? ABUTMENT_COLOR : PIER_COLOR;
        const selected = element.id === selectedSupportId;
        return (
          <group key={element.id} data-testid={`substructure-${element.id}`}>
            {element.boxes.map((box, index) => (
              <mesh
                key={`${element.id}-${index}`}
                position={[box.centerX, box.centerZ, -box.centerY]}
                data-testid={`${element.id}-box-${index}`}
              >
                <boxGeometry args={[box.sizeX, box.sizeZ, box.sizeY]} />
                <meshStandardMaterial
                  color={selected ? HIGHLIGHT_COLOR : index === 1 ? CAP_COLOR : color}
                  emissive={selected ? HIGHLIGHT_COLOR : "#000000"}
                  emissiveIntensity={selected ? 0.4 : 0}
                />
              </mesh>
            ))}
          </group>
        );
      })}
    </group>
  );
}

/** Superstructure: span deck polylines at deck Z (from bridge layer). */
function SuperstructureLayer({ scene }: { scene: Unified3DScene }) {
  return (
    <group>
      {scene.bridge.spans.map((span) => (
        <Polyline
          key={span.id}
          color={SPAN_COLOR}
          points={[span.startX, span.startZ, -span.startY, span.endX, span.endZ, -span.endY]}
        />
      ))}
    </group>
  );
}

function RoadLayer({ scene, roadHalfWidth }: { scene: Unified3DScene; roadHalfWidth?: number }) {
  const center = useMemo(() => {
    return scene.road.points.map((p) => [p.x, p.z, -p.y] as [number, number, number]);
  }, [scene]);
  const edges = useMemo(() => {
    if (!roadHalfWidth || roadHalfWidth <= 0) {
      return null;
    }
    const left: [number, number, number][] = [];
    const right: [number, number, number][] = [];
    const pts = scene.road.points;
    for (let i = 0; i < pts.length; i += 1) {
      const current = pts[i];
      const prev = pts[Math.max(i - 1, 0)];
      const next = pts[Math.min(i + 1, pts.length - 1)];
      const dx = next.x - prev.x;
      const dy = next.y - prev.y;
      const len = Math.hypot(dx, dy) || 1;
      // perpendicular in the horizontal plane (domain), then to three coords
      const px = -dy / len;
      const py = dx / len;
      left.push([current.x + px * roadHalfWidth, current.z, -(current.y + py * roadHalfWidth)]);
      right.push([current.x - px * roadHalfWidth, current.z, -(current.y - py * roadHalfWidth)]);
    }
    return { left, right };
  }, [scene, roadHalfWidth]);
  return (
    <group>
      {edges && (
        <group>
          <Line points={edges.left} color="#93c5fd" lineWidth={2} transparent opacity={0.9} />
          <Line points={edges.right} color="#93c5fd" lineWidth={2} transparent opacity={0.9} />
        </group>
      )}
      <Line points={center} color={CENTERLINE_COLOR} lineWidth={8} />
    </group>
  );
}

/** Optional frame overlay (points/members from the existing frame project). */
function FrameLayer({ scene }: { scene: Unified3DScene }) {
  const frame = scene.frame;
  if (!frame || frame.nodes.length === 0) {
    return null;
  }
  const points = useMemo(() => {
    const arr: number[] = [];
    for (const node of frame.nodes) {
      arr.push(node.x, node.z, -node.y);
    }
    return arr;
  }, [frame]);
  return <Polyline points={points} color={FRAME_COLOR} transparent />;
}

class ViewerErrorBoundary extends Component<{ children: ReactNode; fallback: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError(): { failed: boolean } {
    return { failed: true };
  }
  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error("mountain viewer error", error, info);
  }
  render(): ReactNode {
    if (this.state.failed) return this.props.fallback;
    return this.props.children;
  }
}

/** Phase 3-6: render fused ② superstructure + ③ substructure oriented boxes. */
function SolidBoxLayer({
  integrated,
}: {
  integrated: import("../../../bridgeProject/integratedScene3d").IntegratedScene3d;
}) {
  const boxes = useMemo(() => {
    const all = [
      ...integrated.substructureBoxes.map((b) => ({ ...b, layer: "sub" as const })),
      ...integrated.superstructureBoxes.map((b) => ({ ...b, layer: "super" as const })),
    ];
    const matrices = new Map<string, THREE.Quaternion>();
    for (const box of all) {
      const m = new THREE.Matrix4();
      m.makeBasis(
        new THREE.Vector3(box.basis[0][0], box.basis[0][1], box.basis[0][2]),
        new THREE.Vector3(box.basis[1][0], box.basis[1][1], box.basis[1][2]),
        new THREE.Vector3(box.basis[2][0], box.basis[2][1], box.basis[2][2]),
      );
      matrices.set(box.id, new THREE.Quaternion().setFromRotationMatrix(m));
    }
    return { all, matrices };
  }, [integrated]);
  return (
    <group>
      {boxes.all.map((box) => {
        const q = boxes.matrices.get(box.id)!;
        const color = box.layer === "sub" ? PIER_COLOR : SPAN_COLOR;
        return (
          <mesh
            key={box.id}
            position={[box.center[0], box.center[1], box.center[2]]}
            quaternion={q}
            data-testid={`solid-${box.layer}-${box.id}`}
          >
            <boxGeometry args={[box.size[0], box.size[1], box.size[2]]} />
            <meshStandardMaterial color={color} transparent opacity={0.85} />
          </mesh>
        );
      })}
    </group>
  );
}

export function MountainViaduct3dViewer({
  draft,
  presetId = "overview",
  layerState = {},
  selectedSupportId,
  integrated,
  cameraOverride,
  roadHalfWidth,
}: MountainViewerProps) {
  const scene = useMemo(() => buildUnified3DScene(draft, presetId), [draft, presetId]);
  const layers: Record<SceneLayer, boolean> = {
    terrain: layerState.terrain ?? true,
    road: layerState.road ?? true,
    superstructure: layerState.superstructure ?? true,
    substructure: layerState.substructure ?? true,
    frame: layerState.frame ?? true,
  };

  const camera = cameraOverride ?? scene.camera;
  // camera presets are ALREADY in three coords (x, y=height, z): pass through.
  const camX = camera.position.x;
  const camY = camera.position.y;
  const camZ = camera.position.z;
  const tgtX = camera.target.x;
  const tgtY = camera.target.y;
  const tgtZ = camera.target.z;

  return (
    <ViewerErrorBoundary
      fallback={<div data-testid="mountain-viewer-error">3D 表示を初期化できませんでした</div>}
    >
      <div data-testid="mountain-viewer" style={{ width: "100%", height: 480 }}>
        <Canvas camera={{ position: [camX, camY, camZ], fov: 55 }}>
          <ambientLight intensity={0.7} />
          <directionalLight position={[200, 150, 100]} intensity={1.1} />
          {/* grid at the terrain floor (three Y = domain height minZ), 500m fits the route */}
          <gridHelper args={[500, 20, "#334155", "#223047"]} position={[250, scene.bounds.minZ, 0]} />
          {layers.terrain && <TerrainLayer scene={scene} />}
          {layers.road && <RoadLayer scene={scene} roadHalfWidth={roadHalfWidth} />}
          {layers.superstructure && <SuperstructureLayer scene={scene} />}
          {layers.substructure && (
            <SubstructureLayer scene={scene} selectedSupportId={selectedSupportId} />
          )}
          {layers.frame && <FrameLayer scene={scene} />}
          {integrated && <SolidBoxLayer integrated={integrated} />}
          <CameraRig
            position={[camX, camY, camZ]}
            target={[tgtX, tgtY, tgtZ]}
          />
        </Canvas>
      </div>
    </ViewerErrorBoundary>
  );
}

/** Applies a camera preset on change (camera position + OrbitControls target). */
function CameraRig({
  position,
  target,
}: {
  position: [number, number, number];
  target: [number, number, number];
}) {
  const { camera } = useThree();
  useEffect(() => {
    camera.position.set(position[0], position[1], position[2]);
    camera.lookAt(target[0], target[1], target[2]);
    camera.updateProjectionMatrix();
  }, [camera, position, target]);

  return <OrbitControls makeDefault target={target} />;
}
