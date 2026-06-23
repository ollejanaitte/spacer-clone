import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PanelRightClose, PanelRightOpen } from "lucide-react";
import { ja } from "../i18n/ja";
import { buildResponseSpectrumViewModel, hasResponseSpectrumResult, type ResponseSpectrumSelection } from "../results/resultViewModel";
import type { ProjectModel } from "../types";
import { Fallback2DViewport } from "./Fallback2DViewport";
import { createSuspendedDeckProject } from "../data/defaultProject";
import { createSpacerAxisSwap, loadSpacerAxisSwap, persistSpacerAxisSwap, type SpacerAxisSwap } from "./coordinateTransform";
import { DEFAULT_ANIMATION_OPTIONS, type AnimationOptions } from "./animation";
import { defaultScales, defaultVisibility, type CameraPreset, type Viewer3DProps, type ViewerMode, type ViewerScales, type ViewerSelection, type ViewerVisibility } from "./types";
import { CompareShell, defaultCompareAnimationOptions, type CompareSlotDescriptor } from "./CompareShell";
import { ThreeViewport } from "./ThreeViewport";
import { ViewerControls } from "./ViewerControls";
import {
  DEFAULT_VIEWER_DISPLAY_SIZE,
  loadViewerDisplaySize,
  persistViewerDisplaySize,
  type ViewerDisplaySizeSettings,
} from "./settings/displaySize";
import type { ForceColorModeData } from "./memberForceColorMap";
import { DEFAULT_FORCE_COLOR_MODE, type ForceColorComponent, type ForceColorValueType, computeMemberForceColorValues, computeForceColorRange } from "./memberForceColorMap";

