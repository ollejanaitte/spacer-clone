import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PanelRightClose, PanelRightOpen } from "lucide-react";
import { ja } from "../i18n/ja";
import {
  buildResponseSpectrumViewModel,
  buildResultViewModel,
  hasResponseSpectrumResult,
  type MemberSectionForceComponent,
  type ResponseSpectrumSelection,
} from "../results/resultViewModel";
import { extractLinearStaticAnalysisResultFromResource } from "../results/if3ResultViewModel";
import {
  evaluateIf3ResultGate,
  resolveTransientIf3AvailabilityStatus,
} from "../results/if3ResultGate";
import type { AnalysisResult, ProjectModel } from "../types";
import { Fallback2DViewport } from "./Fallback2DViewport";
import { createSuspendedDeckProject } from "../data/defaultProject";
import {
  isLinerDerivedProject,
  loadStoredSpacerAxisSwap,
  persistSpacerAxisSwap,
  resolveInitialSpacerAxisSwap,
  resolveViewerDisplayCoordinatePolicy,
  type SpacerAxisSwap,
} from "./coordinateTransform";
import { DEFAULT_ANIMATION_OPTIONS, type AnimationOptions } from "./animation";
import { defaultScales, defaultVisibility, type CameraPreset, type Viewer3DProps, type ViewerMode, type ViewerScales, type ViewerSelection, type ViewerVisibility } from "./types";
import { CompareShell, type CompareSlotDescriptor } from "./CompareShell";
import { ThreeViewport } from "./ThreeViewport";
import { ViewerControls } from "./ViewerControls";
import { ViewerDiagnostics } from "./ViewerDiagnostics";
import {
  DEFAULT_VIEWER_DISPLAY_SIZE,
  loadViewerDisplaySize,
  persistViewerDisplaySize,
  type ViewerDisplaySizeSettings,
} from "./settings/displaySize";
import type { ForceColorModeData } from "./memberForceColorMap";
import { type ForceColorComponent, type ForceColorValueType, computeMemberForceColorValues, computeForceColorRange } from "./memberForceColorMap";
import {
  classifyFallbackReason,
  createUnavailableWebGlDiagnostics,
  deriveApolloVisualizationCounts,
  describeFallbackReason,
  describeViewerMode,
  normalizeViewerGpuMode,
} from "./runtimeDiagnostics";
import type { ViewerRuntimeDiagnostics } from "./types";

export const webglFallbackMessage =
  ja.viewer.messages.webglInitFailed + "\n" +
  ja.viewer.messages.fallback2DSwitched + "\n" +
  ja.viewer.messages.electronGpuHint + "\n" +
  ja.viewer.messages.electronGpuLastResort;

