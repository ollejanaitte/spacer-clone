import { useCallback, useEffect, useMemo, useState } from "react";
import { Fallback2DViewport } from "./Fallback2DViewport";
import type { CameraPreset, Viewer3DProps, ViewerMode, ViewerScales, ViewerSelection, ViewerVisibility } from "./types";
import { ThreeViewport } from "./ThreeViewport";
import { ViewerControls } from "./ViewerControls";

const defaultVisibility: ViewerVisibility = {
  nodes: true,
  members: true,
  supports: true,
  loads: true,
  labels: true,
  nodeLabels: true,
  memberLabels: true,
  grid: true,
  axes: true,
  deformedShape: false,
};

const defaultScales: ViewerScales = {
  loadScale: 1,
  deformationScale: 120,
  nodeSize: 0.075,
  labelSize: 0.26,
};

export const webglFallbackMessage =
  "3D表示の初期化に失敗しました。\n" +
  "2D簡易表示に切り替えました。\n" +
  "Electron版では GPU_MODE=compat-gpu-blocklist または compat-angle-gl を試してください。\n" +
  "legacy-desktop-gl は最後の手段です。";

export function Viewer3D({
  project,
  result,
  selectedSection,
  selection,
  activeLoadCase,
  onSelectionChange,
  onActiveLoadCaseChange,
  onViewerError,
}: Viewer3DProps) {
  const [visibility, setVisibility] = useState<ViewerVisibility>(defaultVisibility);
  const [scales, setScales] = useState<ViewerScales>(defaultScales);
  const [mode, setMode] = useState<ViewerMode>("three");
  const [viewerError, setViewerError] = useState<string | null>(null);
  const [fitRequest, setFitRequest] = useState(0);
  const [cameraRequest, setCameraRequest] = useState<CameraPreset | null>(null);
  const loadCaseIds = useMemo(
    () => project.loadCases.map((loadCase) => loadCase.id).filter(Boolean),
    [project.loadCases],
  );
  const selectedLoadCaseId = activeLoadCase || loadCaseIds[0] || "";
  const hasResult = Boolean(result && result.errors.length === 0 && result.displacements.length > 0);

  useEffect(() => {
    if (!loadCaseIds.includes(selectedLoadCaseId)) {
      onActiveLoadCaseChange(loadCaseIds[0] ?? "");
    }
  }, [loadCaseIds, selectedLoadCaseId, onActiveLoadCaseChange]);

  useEffect(() => {
    if (!hasResult && visibility.deformedShape) {
      setVisibility((current) => ({ ...current, deformedShape: false }));
    }
  }, [hasResult, visibility.deformedShape]);

  const runCameraPreset = (preset: CameraPreset) => {
    setCameraRequest(preset);
    setFitRequest((value) => value + 1);
  };

  const handleInitializationError = useCallback(
    (error: unknown) => {
      const detail = error instanceof Error && error.message ? ` (${error.message})` : "";
      const message = `${webglFallbackMessage}${detail}`;
      setMode("fallback2d");
      setViewerError(message);
      onViewerError?.(message);
    },
    [onViewerError],
  );

  const viewportProps = {
    project,
    result,
    selectedSection,
    selection,
    activeLoadCase,
    onSelectionChange,
    onActiveLoadCaseChange,
    visibility,
    scales,
    selectedLoadCaseId,
    fitRequest,
    cameraRequest,
    onInitializationError: handleInitializationError,
  };
  const gpuMode = getGpuModeLabel();

  return (
    <main className="viewer-shell">
      <div className="viewer-header">
        <div>
          <h2>3D Viewer</h2>
          <p>{statusText(selection, hasResult)}</p>
        </div>
        <div className="viewer-stats">
          <span>mode: {mode}</span>
          <span>gpu: {gpuMode}</span>
          <span>{project.nodes.length} nodes</span>
          <span>{project.members.length} members</span>
          <span>{project.supports.length} supports</span>
          <span>{project.nodalLoads.length + project.memberLoads.length} loads</span>
        </div>
      </div>
      <section className="viewer-body">
        <div className="viewer-viewport-stack">
          {viewerError && (
            <div className="viewer-error-banner" role="alert">
              {viewerError.split("\n").map((line) => (
                <div key={line}>{line}</div>
              ))}
            </div>
          )}
          {mode === "three" ? <ThreeViewport {...viewportProps} /> : <Fallback2DViewport {...viewportProps} />}
        </div>
        <ViewerControls
          visibility={visibility}
          scales={scales}
          loadCaseIds={loadCaseIds.length > 0 ? loadCaseIds : [""]}
          selectedLoadCaseId={selectedLoadCaseId}
          hasResult={hasResult}
          onVisibilityChange={setVisibility}
          onScalesChange={setScales}
          onLoadCaseChange={onActiveLoadCaseChange}
          onFit={() => setFitRequest((value) => value + 1)}
          onCameraPreset={runCameraPreset}
        />
      </section>
    </main>
  );
}

function statusText(selection: ViewerSelection, hasResult: boolean): string {
  const selected = selection ? `${selection.type} ${selection.id}` : "no selection";
  return `${selected} | ${hasResult ? "result deformation available" : "input model view"}`;
}

function getGpuModeLabel(): string {
  const maybeWindow = window as Window & {
    spacerDesktop?: { gpuMode?: string };
    desktop?: { gpuMode?: string };
  };
  return maybeWindow.spacerDesktop?.gpuMode ?? maybeWindow.desktop?.gpuMode ?? "browser";
}
