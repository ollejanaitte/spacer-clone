import { useCallback, useEffect, useMemo, useState } from "react";
import { buildResponseSpectrumViewModel, hasResponseSpectrumResult, type ResponseSpectrumSelection } from "../results/resultViewModel";
import { Fallback2DViewport } from "./Fallback2DViewport";
import type { CameraPreset, Viewer3DProps, ViewerMode, ViewerScales, ViewerSelection, ViewerVisibility } from "./types";
import { ThreeViewport } from "./ThreeViewport";
import { useViewerCoordinateMode } from "./useViewerCoordinateMode";
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
  reactions: false,
  axialForce: false,
  momentMy: false,
  momentMz: false,
};

const defaultScales: ViewerScales = {
  loadScale: 1,
  deformationScale: 120,
  modeScale: 1,
  resultScale: 1,
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
  selectedEigenMode = 1,
  selectedResponseSpectrumResult = "SRSS",
  onSelectionChange,
  onActiveLoadCaseChange,
  onSelectedEigenModeChange = () => undefined,
  onSelectedResponseSpectrumResultChange = () => undefined,
  onViewerError,
}: Viewer3DProps) {
  const [visibility, setVisibility] = useState<ViewerVisibility>(defaultVisibility);
  const [scales, setScales] = useState<ViewerScales>(defaultScales);
  const [mode, setMode] = useState<ViewerMode>("three");
  const [viewerError, setViewerError] = useState<string | null>(null);
  const [fitRequest, setFitRequest] = useState(0);
  const [coordinateMode, setCoordinateMode, toggleCoordinateMode] = useViewerCoordinateMode();
  const [cameraRequest, setCameraRequest] = useState<CameraPreset | null>(null);
  const loadCaseIds = useMemo(
    () => project.loadCases.map((loadCase) => loadCase.id).filter(Boolean),
    [project.loadCases],
  );
  const selectedLoadCaseId = activeLoadCase || loadCaseIds[0] || "";
  const eigenModeNos = useMemo(
    () => result?.eigenResult?.modes.map((mode) => mode.modeNo) ?? [],
    [result],
  );
  const responseSpectrumViewModel = useMemo(
    () => buildResponseSpectrumViewModel(result, selectedResponseSpectrumResult),
    [result, selectedResponseSpectrumResult],
  );
  const responseSpectrumOptions = responseSpectrumViewModel?.modeOptions ?? [];
  const hasResult = Boolean(
    result &&
      result.errors.length === 0 &&
      (result.displacements.length > 0 || eigenModeNos.length > 0 || hasResponseSpectrumResult(result)),
  );

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

  useEffect(() => {
    if (eigenModeNos.length > 0 && !eigenModeNos.includes(selectedEigenMode)) {
      onSelectedEigenModeChange(eigenModeNos[0]);
    }
  }, [eigenModeNos, selectedEigenMode, onSelectedEigenModeChange]);

  useEffect(() => {
    if (
      responseSpectrumOptions.length > 0 &&
      !responseSpectrumOptions.some((option) => option.key === selectedResponseSpectrumResult)
    ) {
      onSelectedResponseSpectrumResultChange("SRSS");
    }
  }, [responseSpectrumOptions, selectedResponseSpectrumResult, onSelectedResponseSpectrumResultChange]);

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
    selectedEigenMode,
    selectedResponseSpectrumResult,
    fitRequest,
    cameraRequest,
    onInitializationError: handleInitializationError,
    coordinateMode,
  };
  const gpuMode = getGpuModeLabel();

  return (
    <main className="viewer-shell">
      <div className="viewer-header">
        <div>
          <h2>3D表示</h2>
          <p>{statusText(selection, hasResult)}</p>
        </div>
        <div className="viewer-stats">
          <span>表示: {mode === "three" ? "3D" : "2D簡易"}</span>
          <span>GPU: {gpuMode}</span>
          <span>節点 {project.nodes.length}</span>
          <span>部材 {project.members.length}</span>
          <span>支点 {project.supports.length}</span>
          <span>荷重 {project.nodalLoads.length + project.memberLoads.length}</span>
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
          eigenModeNos={eigenModeNos}
          selectedEigenMode={selectedEigenMode}
          responseSpectrumOptions={responseSpectrumOptions}
          selectedResponseSpectrumResult={selectedResponseSpectrumResult}
          hasResult={hasResult}
          onVisibilityChange={setVisibility}
          onScalesChange={setScales}
          onLoadCaseChange={onActiveLoadCaseChange}
          onEigenModeChange={onSelectedEigenModeChange}
          onResponseSpectrumResultChange={(value: ResponseSpectrumSelection) =>
            onSelectedResponseSpectrumResultChange(value)
          }
          onFit={() => setFitRequest((value) => value + 1)}
          onCameraPreset={runCameraPreset}
          coordinateMode={coordinateMode}
          onCoordinateModeChange={setCoordinateMode}
          onCoordinateModeToggle={toggleCoordinateMode}
        />
      </section>
    </main>
  );
}

function statusText(selection: ViewerSelection, hasResult: boolean): string {
  const selected = selection ? `${selection.type === "node" ? "節点" : "部材"} ${selection.id}` : "未選択";
  return `${selected} / ${hasResult ? "変形図を表示できます" : "入力モデルを表示中"}`;
}

function getGpuModeLabel(): string {
  const maybeWindow = window as Window & {
    spacerDesktop?: { gpuMode?: string };
    desktop?: { gpuMode?: string };
  };
  return maybeWindow.spacerDesktop?.gpuMode ?? maybeWindow.desktop?.gpuMode ?? "browser";
}
