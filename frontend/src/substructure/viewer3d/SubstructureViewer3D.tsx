// Phase C1 (M2-01) 下部工 3D Viewer（R3F）
// M1 の pure geometry（SolidGroup）を React Three Fiber で表示する。
// Viewer は描画のみに徹し、M1 層への密結合を作らない。

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import type { SolidGroup } from "../geometryBase";
import {
  buildScene,
  computeSceneBounds,
} from "./threeFactory";
import { resolveOrbitControlsBindings } from "../../viewer/threeUtils";
import { ja } from "../../i18n/ja";
import type { DimensionSet } from "../planning/dimensions/dimensionModel";
import { Dimension3DLayer } from "../planning/dimensions/Dimension3DLayer";

export type CameraPreset = "top" | "front" | "side" | "isometric";

export interface Viewer3DProps {
  groups: readonly SolidGroup[];
  selectedSupportId?: string | null;
  hiddenSupportIds?: ReadonlySet<string>;
  hiddenEntities?: ReadonlySet<string>;
  onSelect?: (supportId: string) => void;
  height?: number;
  /** 既定カメラ姿勢（default=isometric） */
  initialCamera?: CameraPreset;
  /** M2-06: 3D 寸法マーカー（Canvas 内に描画） */
  dimensions?: DimensionSet | null;
}

/** OrbitControls の P03.5 バインド（LEFT=ROTATE / RIGHT=PAN / MIDDLE=DOLLY）。 */
function ViewerControls() {
  const { camera } = useThree();
  const { mouseButtons, screenSpacePanning, touches } =
    resolveOrbitControlsBindings(false);
  return (
    <OrbitControls
      makeDefault
      mouseButtons={mouseButtons}
      touches={touches}
      screenSpacePanning={screenSpacePanning}
    />
  );
}

function isometryDistance(bounds: THREE.Box3): number {
  const size = bounds.getSize(new THREE.Vector3()).length();
  return Math.max(size, 1) * 1.6 + 2;
}

/** カメラプリセット適用。 */
function CameraRig({
  preset,
  bounds,
  fitKey,
  focusKey,
}: {
  preset: CameraPreset;
  bounds: THREE.Box3;
  fitKey: number;
  focusKey: string | null;
}) {
  const { camera } = useThree();
  const controlsRef = useRef<any>(null);

  useEffect(() => {
    const target = bounds.getCenter(new THREE.Vector3());
    const distance = isometryDistance(bounds);
    const base: Record<CameraPreset, THREE.Vector3> = {
      isometric: new THREE.Vector3(distance, distance, distance).add(target),
      top: new THREE.Vector3(0, distance, 0).add(target),
      front: new THREE.Vector3(0, 0, distance).add(target),
      side: new THREE.Vector3(distance, 0, 0).add(target),
    };
    camera.position.copy(base[preset]);
    camera.lookAt(target);
    camera.updateProjectionMatrix();
    controlsRef.current?.target?.copy(target);
    controlsRef.current?.update?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preset, fitKey]);

  useEffect(() => {
    if (!focusKey) return;
    const target = bounds.getCenter(new THREE.Vector3());
    const distance = isometryDistance(bounds);
    camera.position.copy(target).add(new THREE.Vector3(distance, distance, distance));
    camera.lookAt(target);
    camera.updateProjectionMatrix();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusKey]);

  return <OrbitControls ref={controlsRef} makeDefault />;
}

interface SceneViewProps {
  groups: readonly SolidGroup[];
  selectedSupportId?: string | null;
  hiddenSupportIds?: ReadonlySet<string>;
  hiddenEntities?: ReadonlySet<string>;
  onSelect?: (supportId: string) => void;
  preset: CameraPreset;
  fitKey: number;
  focusKey: string | null;
  dimensions?: DimensionSet | null;
}

function SceneView({
  groups,
  selectedSupportId,
  hiddenSupportIds,
  hiddenEntities,
  onSelect,
  preset,
  fitKey,
  focusKey,
  dimensions,
}: SceneViewProps) {
  const { scene } = useThree();
  const root = useMemo(
    () =>
      buildScene(groups, {
        selectedSupportId,
        hiddenSupportIds,
        hiddenEntities,
      }).root,
    [groups, selectedSupportId, hiddenSupportIds, hiddenEntities],
  );
  const bounds = useMemo(() => computeSceneBounds(groups), [groups]);

  useEffect(() => {
    scene.add(root);
    return () => {
      scene.remove(root);
      root.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          obj.geometry.dispose();
          if (Array.isArray(obj.material)) obj.material.forEach((m) => m.dispose());
          else obj.material.dispose();
        }
      });
    };
  }, [scene, root]);

  return (
    <>
      <ambientLight intensity={0.55} />
      <directionalLight position={[20, 30, 15]} intensity={1.0} />
      <directionalLight position={[-15, 10, -20]} intensity={0.35} />
      <primitive object={root} />
      <MeshPicker onSelect={(supportId) => onSelect?.(supportId)} />
      {dimensions && <Dimension3DLayer dimensions={dimensions} />}
      <CameraRig preset={preset} bounds={bounds} fitKey={fitKey} focusKey={focusKey} />
      <GridHelper floor={bounds.min.y} bounds={bounds} />
    </>
  );
}