export const webglFallbackMessage =
  ja.viewer.messages.webglInitFailed + "\n" +
  ja.viewer.messages.fallback2DSwitched + "\n" +
  ja.viewer.messages.electronGpuHint + "\n" +
  ja.viewer.messages.electronGpuLastResort;

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
  timeHistoryNodeOverride = null,
  compareProject,
  rightResult = null,
  initialCompareMode = false,
  defaultCameraSync = true,
  displaySizeSettings,
  onDisplaySizeSettingsChange,
  viewPanelOpen = true,
  onViewPanelToggle,
  onFitRequest,
}: Viewer3DProps) {
  const [visibility, setVisibility] = useState<ViewerVisibility>(defaultVisibility);
  const [scales, setScales] = useState<ViewerScales>(defaultScales);
  const [localDisplaySize, setLocalDisplaySize] = useState<ViewerDisplaySizeSettings>(loadViewerDisplaySize);
  const displaySize = displaySizeSettings ?? localDisplaySize;
  const setDisplaySize = useCallback((next: ViewerDisplaySizeSettings) => {
    if (!displaySizeSettings) setLocalDisplaySize(next);
    onDisplaySizeSettingsChange?.(next);
  }, [displaySizeSettings, onDisplaySizeSettingsChange]);
  const [mode, setMode] = useState<ViewerMode>("three");
  const [viewerError, setViewerError] = useState<string | null>(null);
  const [fitRequest, setFitRequest] = useState(0);
  const [cameraRequest, setCameraRequest] = useState<CameraPreset | null>(null);
  const [spacerAxisSwap, setSpacerAxisSwap] = useState<SpacerAxisSwap>(() => createSpacerAxisSwap(loadSpacerAxisSwap()));
  const [animationOptions, setAnimationOptions] = useState<AnimationOptions>(DEFAULT_ANIMATION_OPTIONS);
  const [compareMode, setCompareMode] = useState<boolean>(initialCompareMode);
  const [cameraSync, setCameraSync] = useState<boolean>(defaultCameraSync);
  const deformedShapeAutoEnabled = useRef(false);
  const [forceColorMap, setForceColorMap] = useState<boolean>(false);
  const [forceColorComponent, setForceColorComponent] = useState<ForceColorComponent>("N");
  const [forceColorValueType, setForceColorValueType] = useState<ForceColorValueType>("absMax");
  const forceColorMode: ForceColorModeData = useMemo(() => ({
    enabled: forceColorMap,
    component: forceColorComponent,
    valueType: forceColorValueType,
  }), [forceColorMap, forceColorComponent, forceColorValueType]);
  const [compareProjectState] = useState<ProjectModel | null>(() => compareProject ?? createSuspendedDeckProject());
  const loadCaseIds = useMemo(
    () => project.loadCases.map((loadCase) => loadCase.id).filter(Boolean),
    [project.loadCases],
  );
  const selectedLoadCaseId = activeLoadCase || loadCaseIds[0] || "";
  const forceColorRange = useMemo(() => {
    if (!forceColorMap || !result) return { min: 0, max: 0 };
    const values = computeMemberForceColorValues(project, result, selectedLoadCaseId, forceColorComponent, forceColorValueType, selectedResponseSpectrumResult);
    return computeForceColorRange(values);
  }, [forceColorMap, result, project, selectedLoadCaseId, forceColorComponent, forceColorValueType, selectedResponseSpectrumResult]);
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
    persistSpacerAxisSwap(spacerAxisSwap);
  }, [spacerAxisSwap]);

  useEffect(() => {
    persistViewerDisplaySize(displaySize);
  }, [displaySize]);

  const effectiveScales = useMemo<ViewerScales>(() => ({
    ...scales,
    nodeSize: defaultScales.nodeSize * (displaySize.nodeSize / 5),
    labelSize: defaultScales.labelSize * displaySize.labelSize,
    supportSize: displaySize.supportSize,
    loadArrowSize: displaySize.loadArrowSize,
    memberLineWidth: displaySize.memberLineWidth,
  }), [displaySize, scales]);

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
    if (eigenModeNos.length > 0 && !deformedShapeAutoEnabled.current) {
      deformedShapeAutoEnabled.current = true;
      setVisibility((current) =>
        current.deformedShape ? current : { ...current, deformedShape: true },
      );
    }
  }, [eigenModeNos]);

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

  const handleSpacerAxisSwapChange = useCallback((next: SpacerAxisSwap) => {
    setSpacerAxisSwap(next);
    setFitRequest((value) => value + 1);
  }, []);

  const handleAnimationOptionsChange = useCallback((next: AnimationOptions) => {
    setAnimationOptions(next);
  }, []);

  const handleCompareModeChange = useCallback((next: boolean) => {
    setCompareMode(next);
    if (next) {
      // When entering compare mode, default-enable animation so the user
      // can see the difference between the two plans immediately.
      setAnimationOptions((current) => (current.enabled ? current : { ...current, enabled: true }));
    }
    setFitRequest((value) => value + 1);
  }, []);

  const handleCameraSyncChange = useCallback((next: boolean) => {
    setCameraSync(next);
  }, []);

  const suspendedProject = compareProjectState;
  const compareSlots: CompareSlotDescriptor[] = useMemo(() => {
    if (!compareMode || !suspendedProject) return [];
    return [
      {
        id: "plan-a",
        label: "Plan A / Continuous Deck",
        caption: "5-span continuous viaduct with shared deck nodes",
        project,
      },
      {
        id: "plan-b",
        label: "Plan B / Suspended Deck",
        caption: "5-span with deck split at P3 (G3L z=-0.5 / G3R z=+0.5)",
        project: suspendedProject,
      },
    ];
  }, [compareMode, project, suspendedProject]);

  const rightAnalysisResult = rightResult;

  const viewportProps = {
    project,
    result,
    selectedSection,
    selection,
    activeLoadCase,
    onSelectionChange,
    onActiveLoadCaseChange,
    visibility,
    scales: effectiveScales,
    selectedLoadCaseId,
    selectedEigenMode,
    selectedResponseSpectrumResult,
    fitRequest,
    cameraRequest,
    spacerAxisSwap,
    animationOptions,
    onInitializationError: handleInitializationError,
    timeHistoryNodeOverride,
    forceColorMode,
  };
  const gpuMode = getGpuModeLabel();

  const renderViewport = () => {
    if (compareMode) {
      return (
        <CompareShell
          slots={compareSlots}
          leftResult={result}
          rightResult={rightAnalysisResult}
          selectedSection={selectedSection}
          selection={selection}
          activeLoadCase={activeLoadCase}
          eigenModeNos={eigenModeNos}
          selectedEigenMode={selectedEigenMode}
          selectedResponseSpectrumResult={selectedResponseSpectrumResult}
          spacerAxisSwap={spacerAxisSwap}
          animationOptions={animationOptions}
          cameraSync={cameraSync}
          onSelectionChange={(_slotId, next) => onSelectionChange(next)}
          onActiveLoadCaseChange={onActiveLoadCaseChange}
          onSelectedEigenModeChange={onSelectedEigenModeChange}
          onSelectedResponseSpectrumResultChange={(value) => onSelectedResponseSpectrumResultChange(value ?? "SRSS")}
          onSpacerAxisSwapChange={setSpacerAxisSwap}
          onAnimationOptionsChange={setAnimationOptions}
          onInitializationError={() => undefined}
        />
      );
    }
    if (mode === "three") return <ThreeViewport {...viewportProps} />;
    return <Fallback2DViewport {...viewportProps} />;
  };

  const handleViewPanelToggle = useCallback(() => {
    onViewPanelToggle?.();
  }, [onViewPanelToggle]);

  const handleFit = useCallback(() => {
    setFitRequest((value) => value + 1);
    onFitRequest?.();
  }, [onFitRequest]);

  useEffect(() => {
    setFitRequest((value) => value + 1);
  }, [viewPanelOpen]);

  return (
    <main className="viewer-shell">
      <div className="viewer-header">
        <div>
          <h2>{ja.viewer.controlPanelTitle}</h2>
          <p>{statusText(selection, hasResult)}</p>
        </div>
        <div className="viewer-stats">
          <span>{ja.viewer.messages.displayMode(mode === "three" ? "3D" : ja.viewer.messages.fallback)}</span>
          <span>GPU: {gpuMode}</span>
          <span>{ja.viewer.messages.nodeCount(project.nodes.length)}</span>
          <span>{ja.viewer.messages.memberCount(project.members.length)}</span>
          <span>{ja.viewer.messages.supportCount(project.supports.length)}</span>
          <span>{ja.viewer.messages.loadCount(project.nodalLoads.length + project.memberLoads.length)}</span>
          {animationOptions.enabled ? <span>{ja.viewer.messages.animationOn}</span> : null}
        </div>
      </div>
      <section className={`viewer-body ${viewPanelOpen ? "" : "view-panel-closed"}`}>
        <div className="viewer-viewport-stack">
          {viewerError && (
            <div className="viewer-error-banner" role="alert">
              {viewerError.split("\n").map((line) => (
                <div key={line}>{line}</div>
              ))}
            </div>
          )}
          {renderViewport()}
        </div>
        {viewPanelOpen ? (
          <>
            <button
              type="button"
              className="drawer-toggle view-drawer-close"
              aria-label={ja.workspace.viewPanel.closeAriaLabel}
              aria-expanded={true}
              title={ja.workspace.viewPanel.closeLabel}
              data-testid="close-view-panel"
              onClick={handleViewPanelToggle}
            >
              <PanelRightClose size={16} />
            </button>
            <ViewerControls

            visibility={visibility}
            scales={scales}
            displaySize={displaySize}
            loadCaseIds={loadCaseIds.length > 0 ? loadCaseIds : [""]}
            selectedLoadCaseId={selectedLoadCaseId}
            eigenModeNos={eigenModeNos}
            selectedEigenMode={selectedEigenMode}
            responseSpectrumOptions={responseSpectrumOptions}
            selectedResponseSpectrumResult={selectedResponseSpectrumResult}
            hasResult={hasResult}
            spacerAxisSwap={spacerAxisSwap}
            animationOptions={animationOptions}
            compareMode={compareMode}
            cameraSync={cameraSync}
            forceColorMap={forceColorMap}
            forceColorComponent={forceColorComponent}
            forceColorValueType={forceColorValueType}
            forceColorRange={forceColorRange}
            onVisibilityChange={setVisibility}
            onScalesChange={setScales}
            onDisplaySizeChange={setDisplaySize}
            onDisplaySizeReset={() => setDisplaySize({ ...DEFAULT_VIEWER_DISPLAY_SIZE })}
            onLoadCaseChange={onActiveLoadCaseChange}
            onEigenModeChange={onSelectedEigenModeChange}
            onResponseSpectrumResultChange={(value: ResponseSpectrumSelection) =>
              onSelectedResponseSpectrumResultChange(value)
            }
            onSpacerAxisSwapChange={handleSpacerAxisSwapChange}
            onAnimationOptionsChange={handleAnimationOptionsChange}
            onCompareModeChange={handleCompareModeChange}
            onCameraSyncChange={handleCameraSyncChange}
            onForceColorMapChange={setForceColorMap}
            onForceColorComponentChange={setForceColorComponent}
            onForceColorValueTypeChange={setForceColorValueType}
              onFit={handleFit}
            onCameraPreset={runCameraPreset}

            />
          </>
        ) : (
          <button
            type="button"
            className="drawer-toggle view-drawer-open"
            aria-label={ja.workspace.viewPanel.openAriaLabel}
            aria-expanded={false}
            title={ja.workspace.viewPanel.openLabel}
            data-testid="open-view-panel"
            onClick={handleViewPanelToggle}
          >
            <PanelRightOpen size={16} />
          </button>
        )}
      </section>
    </main>
  );
}

function statusText(selection: ViewerSelection, hasResult: boolean): string {
  const typeLabel = selection
    ? selection.type === "node"
      ? ja.viewer.messages.nodeLabel
      : ja.viewer.messages.memberLabel
    : "";
  const selected = selection ? `${typeLabel} ${selection.id}` : ja.viewer.messages.unselected;
  const suffix = hasResult
    ? ja.viewer.messages.deformedShapeAvailable
    : ja.viewer.messages.inputModelShown;
  return `${selected} / ${suffix}`;
}

function getGpuModeLabel(): string {
  const maybeWindow = window as Window & {
    spacerDesktop?: { gpuMode?: string };
    desktop?: { gpuMode?: string };
  };
  return maybeWindow.spacerDesktop?.gpuMode ?? maybeWindow.desktop?.gpuMode ?? "browser";
}
