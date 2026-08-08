/**
 * Mountain Viaduct 500 — 3D viewer (MOUNTAIN-SAMPLE P11).
 *
 * Renders the sample through the normal pipeline:
 *   Project State (draft) -> solvers -> terrain + geometry -> Three.js
 *
 * Layers:
 *   - terrain mesh (deterministic heightfield, DISPLAY_LAYER)
 *   - road centerline polyline
 *   - pier / abutment markers (cones with orientation arrows)
 *   - span deck polylines
 *
 * Camera presets are visual convenience only (never affect geometry).
 */
import { Component, useMemo, type ErrorInfo, type ReactNode } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import type { BuildIntermediateInput } from "../../core/pipeline/pipeline";
import { buildTerrainHeightfield, buildTerrainIndices } from "./terrain";
import { resolveSupportMarkers } from "./markers";
import { cameraStateForPreset } from "./camera";
import { MOUNTAIN_CAMERA_PRESETS } from "./fixture";
import { evaluateAlignmentAtDistance } from "../../core/geometry/horizontal";
import { elevationAt } from "../../core/elevationAt";

export type MountainViewerProps = {
  draft: BuildIntermediateInput;
  presetId?: string;
  showTerrain?: boolean;
  showCenterline?: boolean;
  showSupports?: boolean;
};

const TERRAIN_COLOR = "#4d7c4f";
const CENTERLINE_COLOR = "#2563eb";
const ABUTMENT_COLOR = "#ea580c";
const PIER_COLOR = "#16a34a";
const SPAN_COLOR = "#64748b";

/** Terrain mesh positions + colors from the deterministic heightfield. */
function TerrainLayer() {
  const geometry = useMemo(() => {
    const { positions, widths, depths } = buildTerrainHeightfield();
    const indices = buildTerrainIndices(widths, depths);
    const buffer = new THREE.BufferGeometry();
    buffer.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    buffer.setIndex(new THREE.BufferAttribute(indices, 1));
    // simple flat vertex colors (deterministic)
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
  }, []);

  return (
    <mesh geometry={geometry}>
      <meshStandardMaterial vertexColors wireframe={false} />
    </mesh>
  );
}

function CenterlineLayer({ draft }: { draft: BuildIntermediateInput }) {
  const line = useMemo(() => {
    const points: THREE.Vector3[] = [];
    const total = draft.alignment.elements.reduce((s, e) => s + e.length, 0);
    const step = 5;
    for (let d = 0; d <= total; d += step) {
      const ev = evaluate(d, draft);
      points.push(new THREE.Vector3(ev.x, ev.y, ev.z));
    }
    return points;
  }, [draft]);

  return (
    <line>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[new Float32Array(line.flatMap((p) => [p.x, p.y, p.z])), 3]} />
      </bufferGeometry>
      <lineBasicMaterial color={CENTERLINE_COLOR} />
    </line>
  );
}

function SupportsLayer({ draft }: { draft: BuildIntermediateInput }) {
  const { markers, spans } = useMemo(() => resolveSupportMarkers(draft), [draft]);
  return (
    <group>
      {spans.map((span) => (
        <line key={span.id}>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              args={[new Float32Array([span.startX, span.startY, 0, span.endX, span.endY, 0]), 3]}
            />
          </bufferGeometry>
          <lineBasicMaterial color={SPAN_COLOR} transparent opacity={0.5} />
        </line>
      ))}
      {markers.map((marker) => (
        <SupportMarker key={marker.id} marker={marker} />
      ))}
    </group>
  );
}

function SupportMarker({ marker }: { marker: { id: string; kind: string; x: number; y: number; z: number; direction: { x: number; y: number } } }) {
  const color = marker.kind === "abutment" ? ABUTMENT_COLOR : PIER_COLOR;
  // arrow/cone oriented along the pier-line direction (in plan)
  const angle = Math.atan2(marker.direction.y, marker.direction.x);
  return (
    <group position={[marker.x, marker.z, -marker.y]} rotation={[0, 0, 0]}>
      {/* vertical cone marker */}
      <mesh position={[0, 6, 0]}>
        <coneGeometry args={[2.2, 8, 12]} />
        <meshStandardMaterial color={color} />
      </mesh>
      {/* direction arrow on the ground */}
      <mesh position={[0, 0.5, 0]} rotation={[0, 0, -angle]}>
        <coneGeometry args={[1.4, 5, 10]} />
        <meshStandardMaterial color={color} transparent opacity={0.85} />
      </mesh>
    </group>
  );
}

/** Evaluate XY at distance, Z via elevation. Kept here to avoid re-implementing solvers. */
function evaluate(d: number, draft: BuildIntermediateInput): { x: number; y: number; z: number } {
  const ev = evaluateAlignmentAtDistance(draft.alignment, d);
  const z = draft.verticalAlignment ? elevationAt(d, draft.verticalAlignment) ?? 0 : 0;
  return { x: ev.point.x, y: ev.point.y, z };
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
  showTerrain = true,
  showCenterline = true,
  showSupports = true,
}: MountainViewerProps) {
  const camera = useMemo(() => cameraStateForPreset(MOUNTAIN_CAMERA_PRESETS, presetId), [presetId]);

  return (
    <ViewerErrorBoundary
      fallback={<div data-testid="mountain-viewer-error">3D 表示を初期化できませんでした</div>}
    >
      <div data-testid="mountain-viewer" style={{ width: "100%", height: 480 }}>
        <Canvas camera={{ position: [camera.position.x, camera.position.y, camera.position.z], fov: 55 }}>
          <ambientLight intensity={0.7} />
          <directionalLight position={[200, 150, 100]} intensity={1.1} />
          <gridHelper args={[600, 30, "#334155", "#223047"]} position={[250, 0, 0]} />
          {showTerrain && <TerrainLayer />}
          {showCenterline && <CenterlineLayer draft={draft} />}
          {showSupports && <SupportsLayer draft={draft} />}
          <OrbitControls makeDefault target={[camera.target.x, camera.target.y, camera.target.z]} />
        </Canvas>
      </div>
    </ViewerErrorBoundary>
  );
}
