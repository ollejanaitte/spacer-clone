import { ArrowLeft, Download, Minus, Plus, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { ja } from "../../i18n/ja";
import { buildIntermediateResult } from "../core/pipeline/pipeline";
import type { LinerDrawingWorkspaceKind } from "../uiPreparation";
import {
  updateLinerCrossSlopeIntervals,
  updateLinerSelectedCrossSectionStation,
  type LinerDraft,
  type LinerDraftUpdate,
} from "../adapters/linerUiAdapter";
import { CrossfallIntervalEditor } from "../components/CrossfallIntervalEditor";
import {
  buildDrawingDocument,
  createCrossSectionDrawingBuilder,
  createDrawingSettingsFromDraft,
  createPlanDrawingBuilder,
  createProfileDrawingBuilder,
} from "../drawing";
import type { DrawingDocument } from "../drawing/model/document";
import { DrawingDocumentSvg } from "../drawing/rendering/DrawingDocumentSvg";
import { formatStationDisplay } from "../core/station/stationFormat";
import {
  canExportFormalDrawingDxf,
  downloadFormalDrawingDxf,
  exportFormalDrawingDxf,
  type FormalDrawingDxfKind,
} from "../dxf";

export type LinerFormalDrawingWorkspacePageProps = {
  kind: LinerDrawingWorkspaceKind;
  draft: LinerDraft;
  projectId?: string;
  onDraftChange?: (update: LinerDraftUpdate) => void;
  onClose: () => void;
  onBackToSetup: () => void;
  onNavigate: (kind: LinerDrawingWorkspaceKind) => void;
};

const ROUTE_LABELS: Record<LinerDrawingWorkspaceKind, string> = {
  plan: "平面線形図",
  profile: "縦断線形図",
  "cross-section": "横断図",
};

function resolveDiagnosticMessage(
  code: string,
  message: string,
): string {
  if (code === "LINER_CROSSFALL_MEASURED_GRID_PRECEDENCE") {
    return ja.liner.errors.crossfall_measured_grid_precedence;
  }
  if (message.startsWith("liner.errors.")) {
    const errorKey = message.replace("liner.errors.", "") as keyof typeof ja.liner.errors;
    return ja.liner.errors[errorKey] ?? message;
  }
  return message;
}

export function LinerFormalDrawingWorkspacePage({
  kind,
  draft,
  projectId,
  onDraftChange,
  onClose,
  onBackToSetup,
  onNavigate,
}: LinerFormalDrawingWorkspacePageProps) {
  const [zoom, setZoom] = useState(1);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  const [canvasWidthPx, setCanvasWidthPx] = useState(1366);
  const [exportMessage, setExportMessage] = useState<string | null>(null);
  const [exportBusy, setExportBusy] = useState(false);
  const canvasRef = useRef<HTMLElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const intermediate = useMemo(() => buildIntermediateResult(draft), [draft]);
  const settings = useMemo(() => {
    const next = createDrawingSettingsFromDraft(intermediate, draft.drawingSettings);
    return {
      ...next,
      selectedCrossSectionStation: draft.selectedCrossSectionStation,
    };
  }, [draft.drawingSettings, draft.selectedCrossSectionStation, intermediate]);
  const builder = useMemo(() => {
    if (kind === "plan") {
      return createPlanDrawingBuilder();
    }
    if (kind === "profile") {
      return createProfileDrawingBuilder();
    }
    return createCrossSectionDrawingBuilder(settings.selectedCrossSectionStation);
  }, [kind, settings.selectedCrossSectionStation]);
  const output = useMemo(() => builder.build({ result: intermediate, settings }), [builder, intermediate, settings]);
  const document = useMemo(() => buildDrawingDocument(output.sheet, settings, output.diagnostics), [output, settings]);

  const planDocument = useMemo(() => {
    if (kind === "plan") {
      return document;
    }
    const planOutput = createPlanDrawingBuilder().build({ result: intermediate, settings });
    return buildDrawingDocument(planOutput.sheet, settings, planOutput.diagnostics);
  }, [document, intermediate, kind, settings]);

  const profileDocument = useMemo(() => {
    if (kind === "profile") {
      return document;
    }
    const profileOutput = createProfileDrawingBuilder().build({ result: intermediate, settings });
    return buildDrawingDocument(profileOutput.sheet, settings, profileOutput.diagnostics);
  }, [document, intermediate, kind, settings]);

  const crossSectionDocument = useMemo(() => {
    if (kind === "cross-section") {
      return document;
    }
    const crossOutput = createCrossSectionDrawingBuilder(settings.selectedCrossSectionStation).build({
      result: intermediate,
      settings,
    });
    return buildDrawingDocument(crossOutput.sheet, settings, crossOutput.diagnostics);
  }, [document, intermediate, kind, settings]);

  const handleExportDxf = useCallback(
    (exportKind: FormalDrawingDxfKind, source: DrawingDocument) => {
      if (exportBusy) {
        return;
      }
      setExportBusy(true);
      try {
        if (!canExportFormalDrawingDxf(source)) {
          setExportMessage(ja.liner.formalDrawing.exportDxfDisabled);
          return;
        }
        const result = exportFormalDrawingDxf(exportKind, source, {
          projectId,
          timestamp: new Date(),
          sheetPresetId: "common",
        });
        if (result.entityCount === 0 || !result.dxf) {
          setExportMessage(ja.liner.formalDrawing.exportDxfError);
          return;
        }
        downloadFormalDrawingDxf(result);
        setExportMessage(ja.liner.formalDrawing.exportDxfSuccess(result.fileName));
      } catch {
        setExportMessage(ja.liner.formalDrawing.exportDxfError);
      } finally {
        setExportBusy(false);
      }
    },
    [exportBusy, projectId],
  );

  const measureFitZoom = useCallback(() => {
    const canvas = canvasRef.current;
    const content = contentRef.current;
    if (!canvas || !content) {
      return 1;
    }
    const canvasStyle = getComputedStyle(canvas);
    const padX = Number.parseFloat(canvasStyle.paddingLeft) + Number.parseFloat(canvasStyle.paddingRight);
    const padY = Number.parseFloat(canvasStyle.paddingTop) + Number.parseFloat(canvasStyle.paddingBottom);
    const availableWidth = Math.max(canvas.clientWidth - padX, 1);
    const availableHeight = Math.max(canvas.clientHeight - padY, 1);
    const contentWidth = content.offsetWidth;
    const contentHeight = content.offsetHeight;
    if (contentWidth <= 0 || contentHeight <= 0) {
      return 1;
    }
    return Math.min(availableWidth / contentWidth, availableHeight / contentHeight);
  }, []);

  const applyFitView = useCallback(() => {
    setZoom(measureFitZoom());
    setPanX(0);
    setPanY(0);
    if (canvasRef.current) {
      setCanvasWidthPx(canvasRef.current.clientWidth);
    }
  }, [measureFitZoom]);

  useLayoutEffect(() => {
    applyFitView();
  }, [applyFitView, document, kind]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || typeof ResizeObserver === "undefined") {
      return undefined;
    }
    const observer = new ResizeObserver(() => {
      applyFitView();
    });
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [applyFitView]);

  const pipelineDiagnostics = useMemo(
    () =>
      intermediate.diagnostics.filter(
        (diagnostic) => diagnostic.code === "LINER_CROSSFALL_MEASURED_GRID_PRECEDENCE",
      ),
    [intermediate.diagnostics],
  );

  const selectedStation = draft.selectedCrossSectionStation ?? intermediate.stations.entries[0]?.physicalDistance ?? 0;
  const selectedSection = useMemo(() => {
    if (intermediate.sections.length === 0) {
      return null;
    }
    return intermediate.sections.reduce((nearest, candidate) => {
      if (!nearest) {
        return candidate;
      }
      const nearestDistance = Math.abs(nearest.physicalDistance - selectedStation);
      const candidateDistance = Math.abs(candidate.physicalDistance - selectedStation);
      return candidateDistance < nearestDistance ? candidate : nearest;
    }, intermediate.sections[0] ?? null);
  }, [intermediate.sections, selectedStation]);

  return (
    <main className="liner-formal-workspace-page" data-testid="liner-formal-workspace-page">
      <header className="liner-formal-workspace-header">
        <div>
          <p className="liner-formal-workspace-kicker">{ja.liner.editor.title}</p>
          <h1>{ROUTE_LABELS[kind]}</h1>
          <p>{ja.liner.formalDrawing.lead}</p>
        </div>
        <div className="liner-formal-workspace-header-actions">
          <button type="button" onClick={onBackToSetup} data-testid="formal-drawing-back-to-setup">
            <ArrowLeft size={16} />
            {ja.liner.formalDrawing.backToSetup}
          </button>
          <button type="button" onClick={onClose} data-testid="formal-drawing-close">
            {ja.liner.formalDrawing.close}
          </button>
        </div>
      </header>

      <div className="liner-formal-workspace-tabs" role="tablist" aria-label={ja.liner.formalDrawing.routeTablistLabel}>
        {Object.entries(ROUTE_LABELS).map(([nextKind, label]) => {
          const selected = nextKind === kind;
          return (
            <button
              key={nextKind}
              type="button"
              role="tab"
              className={selected ? "liner-formal-workspace-tab active" : "liner-formal-workspace-tab"}
              aria-selected={selected}
              onClick={() => onNavigate(nextKind as LinerDrawingWorkspaceKind)}
            >
              {label}
            </button>
          );
        })}
      </div>

      <div className="liner-formal-workspace-layout">
        <aside className="liner-formal-workspace-sidebar">
          <section className="liner-formal-workspace-panel">
            <h2>{ja.liner.formalDrawing.drawingSettings}</h2>
            <p>{ja.liner.formalDrawing.selectedStationLabel(selectedStation)}</p>
            <label>
              <span>{ja.liner.formalDrawing.crossSectionDisplayStation}</span>
              <select
                value={String(selectedStation)}
                onChange={(event) => {
                  const value = Number(event.currentTarget.value);
                  onDraftChange?.((current) => updateLinerSelectedCrossSectionStation(current, value));
                }}
              >
                {intermediate.stations.entries.map((station) => (
                  <option key={station.entryId} value={station.physicalDistance}>
                    {formatStationDisplay(station.displayedStation)}
                  </option>
                ))}
              </select>
            </label>
          </section>

          <CrossfallIntervalEditor
            draft={draft}
            intervals={draft.crossSlopeIntervals ?? []}
            layout="fullWidth"
            onIntervalsChange={(nextIntervals) => {
              onDraftChange?.((current) => updateLinerCrossSlopeIntervals(current, nextIntervals));
            }}
          />

          <section className="liner-formal-workspace-panel">
            <h2>{ja.liner.formalDrawing.displayControls}</h2>
            <div className="liner-formal-workspace-toolbar">
              <button
                type="button"
                aria-label={ja.liner.formalDrawing.zoomOut}
                onClick={() => setZoom((value) => Math.max(0.5, value - 0.1))}
              >
                <Minus size={14} />
                {ja.liner.formalDrawing.zoomOut}
              </button>
              <button
                type="button"
                aria-label={ja.liner.formalDrawing.zoomIn}
                onClick={() => setZoom((value) => Math.min(3, value + 0.1))}
              >
                <Plus size={14} />
                {ja.liner.formalDrawing.zoomIn}
              </button>
              <button
                type="button"
                aria-label={ja.liner.formalDrawing.fitView}
                onClick={applyFitView}
              >
                <RefreshCw size={14} />
                {ja.liner.formalDrawing.fitView}
              </button>
            </div>
          </section>

          <section className="liner-formal-workspace-panel" aria-labelledby="formal-drawing-dxf-export-title">
            <h2 id="formal-drawing-dxf-export-title">{ja.liner.formalDrawing.exportDxfSectionTitle}</h2>
            <div className="liner-formal-workspace-dxf-actions">
              <button
                type="button"
                data-testid="formal-drawing-export-plan-dxf"
                disabled={exportBusy || !canExportFormalDrawingDxf(planDocument)}
                onClick={() => handleExportDxf("plan", planDocument)}
              >
                <Download size={14} />
                {ja.liner.formalDrawing.exportPlanDxf}
              </button>
              <button
                type="button"
                data-testid="formal-drawing-export-profile-dxf"
                disabled={exportBusy || !canExportFormalDrawingDxf(profileDocument)}
                onClick={() => handleExportDxf("profile-band", profileDocument)}
              >
                <Download size={14} />
                {ja.liner.formalDrawing.exportProfileDxf}
              </button>
              <button
                type="button"
                data-testid="formal-drawing-export-cross-section-dxf"
                disabled={exportBusy || !canExportFormalDrawingDxf(crossSectionDocument)}
                onClick={() => handleExportDxf("cross-section", crossSectionDocument)}
              >
                <Download size={14} />
                {ja.liner.formalDrawing.exportCrossSectionDxf}
              </button>
            </div>
            {exportMessage ? (
              <p data-testid="formal-drawing-export-message">{exportMessage}</p>
            ) : null}
          </section>

          <section className="liner-formal-workspace-panel" aria-labelledby="formal-drawing-diagnostics-title">
            <h2 id="formal-drawing-diagnostics-title">{ja.liner.formalDrawing.diagnosticsTitle}</h2>
            {output.diagnostics.length === 0 && pipelineDiagnostics.length === 0 ? (
              <p data-testid="formal-drawing-diagnostics-empty">{ja.liner.formalDrawing.diagnosticsEmpty}</p>
            ) : (
              <ul data-testid="formal-drawing-diagnostics-list">
                {pipelineDiagnostics.map((diagnostic, index) => (
                  <li key={`pipeline-${diagnostic.code}-${index}`}>
                    {resolveDiagnosticMessage(diagnostic.code, diagnostic.messageKey ?? diagnostic.detail ?? diagnostic.code)}
                  </li>
                ))}
                {output.diagnostics.map((diagnostic, index) => (
                  <li key={`${diagnostic.code}-${index}`}>
                    {resolveDiagnosticMessage(diagnostic.code, diagnostic.message)}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </aside>

        <section
          ref={canvasRef}
          className="liner-formal-workspace-canvas"
          aria-label={ROUTE_LABELS[kind]}
        >
          <div
            ref={contentRef}
            className="liner-formal-workspace-canvas-transform"
            style={{ transform: `translate(${panX}px, ${panY}px) scale(${zoom})` }}
          >
            <DrawingDocumentSvg
              document={document}
              screenScale={zoom}
              viewportWidthPx={canvasWidthPx}
            />
          </div>
        </section>
      </div>

      <section className="liner-formal-workspace-summary">
        <h2>{ja.liner.formalDrawing.sourceSummaryTitle}</h2>
        <dl>
          <div>
            <dt>{ja.liner.preview.totalLength}</dt>
            <dd>{intermediate.horizontal.totalLength.toFixed(2)} m</dd>
          </div>
          <div>
            <dt>{ja.liner.preview.stations}</dt>
            <dd>{intermediate.stations.entries.length}</dd>
          </div>
          <div>
            <dt>{ja.liner.editor.crossfallIntervalSection}</dt>
            <dd>
              {selectedSection
                ? crossfallModeLabel(selectedSection.crossfall.mode)
                : ja.liner.formalDrawing.bandRows.unavailable}
            </dd>
          </div>
        </dl>
      </section>
    </main>
  );
}

function crossfallModeLabel(mode: string): string {
  if (mode in ja.liner.fields.crossfallModes) {
    return ja.liner.fields.crossfallModes[mode as keyof typeof ja.liner.fields.crossfallModes];
  }
  return ja.liner.formalDrawing.bandRows.unavailable;
}
