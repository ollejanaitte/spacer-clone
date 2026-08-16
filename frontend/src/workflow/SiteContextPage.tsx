import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ja, type JaDictionary } from "../i18n/ja";
import type { CanonicalWorkflowStep } from "./canonicalWorkflow";
import { isWorkflowStepEntryEnabled } from "./canonicalWorkflow";
import { CanonicalWorkflowNav } from "./CanonicalWorkflowNav";
import type { SiteContextImportAdapter, SiteContextImportInput, SiteContextImportReport } from "../next/integration/siteContext/adapterContract";
import { createSiteContextImportAdapter, mapSiteContextPackageToProject } from "../next/integration/siteContext/importAdapter";
import type { Project } from "../next/project/schema";
import {
  GUJO_BOUNDS_WGS84,
  buildGujoSampleAsset,
  buildGujoSampleHeightfield,
  buildGujoSampleTerrainDocument,
} from "../terrain/gujoSample";
import { fetchDemTiles, tileRangeForBBox, tileResolutionMeters, type GsiDemResult, type TileFetcher } from "../terrain/gsi/gsi";
import { NO_DATA, type Heightfield } from "../terrain/heightfield";
import { persistTerrain } from "../terrain/terrainPersistence";
import { buildSyntheticSiteContextPackage } from "./samplePackage";
import styles from "./SiteContextPage.module.css";

export interface TerrainPreview {
  readonly terrainId: string;
  readonly width: number;
  readonly height: number;
  readonly cellSize: number;
  readonly minElevation: number;
  readonly maxElevation: number;
  readonly noDataCount: number;
  readonly tileCount: number;
  readonly sourceName: string;
  readonly bounds: { minX: number; minY: number; maxX: number; maxY: number };
}

export interface SiteContextPageProps {
  readonly project: Project;
  readonly onProjectChange: (next: Project) => void;
  readonly onBackToApp: () => void;
  readonly onNavigateStep: (step: CanonicalWorkflowStep) => void;
  readonly onOpenRoadWorkflow: () => void;
  readonly adapter?: SiteContextImportAdapter;
  readonly packageInput?: SiteContextImportInput;
  readonly demFetcher?: TileFetcher;
}

type ImportStatus = "idle" | "inspecting" | "confirmed" | "importing" | "done" | "error" | "cancelled";
type DemStatus = "idle" | "fetching" | "done" | "error" | "cancelled";
type DemPreset = "dem5a" | "dem5b" | "dem10b";

const DEM_ZOOM: Record<DemPreset, number> = { dem5a: 15, dem5b: 15, dem10b: 14 };

function computeHeightfieldPreview(hf: Heightfield): Omit<TerrainPreview, "tileCount" | "sourceName"> {
  let minElevation = Infinity;
  let maxElevation = -Infinity;
  let noDataCount = 0;
  for (let k = 0; k < hf.data.length; k++) {
    const v = hf.data[k];
    if (v === NO_DATA) {
      noDataCount += 1;
    } else {
      if (v < minElevation) minElevation = v;
      if (v > maxElevation) maxElevation = v;
    }
  }
  const bounds = hf.bounds();
  return {
    terrainId: "",
    width: hf.width,
    height: hf.height,
    cellSize: hf.cellSize,
    minElevation: minElevation === Infinity ? 0 : minElevation,
    maxElevation: maxElevation === -Infinity ? 0 : maxElevation,
    noDataCount,
    bounds: { minX: bounds.minX, minY: bounds.minY, maxX: bounds.maxX, maxY: bounds.maxY },
  };
}

function computeDemPreview(result: GsiDemResult): Omit<TerrainPreview, "tileCount" | "sourceName"> {
  let minElevation = Infinity;
  let maxElevation = -Infinity;
  let noDataCount = 0;
  for (let k = 0; k < result.data.length; k++) {
    const v = result.data[k];
    if (v === NO_DATA) {
      noDataCount += 1;
    } else {
      if (v < minElevation) minElevation = v;
      if (v > maxElevation) maxElevation = v;
    }
  }
  return {
    terrainId: "",
    width: result.width,
    height: result.height,
    cellSize: result.cellSize,
    minElevation: minElevation === Infinity ? 0 : minElevation,
    maxElevation: maxElevation === -Infinity ? 0 : maxElevation,
    noDataCount,
    bounds: { minX: 0, minY: 0, maxX: result.width * result.cellSize, maxY: result.height * result.cellSize },
  };
}