/** Raycast による選択判定（P03.5: 左クリック=選択）。 */
function MeshPicker({ onSelect }: { onSelect: (supportId: string) => void }) {
  const { camera, gl, raycaster, scene } = useThree();
  const pickables = useRef<THREE.Object3D[]>([]);

  useEffect(() => {
    const collect = () => {
      const out: THREE.Object3D[] = [];
      scene.traverse((obj) => {
        if ((obj as THREE.Mesh).isMesh) out.push(obj);
      });
      pickables.current = out;
    };
    collect();
    const timer = window.setTimeout(collect, 50);
    return () => window.clearTimeout(timer);
  }, [scene]);

  const handlePointer = useCallback(
    (e: MouseEvent) => {
      const rect = gl.domElement.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(new THREE.Vector2(x, y), camera);
      const hits = raycaster.intersectObjects(pickables.current, true);
      if (hits.length === 0) return;
      let obj: THREE.Object3D | null = hits[0].object;
      while (obj) {
        const supportId = obj.userData?.supportId as string | undefined;
        if (supportId) {
          onSelect(supportId);
          return;
        }
        obj = obj.parent;
      }
    },
    [camera, gl, raycaster, onSelect],
  );

  useEffect(() => {
    const el = gl.domElement;
    el.addEventListener("pointerdown", handlePointer);
    return () => el.removeEventListener("pointerdown", handlePointer);
  }, [gl, handlePointer]);

  return null;
}

/** 地面グリッド（必要最小限）。 */
function GridHelper({
  floor,
  bounds,
}: {
  floor: number;
  bounds: THREE.Box3;
}) {
  const size = Math.max(bounds.getSize(new THREE.Vector3()).length(), 1) * 1.5;
  return (
    <gridHelper
      args={[size, 20, 0x9aa0a6, 0xd0d4da]}
      position={[bounds.getCenter(new THREE.Vector3()).x, floor, bounds.getCenter(new THREE.Vector3()).z]}
    />
  );
}

export function SubstructureViewer3D(props: Viewer3DProps) {
  const [preset, setPreset] = useState<CameraPreset>(props.initialCamera ?? "isometric");
  const [fitKey, setFitKey] = useState(0);
  const [focusKey, setFocusKey] = useState<string | null>(null);

  const fitAll = useCallback(() => setFitKey((k) => k + 1), []);
  const fitSelection = useCallback(() => {
    if (!props.selectedSupportId) return;
    setFocusKey(props.selectedSupportId);
  }, [props.selectedSupportId]);
  const setCamera = useCallback((p: CameraPreset) => setPreset(p), []);

  const text = ja.substructure?.viewer ?? ({} as Record<string, string>);

  return (
    <div className="substructure-viewer3d" data-testid="substructure-viewer3d">
      <div className="substructure-viewer3d-toolbar">
        <button type="button" data-testid="viewer-fit-all" onClick={fitAll}>
          {text.fitAll ?? "Fit All"}
        </button>
        <button type="button" data-testid="viewer-fit-selection" onClick={fitSelection} disabled={!props.selectedSupportId}>
          {text.fitSelection ?? "Fit Selection"}
        </button>
        <span className="viewer-preset-group">
          {(["top", "front", "side", "isometric"] as const).map((p) => (
            <button
              key={p}
              type="button"
              data-testid={`viewer-${p}`}
              className={preset === p ? "active" : ""}
              onClick={() => setCamera(p)}
            >
              {text[p] ?? p}
            </button>
          ))}
        </span>
      </div>
      <Canvas
        style={{ height: props.height ?? 480 }}
        dpr={[1, 2]}
        gl={{ antialias: true }}
        camera={{ position: [8, 8, 8], fov: 45, near: 0.1, far: 5000 }}
      >
        <SceneView
          groups={props.groups}
          selectedSupportId={props.selectedSupportId}
          hiddenSupportIds={props.hiddenSupportIds}
          hiddenEntities={props.hiddenEntities}
          onSelect={props.onSelect}
          preset={preset}
          fitKey={fitKey}
          focusKey={focusKey}
          dimensions={props.dimensions}
        />
        <ViewerControls />
      </Canvas>
    </div>
  );
}
