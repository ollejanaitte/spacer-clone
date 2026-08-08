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
import { Component, useMemo, type ErrorInfo, type ReactNode } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import type { BuildIntermediateInput } from "../../core/pipeline/pipeline";
import { buildUnified3DScene, type Unified3DScene } from "./scene";
import type { SceneLayer } from "./scene";

export type MountainViewerProps = {
  draft: BuildIntermediateInput;
  presetId?: string;
  /** per-layer visibility; defaults to all on. */
  layerState?: Partial<Record<SceneLayer, boolean>>;
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
    const buffer = new THREE.BufferGeometry();
    buffer.setAttribute("position", new THREE.BufferAttribute(scene.terrain.positions, 3));
    buffer.setIndex(new THREE.BufferAttribute(scene.terrain.indices, 1));
    const colors = new Float32Array(scene.terrain.positions.length);
    for (let i = 0; i < scene.terrain.positions.length; i += 3) {
      const height = scene.terrain.positions[i + 1];
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
      <meshStandardMaterial vertexColors wireframe={false} />
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
function SubstructureLayer({ scene }: { scene: Unified3DScene }) {
  return (
    <group>
      {scene.substructure.map((element) => {
        const color = element.kind === "abutment" ? ABUTMENT_COLOR : PIER_COLOR;
        return (
          <group key={element.id} data-testid={`substructure-${element.id}`}>
            {element.boxes.map((box, index) => (
              <mesh
                key={`${element.id}-${index}`}
                position={[box.centerX, box.centerZ, -box.centerY]}
                data-testid={`${element.id}-box-${index}`}
              >
                <boxGeometry args={[box.sizeX, box.sizeZ, box.sizeY]} />
                <meshStandardMaterial color={index === 1 ? CAP_COLOR : color} />
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

function RoadLayer({ scene }: { scene: Unified3DScene }) {
  const points = useMemo(() => {
    const arr: number[] = [];
    for (const p of scene.road.points) {
      arr.push(p.x, p.z, -p.y);
    }
    return arr;
  }, [scene]);
  return <Polyline points={points} color={CENTERLINE_COLOR} />;
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

export function MountainViaduct3dViewer({
  draft,
  presetId = "overview",
  layerState = {},
}: MountainViewerProps) {
  const scene = useMemo(() => buildUnified3DScene(draft, presetId), [draft, presetId]);
  const layers: Record<SceneLayer, boolean> = {
    terrain: layerState.terrain ?? true,
    road: layerState.road ?? true,
    superstructure: layerState.superstructure ?? true,
    substructure: layerState.substructure ?? true,
    frame: layerState.frame ?? true,
  };

  const camera = scene.camera;

  return (
    <ViewerErrorBoundary
      fallback={<div data-testid="mountain-viewer-error">3D 表示を初期化できませんでした</div>}
    >
      <div data-testid="mountain-viewer" style={{ width: "100%", height: 480 }}>
        <Canvas camera={{ position: [camera.position.x, camera.position.y, camera.position.z], fov: 55 }}>
          <ambientLight intensity={0.7} />
          <directionalLight position={[200, 150, 100]} intensity={1.1} />
          <gridHelper args={[600, 30, "#334155", "#223047"]} position={[250, 0, 0]} />
          {layers.terrain && <TerrainLayer scene={scene} />}
          {layers.road && <RoadLayer scene={scene} />}
          {layers.superstructure && <SuperstructureLayer scene={scene} />}
          {layers.substructure && <SubstructureLayer scene={scene} />}
          {layers.frame && <FrameLayer scene={scene} />}
          <OrbitControls makeDefault target={[camera.target.x, camera.target.y, camera.target.z]} />
        </Canvas>
      </div>
    </ViewerErrorBoundary>
  );
}
