import { Component, useEffect, useMemo, useRef, useState, type ErrorInfo, type ReactNode } from "react";
import { Canvas } from "@react-three/fiber";
import { Html, OrbitControls } from "@react-three/drei";
import locale from "../i18n/locales/ja.json";
import type { ProjectModel, TimeHistoryResult } from "../types";
import {
  computeTimeHistoryNodeOverride,
  type TimeHistoryDisplacementMode,
} from "./timeHistoryAnimation";

type Visibility = {
  nodes: boolean;
  members: boolean;
  nodeLabels: boolean;
  memberLabels: boolean;
  supports: boolean;
  masses: boolean;
};

const speedOptions = [0.25, 0.5, 1, 2, 4] as const;
const scaleOptions = [1, 10, 100, 1000] as const;

type Props = {
  project: ProjectModel;
  result: TimeHistoryResult;
  onOverrideChange?: (override: Map<string, { x: number; y: number; z: number }> | null) => void;
};

export function TimeHistoryModelAnimation({ project, result, onOverrideChange }: Props) {
  const text = locale.thAnalysis.results.animation;
  const [playing, setPlaying] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [scale, setScale] = useState(1000);
  const [customScale, setCustomScale] = useState(1000);
  const [mode, setMode] = useState<TimeHistoryDisplacementMode>("xyz");
  const [nodeSize, setNodeSize] = useState(5);
  const [memberWidth, setMemberWidth] = useState(2);
  const [cameraKey, setCameraKey] = useState(0);
  const [visibility, setVisibility] = useState<Visibility>({
    nodes: true,
    members: true,
    nodeLabels: false,
    memberLabels: false,
    supports: true,
    masses: true,
  });
  const lastFrameRef = useRef<number | null>(null);
  const carryRef = useRef(0);
  const sampleCount = Math.min(result.meta.sampleCount ?? result.time.length, result.time.length);
  const timeStep = result.meta.timeStep || 0.01;
  const override = useMemo(
    () => computeTimeHistoryNodeOverride({
      project,
      result,
      timeIndex: currentIndex,
      displacementScale: scale,
      displacementMode: mode,
    }),
    [currentIndex, mode, project, result, scale],
  );
  const stats = useMemo(() => computeAnimationStats(result), [result]);
  const model = useMemo(() => modelBounds(project), [project]);

  useEffect(() => {
    onOverrideChange?.(override);
  }, [onOverrideChange, override]);

  useEffect(() => {
    if (!playing || sampleCount <= 1) return;
    let frame = 0;
    const tick = (timestamp: number) => {
      const previous = lastFrameRef.current ?? timestamp;
      lastFrameRef.current = timestamp;
      carryRef.current += ((timestamp - previous) / 1000) * speed;
      if (carryRef.current >= timeStep) {
        const advance = Math.max(1, Math.floor(carryRef.current / timeStep));
        carryRef.current -= advance * timeStep;
        setCurrentIndex((current) => {
          const next = current + advance;
          if (next >= sampleCount - 1) {
            setPlaying(false);
            return sampleCount - 1;
          }
          return next;
        });
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
      lastFrameRef.current = null;
    };
  }, [playing, sampleCount, speed, timeStep]);

  const reset = () => {
    setPlaying(false);
    setCurrentIndex(0);
    carryRef.current = 0;
  };

  return (
    <section className="time-history-model-animation" aria-label={text.heading}>
      <div className="time-history-animation-toolbar">
        <strong>{text.heading}</strong>
        <button type="button" onClick={() => setCameraKey((key) => key + 1)}>{text.viewReset}</button>
      </div>
      <div className="time-history-animation-layout">
        <div className="time-history-animation-canvas">
          <CanvasErrorBoundary fallback={<div className="time-history-empty-result-guide">{text.webglError}</div>}>
            <Canvas
              key={cameraKey}
              camera={{
                position: [model.center[0] + model.size, model.center[1] + model.size, model.center[2] + model.size],
                near: 0.01,
                far: Math.max(1000, model.size * 20),
              }}
              dpr={[1, 2]}
            >
              <color attach="background" args={["#0e1726"]} />
              <ambientLight intensity={1.2} />
              <directionalLight position={[5, 8, 6]} intensity={1.5} />
              <gridHelper args={[model.size * 2, 20, "#334155", "#223047"]} position={[model.center[0], model.minY, model.center[2]]} />
              <axesHelper args={[Math.max(model.size * 0.3, 1)]} />
              <ModelScene
                project={project}
                positions={override}
                visibility={visibility}
                nodeSize={nodeSize}
                memberWidth={memberWidth}
              />
              <OrbitControls makeDefault target={model.center} />
            </Canvas>
          </CanvasErrorBoundary>
        </div>
        <aside className="time-history-animation-options">
          <fieldset>
            <legend>{text.heading}</legend>
            {(Object.keys(visibility) as Array<keyof Visibility>).map((key) => (
              <label key={key}>
                <input
                  type="checkbox"
                  checked={visibility[key]}
                  onChange={(event) => setVisibility((current) => ({ ...current, [key]: event.currentTarget.checked }))}
                />
                {visibilityLabel(key)}
              </label>
            ))}
          </fieldset>
          <label>
            <span>{text.nodeSize}: {nodeSize}px</span>
            <input type="range" min="1" max="10" value={nodeSize} onChange={(event) => setNodeSize(Number(event.currentTarget.value))} />
          </label>
          <label>
            <span>{text.memberWidth}: {memberWidth}px</span>
            <input type="range" min="1" max="6" value={memberWidth} onChange={(event) => setMemberWidth(Number(event.currentTarget.value))} />
          </label>
        </aside>
      </div>
      <div className="time-history-playback-controls">
        <button type="button" aria-label={playing ? text.pause : text.play} onClick={() => setPlaying((value) => !value)}>
          {playing ? `⏸ ${text.pause}` : `▶ ${text.play}`}
        </button>
        <button type="button" aria-label={text.reset} onClick={reset}>⏮ {text.reset}</button>
        <label className="time-history-seek">
          <span>{text.seek}</span>
          <input
            aria-label={text.seek}
            type="range"
            min="0"
            max={Math.max(0, sampleCount - 1)}
            value={Math.min(currentIndex, Math.max(0, sampleCount - 1))}
            onChange={(event) => {
              setPlaying(false);
              setCurrentIndex(Number(event.currentTarget.value));
            }}
          />
        </label>
        <label>
          <span>{text.speed}</span>
          <select aria-label={text.speed} value={speed} onChange={(event) => setSpeed(Number(event.currentTarget.value))}>
            {speedOptions.map((value) => <option key={value} value={value}>{value}×</option>)}
          </select>
        </label>
        <label>
          <span>{text.scale}</span>
          <select
            aria-label={text.scale}
            value={scaleOptions.includes(scale as typeof scaleOptions[number]) ? scale : "custom"}
            onChange={(event) => {
              if (event.currentTarget.value === "custom") setScale(customScale);
              else setScale(Number(event.currentTarget.value));
            }}
          >
            {scaleOptions.map((value) => <option key={value} value={value}>{value}</option>)}
            <option value="custom">{text.customScale}</option>
          </select>
        </label>
        <input
          aria-label={text.customScale}
          type="number"
          min="0.01"
          value={customScale}
          onChange={(event) => {
            const value = Number(event.currentTarget.value);
            if (Number.isFinite(value) && value > 0) {
              setCustomScale(value);
              setScale(value);
            }
          }}
        />
        <label>
          <span>{text.mode}</span>
          <select aria-label={text.mode} value={mode} onChange={(event) => setMode(event.currentTarget.value as TimeHistoryDisplacementMode)}>
            <option value="xyz">{text.combined}</option>
            <option value="x">{text.x}</option>
            <option value="y">{text.y}</option>
            <option value="z">{text.z}</option>
          </select>
        </label>
      </div>
      <div className="time-history-animation-status">
        <span>{text.currentTime}: {(result.time[currentIndex] ?? currentIndex * timeStep).toFixed(3)} s</span>
        <span>{text.maxNode}: {stats.nodeId || "-"}</span>
        <span>{text.maxTime}: {stats.time.toFixed(3)} s</span>
      </div>
    </section>
  );
}

function ModelScene({
  project,
  positions,
  visibility,
  nodeSize,
  memberWidth,
}: {
  project: ProjectModel;
  positions: Map<string, { x: number; y: number; z: number }> | null;
  visibility: Visibility;
  nodeSize: number;
  memberWidth: number;
}) {
  const position = (nodeId: string) => {
    const override = positions?.get(nodeId);
    const node = project.nodes.find((item) => item.id === nodeId);
    return override ? [override.x, override.y, override.z] as const : [node?.x ?? 0, node?.y ?? 0, node?.z ?? 0] as const;
  };
  const massNodes = new Set((project.massCases?.flatMap((massCase) => massCase.items ?? []) ?? []).map((item) => item.nodeId));
  return (
    <group>
      {visibility.members && project.members.map((member) => {
        const start = position(member.nodeI);
        const end = position(member.nodeJ);
        const midpoint = [(start[0] + end[0]) / 2, (start[1] + end[1]) / 2, (start[2] + end[2]) / 2] as const;
        return (
          <group key={member.id}>
            <line>
              <bufferGeometry>
                <bufferAttribute attach="attributes-position" args={[new Float32Array([...start, ...end]), 3]} />
              </bufferGeometry>
              <lineBasicMaterial color="#60a5fa" linewidth={memberWidth} />
            </line>
            {visibility.memberLabels && <Html position={midpoint} center><span className="time-history-3d-label">{member.id}</span></Html>}
          </group>
        );
      })}
      {project.nodes.map((node) => {
        const current = position(node.id);
        const supported = project.supports.some((support) => support.nodeId === node.id);
        return (
          <group key={node.id} position={current}>
            {visibility.nodes && (
              <mesh>
                <sphereGeometry args={[nodeSize * 0.012, 16, 12]} />
                <meshStandardMaterial color="#e5edf8" />
              </mesh>
            )}
            {visibility.nodeLabels && <Html center><span className="time-history-3d-label">{node.id}</span></Html>}
            {visibility.supports && supported && (
              <mesh position={[0, -nodeSize * 0.025, 0]} rotation={[Math.PI, 0, 0]}>
                <coneGeometry args={[nodeSize * 0.025, nodeSize * 0.05, 4]} />
                <meshStandardMaterial color="#f97316" />
              </mesh>
            )}
            {visibility.masses && massNodes.has(node.id) && (
              <mesh position={[0, nodeSize * 0.035, 0]}>
                <boxGeometry args={[nodeSize * 0.025, nodeSize * 0.025, nodeSize * 0.025]} />
                <meshStandardMaterial color="#22c55e" />
              </mesh>
            )}
          </group>
        );
      })}
    </group>
  );
}

function visibilityLabel(key: keyof Visibility): string {
  const text = locale.thAnalysis.results.animation;
  return {
    nodes: text.nodes,
    members: text.members,
    nodeLabels: text.nodeLabels,
    memberLabels: text.memberLabels,
    supports: text.supports,
    masses: text.masses,
  }[key];
}

function computeAnimationStats(result: TimeHistoryResult): { nodeId: string; time: number } {
  let max = -1;
  let nodeId = "";
  let index = 0;
  for (const [key, values] of Object.entries(result.displacements ?? {})) {
    values.forEach((value, valueIndex) => {
      if (Number.isFinite(value) && Math.abs(value) > max) {
        max = Math.abs(value);
        nodeId = key.replace(/_(ux|uy|uz)$/, "");
        index = valueIndex;
      }
    });
  }
  return { nodeId, time: result.time[index] ?? index * (result.meta.timeStep ?? 0) };
}

function modelBounds(project: ProjectModel) {
  const xs = project.nodes.map((node) => node.x);
  const ys = project.nodes.map((node) => node.y);
  const zs = project.nodes.map((node) => node.z);
  const minX = Math.min(...xs, 0);
  const maxX = Math.max(...xs, 1);
  const minY = Math.min(...ys, 0);
  const maxY = Math.max(...ys, 1);
  const minZ = Math.min(...zs, 0);
  const maxZ = Math.max(...zs, 1);
  return {
    center: [(minX + maxX) / 2, (minY + maxY) / 2, (minZ + maxZ) / 2] as [number, number, number],
    size: Math.max(maxX - minX, maxY - minY, maxZ - minZ, 1),
    minY,
  };
}

class CanvasErrorBoundary extends Component<{ children: ReactNode; fallback: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(_error: Error, _info: ErrorInfo) {
    // The visible fallback is the user-facing error channel.
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}