export function Viewer3D({
  project,
  apolloVisualizationModel = null,
  apolloSelectionKeys = [],
  apolloValidationHighlight = null,
  result,
  if3Result = null,
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
  onVisibilityChange,
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
  const [viewportEpoch, setViewportEpoch] = useState(0);
  const [diagnosticsOpen, setDiagnosticsOpen] = useState(false);
  const [fitRequest, setFitRequest] = useState(0);
  const [cameraRequest, setCameraRequest] = useState<CameraPreset | null>(null);
  const isLinerDerived = isLinerDerivedProject(project);
  const viewerDisplayPolicy = resolveViewerDisplayCoordinatePolicy(isLinerDerived);
  const [spacerAxisSwap, setSpacerAxisSwap] = useState<SpacerAxisSwap>(() =>
    resolveInitialSpacerAxisSwap(isLinerDerived),
  );
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
  const if3ViewerGate = useMemo(
    () =>
      if3Result == null
        ? null
        : evaluateIf3ResultGate({
            resource: if3Result,
            availabilityStatus: resolveTransientIf3AvailabilityStatus(if3Result),
          }),
    [if3Result],
  );
  const authoritativeOverlayResult = useMemo(() => {
    if (if3Result == null || if3ViewerGate?.authoritativeOutputAllowed !== true) {
      return null;
    }
    return extractLinearStaticAnalysisResultFromResource(if3Result);
  }, [if3Result, if3ViewerGate]);
  const overlayResult = authoritativeOverlayResult;
  const forceColorRange = useMemo(() => {
    if (!forceColorMap || !overlayResult) return { min: 0, max: 0 };
    const values = computeMemberForceColorValues(project, overlayResult, selectedLoadCaseId, forceColorComponent, forceColorValueType, selectedResponseSpectrumResult);
    return computeForceColorRange(values);
  }, [forceColorMap, overlayResult, project, selectedLoadCaseId, forceColorComponent, forceColorValueType, selectedResponseSpectrumResult]);
  const eigenModeNos = useMemo(
    () => overlayResult?.eigenResult?.modes.map((mode) => mode.modeNo) ?? [],
    [overlayResult],
  );
  const responseSpectrumViewModel = useMemo(
    () => buildResponseSpectrumViewModel(overlayResult, selectedResponseSpectrumResult),
    [overlayResult, selectedResponseSpectrumResult],
  );
  const responseSpectrumOptions = responseSpectrumViewModel?.modeOptions ?? [];
  const apolloCounts = useMemo(
    () => deriveApolloVisualizationCounts(apolloVisualizationModel),
    [apolloVisualizationModel],
  );
  const [viewportDiagnostics, setViewportDiagnostics] = useState<
    Pick<ViewerRuntimeDiagnostics, "viewerMode" | "fallbackReason" | "webgl" | "camera" | "currentViewPreset">
  >({
    viewerMode: "three",
    fallbackReason: "none",
    webgl: createUnavailableWebGlDiagnostics(),
    camera: null,
    currentViewPreset: "iso",
  });
  const hasResult = Boolean(
    overlayResult &&
      overlayResult.errors.length === 0 &&
      (overlayResult.displacements.length > 0 || eigenModeNos.length > 0 || hasResponseSpectrumResult(overlayResult)),
  );
  const resultDiagramFeedback = useMemo(
    () => buildResultDiagramFeedback(overlayResult, selectedLoadCaseId, selectedResponseSpectrumResult, visibility),
    [overlayResult, selectedLoadCaseId, selectedResponseSpectrumResult, visibility],
  );

  useEffect(() => {
    if (loadStoredSpacerAxisSwap() !== null) return;
    setSpacerAxisSwap(isLinerDerived ? "on" : "off");
  }, [project.project.id, isLinerDerived]);

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
      setDiagnosticsOpen(true);
      setViewportDiagnostics((current) => ({
        ...current,
        viewerMode: "fallback2d",
        fallbackReason: "webgl-init-failed",
      }));
      onViewerError?.(message);
    },
    [onViewerError],
  );

  const handleRuntimeDiagnosticsChange = useCallback(
    (
      diagnostics: Pick<
        ViewerRuntimeDiagnostics,
        "viewerMode" | "fallbackReason" | "webgl" | "camera" | "currentViewPreset"
      >,
    ) => {
      setViewportDiagnostics(diagnostics);
      setMode((current) => (current === "fallback2d" ? current : diagnostics.viewerMode));
      if (diagnostics.viewerMode !== "three") {
        setDiagnosticsOpen(true);
      }
    },
    [],
  );

  const handleSpacerAxisSwapChange = useCallback((next: SpacerAxisSwap) => {
    setSpacerAxisSwap(next);
    persistSpacerAxisSwap(next);
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
    apolloVisualizationModel,
    apolloSelectionKeys,
    apolloValidationHighlight,
    result: overlayResult,
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
    viewerDisplayPolicy,
    animationOptions,
    onInitializationError: handleInitializationError,
    onRuntimeDiagnosticsChange: handleRuntimeDiagnosticsChange,
    timeHistoryNodeOverride,
    forceColorMode,
  };
  const gpuMode = getGpuModeLabel();
  const appVersion = getAppVersionLabel();
  const fallbackReason = classifyFallbackReason(mode, viewportDiagnostics.fallbackReason);
  const diagnostics: ViewerRuntimeDiagnostics = {
    viewerMode: mode,
    fallbackReason,
    webgl: viewportDiagnostics.webgl,
    camera: viewportDiagnostics.camera,
    gpuMode,
    appVersion,
    currentViewPreset: viewportDiagnostics.currentViewPreset,
    apolloCounts,
    visibility,
  };

  const renderViewport = () => {
    if (compareMode) {
      return (
        <CompareShell
          slots={compareSlots}
          leftResult={overlayResult}
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
          onSpacerAxisSwapChange={handleSpacerAxisSwapChange}
          onAnimationOptionsChange={setAnimationOptions}
          onInitializationError={() => undefined}
        />
      );
    }
    if (mode !== "fallback2d") return <ThreeViewport key={viewportEpoch} {...viewportProps} />;
    return <Fallback2DViewport {...viewportProps} />;
  };

  const handleViewPanelToggle = useCallback(() => {
    onViewPanelToggle?.();
  }, [onViewPanelToggle]);

  const handleFit = useCallback(() => {
    setFitRequest((value) => value + 1);
    onFitRequest?.();
  }, [onFitRequest]);

  const handleRetry3D = useCallback(() => {
    setMode("three");
    setViewerError(null);
    setViewportDiagnostics((current) => ({
      ...current,
      viewerMode: "three",
      fallbackReason: "none",
    }));
    setViewportEpoch((value) => value + 1);
  }, []);

  const handleDiagnosticsToggle = useCallback(() => {
    setDiagnosticsOpen((current) => !current);
  }, []);

  const handleCompatDiagnosticsOpen = useCallback(() => {
    if (!viewPanelOpen) {
      onViewPanelToggle?.();
      setDiagnosticsOpen(true);
      return;
    }
    setDiagnosticsOpen((current) => !current);
  }, [onViewPanelToggle, viewPanelOpen]);

  useEffect(() => {
    setFitRequest((value) => value + 1);
  }, [viewPanelOpen]);

  useEffect(() => {
    onVisibilityChange?.(visibility);
  }, [onVisibilityChange, visibility]);

  return (
    <main className="viewer-shell">
      <div className="viewer-header">
        <div>
          <h2>{ja.viewer.controlPanelTitle}</h2>
          <p>{statusText(selection, hasResult)}</p>
        </div>
        <div className="viewer-stats">
          <span>{ja.viewer.messages.displayMode(mode === "three" ? "3D" : describeViewerMode(mode))}</span>
          <span>GPU: {gpuMode}</span>
          <span>WebGL: {diagnostics.webgl.available ? "available" : "Unavailable"}</span>
          <span>{ja.viewer.messages.nodeCount(project.nodes.length)}</span>
          <span>{ja.viewer.messages.memberCount(project.members.length)}</span>
          <span>{ja.viewer.messages.supportCount(project.supports.length)}</span>
          <span>{ja.viewer.messages.loadCount(project.nodalLoads.length + project.memberLoads.length)}</span>
          {apolloCounts ? <span>Apollo Solid: {apolloCounts.solidCount}</span> : null}
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
          {mode !== "three" ? (
            <div className="viewer-compat-banner" role="status" data-testid="viewer-compat-banner">
              <strong>3Dソリッド表示を利用できないため、互換表示モードで表示しています。</strong>
              <div>GPUまたはWebGLの設定を確認してください。</div>
              <div>現在の表示: {describeViewerMode(mode)}</div>
              <div>原因: {describeFallbackReason(fallbackReason)}</div>
              {apolloCounts ? <div>ソリッドデータ: {apolloCounts.solidCount}件</div> : null}
              <div className="viewer-compat-actions">
                <button type="button" data-testid="viewer-retry-3d" onClick={handleRetry3D}>
                  3Dを再試行
                </button>
                <button type="button" data-testid="viewer-open-diagnostics" onClick={handleCompatDiagnosticsOpen}>
                  診断を{diagnosticsOpen ? "閉じる" : "開く"}
                </button>
              </div>
            </div>
          ) : null}
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
            apolloView={apolloVisualizationModel != null}
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
            resultDiagramFeedback={resultDiagramFeedback}
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
            spacerAxisSwapHint={isLinerDerived ? ja.viewer.controls.spacerAxisSwapLinerHint : undefined}
            onAnimationOptionsChange={handleAnimationOptionsChange}
            onCompareModeChange={handleCompareModeChange}
            onCameraSyncChange={handleCameraSyncChange}
            onForceColorMapChange={setForceColorMap}
            onForceColorComponentChange={setForceColorComponent}
            onForceColorValueTypeChange={setForceColorValueType}
            onFit={handleFit}
            onCameraPreset={runCameraPreset}
            />
            <ViewerDiagnostics
              diagnostics={diagnostics}
              open={diagnosticsOpen}
              onToggle={handleDiagnosticsToggle}
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
      : selection.type === "member"
        ? ja.viewer.messages.memberLabel
        : "Support"
    : "";
  const selected = selection ? `${typeLabel} ${selection.id}` : ja.viewer.messages.unselected;
  const suffix = hasResult
    ? ja.viewer.messages.deformedShapeAvailable
    : ja.viewer.messages.inputModelShown;
  return `${selected} / ${suffix}`;
}

function buildResultDiagramFeedback(
  result: AnalysisResult | null,
  selectedLoadCaseId: string,
  selectedResponseSpectrumResult: ResponseSpectrumSelection,
  visibility: ViewerVisibility,
): string[] {
  const selectedComponents: MemberSectionForceComponent[] = [
    visibility.axialForce ? "N" : null,
    visibility.shearQy ? "Qy" : null,
    visibility.shearQz ? "Qz" : null,
    visibility.momentMy ? "My" : null,
    visibility.momentMz ? "Mz" : null,
  ].filter((component): component is MemberSectionForceComponent => Boolean(component));
  if (selectedComponents.length === 0) return [];

  const viewModel =
    buildResponseSpectrumViewModel(result, selectedResponseSpectrumResult) ??
    buildResultViewModel(result, selectedLoadCaseId);
  if (!viewModel) return [];

  const hasZeroVisibleComponent = selectedComponents.some((component) => {
    const values = viewModel.memberForces.items
      .filter((force) => force.component === component)
      .flatMap((force) => force.stations.map((station) => Math.abs(station.value)));
    return Math.max(...values, 0) <= 1e-12;
  });

  return hasZeroVisibleComponent
    ? [
        ja.viewer.controls.zeroForceComponentMessage,
        ja.viewer.controls.forceComponentOverlapMessage,
      ]
    : [];
}

function getGpuModeLabel() {
  const maybeWindow = window as Window & {
    spacerDesktop?: { gpuMode?: string };
    desktop?: { gpuMode?: string };
  };
  return normalizeViewerGpuMode(maybeWindow.spacerDesktop?.gpuMode ?? maybeWindow.desktop?.gpuMode ?? "browser");
}

function getAppVersionLabel(): string {
  const maybeWindow = window as Window & {
    spacerDesktop?: { appVersion?: string };
    desktop?: { appVersion?: string };
  };
  return maybeWindow.spacerDesktop?.appVersion ?? maybeWindow.desktop?.appVersion ?? "Unavailable";
}