export function SiteContextPage({
  project,
  onProjectChange,
  onBackToApp,
  onNavigateStep,
  onOpenRoadWorkflow,
  adapter,
  packageInput,
  demFetcher,
}: SiteContextPageProps) {
  const text = ja.workflow.siteContextPage;
  const importAdapter = useMemo(() => adapter ?? createSiteContextImportAdapter(), [adapter]);
  const inputPackage = useMemo(() => packageInput ?? buildSyntheticSiteContextPackage(), [packageInput]);

  const [importStatus, setImportStatus] = useState<ImportStatus>("idle");
  const [importReport, setImportReport] = useState<SiteContextImportReport | null>(null);
  const [importError, setImportError] = useState<{ code: string; message: string } | null>(null);
  const importTokenRef = useRef(0);

  const [demStatus, setDemStatus] = useState<DemStatus>("idle");
  const [demPreset, setDemPreset] = useState<DemPreset>("dem5a");
  const [demProgress, setDemProgress] = useState<{ loaded: number; total: number }>({ loaded: 0, total: 0 });
  const [demError, setDemError] = useState<string | null>(null);
  const demAbortRef = useRef<AbortController | null>(null);

  const [preview, setPreview] = useState<TerrainPreview | null>(null);
  const [previewNote, setPreviewNote] = useState<string | null>(null);
  const [sampleLoading, setSampleLoading] = useState(false);

  useEffect(() => {
    return () => {
      demAbortRef.current?.abort();
    };
  }, []);

  const handleNavigateStep = useCallback(
    (step: CanonicalWorkflowStep) => {
      if (!isWorkflowStepEntryEnabled(step)) return;
      onNavigateStep(step);
    },
    [onNavigateStep],
  );

  const runInspect = useCallback(async () => {
    const token = ++importTokenRef.current;
    setImportStatus("inspecting");
    setImportError(null);
    setImportReport(null);
    try {
      const result = await importAdapter.inspect(inputPackage);
      if (token !== importTokenRef.current) return;
      if (result.ok) {
        setImportReport(result.report);
        setImportStatus("confirmed");
      } else {
        setImportError({ code: result.errorCode, message: result.message });
        setImportStatus("error");
      }
    } catch (err) {
      if (token !== importTokenRef.current) return;
      setImportError({
        code: "SC-ERR-ADAPTER-EXCEPTION",
        message: err instanceof Error ? err.message : String(err),
      });
      setImportStatus("error");
    }
  }, [importAdapter, inputPackage]);

  const runImport = useCallback(async () => {
    const token = ++importTokenRef.current;
    setImportStatus("importing");
    setImportError(null);
    try {
      const result = await importAdapter.import(inputPackage);
      if (token !== importTokenRef.current) return;
      if (!result.ok) {
        setImportError({ code: result.errorCode, message: result.message });
        setImportStatus("error");
        return;
      }
      const mapped = await mapSiteContextPackageToProject(inputPackage);
      if (token !== importTokenRef.current) return;
      onProjectChange(mapped);
      setImportReport(result.report);
      setImportStatus("done");
    } catch (err) {
      if (token !== importTokenRef.current) return;
      setImportError({
        code: "SC-ERR-ADAPTER-EXCEPTION",
        message: err instanceof Error ? err.message : String(err),
      });
      setImportStatus("error");
    }
  }, [importAdapter, inputPackage, onProjectChange]);

  const cancelImport = useCallback(() => {
    importTokenRef.current += 1;
    setImportStatus("cancelled");
  }, []);

  const resetImport = useCallback(() => {
    importTokenRef.current += 1;
    setImportStatus("idle");
    setImportReport(null);
    setImportError(null);
  }, []);

  const runDemFetch = useCallback(async () => {
    const controller = new AbortController();
    demAbortRef.current = controller;
    const zoom = DEM_ZOOM[demPreset];
    let total = 0;
    try {
      total = (() => {
        const range = tileRangeForBBox(GUJO_BOUNDS_WGS84.lonMin, GUJO_BOUNDS_WGS84.latMin, GUJO_BOUNDS_WGS84.lonMax, GUJO_BOUNDS_WGS84.latMax, zoom);
        return (range.xMax - range.xMin + 1) * (range.yMax - range.yMin + 1);
      })();
    } catch {
      setDemStatus("error");
      setDemError(text.demErrorGeneric.replace("{message}", "GSI-EMPTY-RANGE"));
      return;
    }
    setDemStatus("fetching");
    setDemProgress({ loaded: 0, total });
    setDemError(null);
    setPreview(null);
    const baseFetcher = demFetcher;
    const fetcher: TileFetcher = async (url, signal) => {
      const bytes = await (baseFetcher ?? fetchTileBytes)(url, signal ?? controller.signal);
      setDemProgress((current) => ({ ...current, loaded: current.loaded + 1 }));
      return bytes;
    };
    try {
      const result = await fetchDemTiles({
        bbox: GUJO_BOUNDS_WGS84,
        zoom,
        preferred: demPreset,
        fetcher,
        signal: controller.signal,
      });
      if (controller.signal.aborted) {
        setDemStatus("cancelled");
        return;
      }
      const base = computeDemPreview(result);
      setPreview({
        ...base,
        terrainId: `dem-gujo-${demPreset}`,
        tileCount: result.tiles.length,
        sourceName: `GSI ${demPreset}`,
      });
      setDemStatus("done");
    } catch (err) {
      if (controller.signal.aborted) {
        setDemStatus("cancelled");
        return;
      }
      const message = err instanceof Error ? err.message : String(err);
      setDemError(
        message.startsWith("GSI-TOO-MANY-TILES")
          ? text.demErrorGeneric.replace("{message}", message)
          : text.demErrorGeneric.replace("{message}", message),
      );
      setDemStatus("error");
    } finally {
      if (demAbortRef.current === controller) {
        demAbortRef.current = null;
      }
    }
  }, [demPreset, demFetcher, text.demErrorGeneric]);

  const cancelDemFetch = useCallback(() => {
    demAbortRef.current?.abort();
    setDemStatus("cancelled");
  }, []);

  const loadGujoSample = useCallback(() => {
    setSampleLoading(true);
    setPreviewNote(null);
    window.setTimeout(() => {
      try {
        const hf = buildGujoSampleHeightfield();
        const doc = buildGujoSampleTerrainDocument();
        const next = persistTerrain(project, doc, buildGujoSampleAsset());
        const base = computeHeightfieldPreview(hf);
        setPreview({
          ...base,
          terrainId: doc.terrainId,
          tileCount: 36,
          sourceName: text.previewSource,
        });
        setPreviewNote(text.gujoSampleDone);
        onProjectChange(next);
        setDemStatus("done");
      } finally {
        setSampleLoading(false);
      }
    }, 0);
  }, [project, onProjectChange, text.previewSource, text.gujoSampleDone]);

  const progressPercent =
    demStatus === "fetching" && demProgress.total > 0
      ? Math.min(100, Math.round((demProgress.loaded / demProgress.total) * 100))
      : demStatus === "done"
        ? 100
        : 0;

  return (
    <div className={styles.page} data-testid="site-context-page">
      <header className={styles.header}>
        <button type="button" className={styles.backButton} onClick={onBackToApp} data-testid="site-context-back">
          {ja.workflow.nav.backToApp}
        </button>
        <h1 className={styles.title}>{text.title}</h1>
      </header>
      <p className={styles.lead}>{text.lead}</p>

      <section className={styles.projectCard} data-testid="site-context-project-card">
        <span className={styles.projectLabel}>{text.projectLabel}</span>
        <span className={styles.projectName}>{project.name}</span>
        <span className={styles.projectId}>{project.projectId}</span>
      </section>

      <section className={styles.body}>
        <CanonicalWorkflowNav currentStepId="siteContext" onNavigateStep={handleNavigateStep} />

        <div className={styles.panels}>
          <section className={styles.panel} aria-label={text.importSectionTitle} data-testid="site-context-import-panel">
            <h2 className={styles.panelTitle}>{text.importSectionTitle}</h2>
            <p className={styles.panelLead}>{text.importSectionLead}</p>
            <p className={styles.packageHint}>{text.noPackageHint}</p>

            <div className={styles.statusArea} data-testid="site-context-import-status">
              {importStatus === "inspecting" && <span className={styles.statusBusy}>{text.inspecting}</span>}
              {importStatus === "importing" && <span className={styles.statusBusy}>{text.importing}</span>}
              {importStatus === "cancelled" && <span className={styles.statusMuted}>{text.cancelled}</span>}
            </div>

            {importStatus === "idle" || importStatus === "error" || importStatus === "cancelled" ? (
              <button type="button" className={styles.primaryButton} onClick={() => void runInspect()} data-testid="site-context-inspect">
                {text.inspectButton}
              </button>
            ) : null}

            {importStatus === "confirmed" || importStatus === "importing" ? (
              <div className={styles.buttonRow}>
                <button type="button" className={styles.primaryButton} onClick={() => void runImport()} data-testid="site-context-import-confirm">
                  {text.importButton}
                </button>
                <button type="button" className={styles.secondaryButton} onClick={cancelImport} data-testid="site-context-import-cancel">
                  {text.cancelButton}
                </button>
              </div>
            ) : null}

            {importReport !== null && importStatus === "confirmed" && (
              <ImportReportView report={importReport} text={text} />
            )}

            {importStatus === "error" && importError !== null && (
              <div className={styles.errorBox} role="alert" data-testid="site-context-import-error">
                <h3 className={styles.errorTitle}>{text.importErrorTitle}</h3>
                <p className={styles.errorRow}>
                  <strong>{text.errorCode}:</strong> {importError.code}
                </p>
                <p className={styles.errorRow}>
                  <strong>{text.errorMessage}:</strong> {importError.message}
                </p>
                <button type="button" className={styles.secondaryButton} onClick={resetImport} data-testid="site-context-import-retry">
                  {text.retryButton}
                </button>
              </div>
            )}

            {importStatus === "done" && importReport !== null && (
              <div className={styles.doneBox} data-testid="site-context-import-done">
                <p className={styles.doneText}>{text.importOk}</p>
                <p className={styles.doneRow}>
                  <strong>{text.projectNameLabel}:</strong> {importReport.projectName}
                </p>
                <p className={styles.doneRow}>
                  <strong>{text.projectIdLabel}:</strong> {importReport.projectId}
                </p>
                <button type="button" className={styles.secondaryButton} onClick={resetImport} data-testid="site-context-import-close">
                  {text.closeResultButton}
                </button>
              </div>
            )}
          </section>

          <section className={styles.panel} aria-label={text.demSectionTitle} data-testid="site-context-dem-panel">
            <h2 className={styles.panelTitle}>{text.demSectionTitle}</h2>
            <p className={styles.panelLead}>{text.demSectionLead}</p>

            <div className={styles.formRow}>
              <label className={styles.fieldLabel}>{text.demPresetLabel}</label>
              <select
                className={styles.select}
                value={demPreset}
                onChange={(e) => setDemPreset(e.target.value as DemPreset)}
                disabled={demStatus === "fetching"}
                data-testid="site-context-dem-preset"
              >
                <option value="dem5a">{text.demPreset5a}</option>
                <option value="dem5b">{text.demPreset5b}</option>
                <option value="dem10b">{text.demPreset10b}</option>
              </select>
            </div>

            {demStatus === "fetching" ? (
              <div className={styles.progressArea} data-testid="site-context-dem-progress">
                <div className={styles.progressTrack}>
                  <div className={styles.progressBar} style={{ width: `${progressPercent}%` }} />
                </div>
                <p className={styles.progressText}>
                  {text.demFetching.replace("{loaded}", String(demProgress.loaded)).replace("{total}", String(demProgress.total))}
                </p>
                <button type="button" className={styles.secondaryButton} onClick={cancelDemFetch} data-testid="site-context-dem-cancel">
                  {text.demCancelButton}
                </button>
              </div>
            ) : (
              <div className={styles.buttonRow}>
                <button
                  type="button"
                  className={styles.primaryButton}
                  onClick={() => void runDemFetch()}
                  data-testid="site-context-dem-fetch"
                >
                  {text.demFetchButton}
                </button>
                <button
                  type="button"
                  className={styles.secondaryButton}
                  onClick={loadGujoSample}
                  disabled={sampleLoading}
                  data-testid="site-context-gujo-sample"
                >
                  {sampleLoading ? text.gujoSampleLoading : text.gujoSampleButton}
                </button>
              </div>
            )}

            {demStatus === "error" && demError !== null && (
              <div className={styles.errorBox} role="alert" data-testid="site-context-dem-error">
                <p className={styles.errorRow}>{demError}</p>
              </div>
            )}
            {demStatus === "cancelled" && (
              <div className={styles.statusMuted} data-testid="site-context-dem-cancelled">
                {text.demErrorAborted}
              </div>
            )}
            {previewNote !== null && (
              <p className={styles.doneText} data-testid="site-context-gujo-note">
                {previewNote}
              </p>
            )}
          </section>

          <section className={styles.panel} aria-label={text.previewTitle} data-testid="site-context-terrain-preview">
            <h2 className={styles.panelTitle}>{text.previewTitle}</h2>
            {preview === null ? (
              <p className={styles.panelLead}>{text.previewEmpty}</p>
            ) : (
              <dl className={styles.previewList} data-testid="site-context-preview-data">
                <PreviewRow label={text.previewSource} value={preview.sourceName} />
                <PreviewRow label={text.previewGrid} value={`${preview.width} × ${preview.height}`} />
                <PreviewRow label={text.previewCellSize} value={`${preview.cellSize} m`} />
                <PreviewRow label={text.previewElevationMin} value={`${preview.minElevation.toFixed(1)} m`} />
                <PreviewRow label={text.previewElevationMax} value={`${preview.maxElevation.toFixed(1)} m`} />
                <PreviewRow label={text.previewNoData} value={`${preview.noDataCount}`} />
                <PreviewRow label={text.previewTiles} value={`${preview.tileCount}`} />
                <PreviewRow
                  label={text.previewBounds}
                  value={`X ${preview.bounds.minX.toFixed(0)}〜${preview.bounds.maxX.toFixed(0)} / Y ${preview.bounds.minY.toFixed(0)}〜${preview.bounds.maxY.toFixed(0)}`}
                />
              </dl>
            )}
          </section>
        </div>
      </section>

      <footer className={styles.footer}>
        <button type="button" className={styles.primaryButton} onClick={onOpenRoadWorkflow} data-testid="site-context-next-road">
          {text.nextRoad}
        </button>
      </footer>
    </div>
  );
}

function PreviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className={styles.previewRow}>
      <dt className={styles.previewLabel}>{label}</dt>
      <dd className={styles.previewValue}>{value}</dd>
    </div>
  );
}

function ImportReportView({
  report,
  text,
}: {
  report: SiteContextImportReport;
  text: JaDictionary["workflow"]["siteContextPage"];
}) {
  return (
    <div className={styles.reportBox} data-testid="site-context-import-report">
      <p className={styles.doneRow}>
        <strong>{text.projectNameLabel}:</strong> {report.projectName}
      </p>
      <p className={styles.doneRow}>
        <strong>{text.projectIdLabel}:</strong> {report.projectId}
      </p>
      <h3 className={styles.reportHeading}>{text.warningsLabel}</h3>
      {report.warnings.length === 0 ? (
        <p className={styles.reportEmpty} data-testid="site-context-import-warnings">
          {text.warningsEmpty}
        </p>
      ) : (
        <ul className={styles.reportList} data-testid="site-context-import-warnings">
          {report.warnings.map((warning) => (
            <li key={warning.code} className={styles.reportItem} data-testid={`site-context-warning-${warning.code}`}>
              <code className={styles.reportCode}>{warning.code}</code> {warning.message}
            </li>
          ))}
        </ul>
      )}
      <h3 className={styles.reportHeading}>{text.unsupportedLabel}</h3>
      {report.unsupportedFields.length === 0 ? (
        <p className={styles.reportEmpty} data-testid="site-context-import-unsupported">
          {text.unsupportedEmpty}
        </p>
      ) : (
        <ul className={styles.reportList} data-testid="site-context-import-unsupported">
          {report.unsupportedFields.map((field) => (
            <li key={field.path} className={styles.reportItem} data-testid={`site-context-unsupported-${field.path}`}>
              <code className={styles.reportCode}>{field.path}</code> {field.reason}: {field.notes}
            </li>
          ))}
        </ul>
      )}
      <h3 className={styles.reportHeading}>{text.diagnosticsLabel}</h3>
      <dl className={styles.previewList}>
        <PreviewRow label={text.sourceSchemaVersion} value={report.version.sourceSchemaVersion} />
        <PreviewRow label={text.targetSchemaVersion} value={report.version.targetSchemaVersion} />
        <PreviewRow label={text.terrainCount} value={`${report.terrainImport.terrainCount}`} />
        <PreviewRow label={text.crsEpsg} value={`${report.crsImport.epsg ?? "—"}`} />
        <PreviewRow label={text.crsSupported} value={report.crsImport.supported ? "OK" : "NG"} />
        <PreviewRow label={text.migratedV1ToV2} value={report.diagnostics.migratedV1ToV2 ? "Yes" : "No"} />
        <PreviewRow label={text.selectionAreaMigrated} value={report.diagnostics.selectionAreaMigrated ? "Yes" : "No"} />
      </dl>
    </div>
  );
}

async function fetchTileBytes(url: string, signal?: AbortSignal): Promise<Uint8Array> {
  const response = await fetch(url, { signal });
  if (!response.ok) {
    throw new Error(`GSI-HTTP-${response.status}`);
  }
  const buffer = await response.arrayBuffer();
  return new Uint8Array(buffer);
}