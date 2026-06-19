import { useEffect, useRef, useState } from "react";
import { ja } from "../i18n/ja";
import type { ProjectModel } from "../types";
import {
  parseGroundMotionCsv,
  readGroundMotionCsvFile,
  type GroundMotionCsvParseError,
  type GroundMotionCsvParseResult,
  type GroundMotionCsvParseSuccess,
} from "./groundMotionCsv";
import {
  h24WaveformToSamples,
  parseH24GroundMotion,
  summarizeH24Waveform,
  type H24ParseError,
  type H24ParseResult,
  type H24ParseSuccess,
  type H24WaveformSummary,
} from "./h24GroundMotionImport";
import {
  computeGroundMotionPreview,
  computeGroundMotionSampleStatus,
  type GroundMotionPreview,
  type GroundMotionSampleStatus,
} from "./groundMotionPreview";

type GroundMotionManagerPanelProps = {
  groundMotions?: ProjectModel["groundMotions"];
  project?: ProjectModel;
  onChange?: (project: ProjectModel) => void;
};

type ImportStatus =
  | { kind: "idle" }
  | { kind: "success"; fileName: string; sampleCount: number; timeStep: number; columns: number }
  | { kind: "success-no-time-step"; fileName: string; sampleCount: number; columns: number }
  | { kind: "h24-success"; fileName: string; sampleCount: number; timeStep: number; duration: number; waveformCount: number }
  | { kind: "h24-no-waves"; fileName: string }
  | { kind: "error"; message: string };

export function GroundMotionManagerPanel({ groundMotions, project, onChange }: GroundMotionManagerPanelProps) {
  const motions = groundMotions ?? project?.groundMotions ?? [];
  const editableMotion = motions[0] ?? defaultGroundMotion();
  const labels = ja.timeHistory.groundMotionManager;
  const importLabels = labels;
  const [sampleText, setSampleText] = useState(editableMotion.samples.join(", "));
  const [importStatus, setImportStatus] = useState<ImportStatus>({ kind: "idle" });
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const h24FileInputRef = useRef<HTMLInputElement | null>(null);
  const [h24Import, setH24Import] = useState<
    | { kind: "idle" }
    | { kind: "ready"; fileName: string; result: H24ParseSuccess }
  >({ kind: "idle" });
  useEffect(() => {
    setSampleText(editableMotion.samples.join(", "));
  }, [editableMotion.id, editableMotion.samples]);
  const updateMotion = (patch: Partial<typeof editableMotion>) => {
    if (!project || !onChange) return;
    const nextMotions = project.groundMotions && project.groundMotions.length > 0
      ? project.groundMotions.map((motion, index) => (index === 0 ? { ...motion, ...patch } : motion))
      : [{ ...defaultGroundMotion(), ...patch }];
    const nextDirection = patch.direction;
    onChange({
      ...project,
      groundMotions: nextMotions,
      analysisSettings: nextDirection
        ? {
            ...project.analysisSettings,
            timeHistory: project.analysisSettings.timeHistory
              ? { ...project.analysisSettings.timeHistory, direction: nextDirection }
              : project.analysisSettings.timeHistory,
          }
        : project.analysisSettings,
    });
  };
  const updateNumber = (value: string, field: "timeStep") => {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed <= 0) return;
    updateMotion({ [field]: parsed });
  };
  const sampleParse = parseSamples(sampleText);
  const motionDuration = typeof editableMotion.duration === "number" ? editableMotion.duration : 0;
  const preview: GroundMotionPreview = computeGroundMotionPreview({
    samples: editableMotion.samples,
    timeStep: editableMotion.timeStep,
    duration: motionDuration,
  });
  const sampleStatus: GroundMotionSampleStatus = computeGroundMotionSampleStatus({
    duration: motionDuration,
    timeStep: editableMotion.timeStep,
    sampleCount: editableMotion.samples.length,
  });
  const unitLabel = editableMotion.unit === "gal" ? ja.timeHistory.units.gal : ja.timeHistory.units.meterPerSecondSquared;
  const runValidationWarning = sampleStatus.kind === "short" || sampleStatus.kind === "long";

  const handleImportClick = () => {
    if (!onChange) return;
    fileInputRef.current?.click();
  };

  const handleFileSelected = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0];
    // Always clear the input so the same file can be re-imported later.
    event.currentTarget.value = "";
    if (!file || !project || !onChange) return;
    try {
      const text = await readGroundMotionCsvFile(file);
      const result = parseGroundMotionCsv(text, { existingTimeStep: editableMotion.timeStep });
      applyImportResult(result, file.name, editableMotion.timeStep);
    } catch (error) {
      setImportStatus({ kind: "error", message: importLabels.importErrorFileRead });
    }
  };

  const handleH24ImportClick = () => {
    if (!onChange) return;
    h24FileInputRef.current?.click();
  };

  const handleH24FileSelected = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    if (!file || !project || !onChange) return;
    try {
      const text = await readGroundMotionCsvFile(file);
      const result = parseH24GroundMotion(text, { fileName: file.name });
      applyH24ImportResult(result);
    } catch (error) {
      setImportStatus({ kind: "error", message: importLabels.importErrorFileRead });
    }
  };

  const applyH24ImportResult = (result: H24ParseResult) => {
    if (result.kind === "ok") {
      if (result.waveforms.length === 0) {
        setImportStatus({ kind: "h24-no-waves", fileName: result.fileName ?? "" });
        return;
      }
      setH24Import({ kind: "ready", fileName: result.fileName ?? "", result });
      setImportStatus({
        kind: "h24-success",
        fileName: result.fileName ?? "",
        sampleCount: result.sampleCount,
        timeStep: result.timeStep,
        duration: result.duration,
        waveformCount: result.waveforms.length,
      });
      return;
    }
    setImportStatus({ kind: "error", message: formatH24Error(result) });
  };

  const applyH24WaveformToMotion = (index: number) => {
    if (!project || !onChange) return;
    if (h24Import.kind !== "ready") return;
    const waveform = h24Import.result.waveforms[index];
    if (!waveform) return;
    const samples = h24WaveformToSamples(waveform);
    const timeStep = h24Import.result.timeStep;
    const duration = h24Import.result.duration;
    const safeName = waveform.name.trim() || editableMotion.name || "H24 waveform " + String(index + 1);
    updateMotion({
      name: safeName,
      unit: "gal",
      timeStep,
      duration,
      samples,
    });
  };

  const handleH24PasteImport = () => {
    if (!project || !onChange) return;
    const text = window.prompt(importLabels.h24PastePrompt);
    if (text === null) return;
    const result = parseH24GroundMotion(text, { fileName: importLabels.h24PasteFileName });
    applyH24ImportResult(result);
  };

  const h24WaveformSummaries: H24WaveformSummary[] =
    h24Import.kind === "ready"
      ? h24Import.result.waveforms.map((series) =>
          summarizeH24Waveform(series, h24Import.result.timeStep, h24Import.result.duration),
        )
      : [];

    const applyImportResult = (
    result: GroundMotionCsvParseResult,
    fileName: string,
    existingTimeStep: number,
  ) => {
    if (result.kind === "ok") {
      applySuccess(result, fileName, existingTimeStep);
      return;
    }
    setImportStatus({ kind: "error", message: formatError(result) });
  };

  const applySuccess = (
    result: GroundMotionCsvParseSuccess,
    fileName: string,
    existingTimeStep: number,
  ) => {
    if (!project || !onChange) return;
    // The CSV parser never mutates the project; it produces a brand-new
    // ground motion record that replaces the first slot. The duration is
    // recomputed from the (possibly estimated) time step and the sample
    // count.
    const timeStep = result.columns === 2 ? result.timeStep : existingTimeStep;
    const nextDuration = timeStep * Math.max(result.samples.length - 1, 0);
    updateMotion({
      samples: result.samples,
      timeStep,
      duration: nextDuration,
    });
    if (result.columns === 2) {
      setImportStatus({
        kind: "success",
        fileName,
        sampleCount: result.sampleCount,
        timeStep: result.timeStep,
        columns: result.columns,
      });
    } else {
      setImportStatus({
        kind: "success-no-time-step",
        fileName,
        sampleCount: result.sampleCount,
        columns: result.columns,
      });
    }
  };

  return (
    <section className="result-table time-history-ground-motion-manager" aria-label={labels.heading}>
      <h3>{labels.heading}</h3>
      {motions.length === 0 ? (
        <div className="empty-state">{ja.timeHistory.empty.groundMotions}</div>
      ) : (
        <table>
          <thead>
            <tr>
              <th>{labels.columns.id}</th>
              <th>{labels.columns.name}</th>
              <th>{labels.columns.direction}</th>
              <th>{labels.columns.unit}</th>
              <th>{labels.columns.timeStep}</th>
              <th>{labels.columns.sampleCount}</th>
            </tr>
          </thead>
          <tbody>
            {motions.map((motion) => (
              <tr key={motion.id}>
                <td>{motion.id}</td>
                <td>{motion.name ?? "-"}</td>
                <td>{motion.direction}</td>
                <td>{motion.unit}</td>
                <td>{motion.timeStep}</td>
                <td>{motion.samples.length}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <div className="summary-list result-toolbar">
        <TextField label={labels.editor.id} value={editableMotion.id} onChange={(value) => updateMotion({ id: value })} disabled={!onChange} />
        <TextField label={labels.editor.name} value={editableMotion.name ?? ""} onChange={(value) => updateMotion({ name: value })} disabled={!onChange} />
        <label className="result-select">
          <span>{labels.editor.direction}</span>
          <select value={editableMotion.direction} disabled={!onChange} onChange={(event) => updateMotion({ direction: event.currentTarget.value as "X" | "Y" | "Z" })}>
            <option value="X">X</option>
            <option value="Y">Y</option>
            <option value="Z">Z</option>
          </select>
        </label>
        <label className="result-select">
          <span>{labels.editor.unit}</span>
          <select value={editableMotion.unit} disabled={!onChange} onChange={(event) => updateMotion({ unit: event.currentTarget.value as "m/s2" | "gal" })}>
            <option value="m/s2">{ja.timeHistory.units.meterPerSecondSquared}</option>
            <option value="gal">{ja.timeHistory.units.gal}</option>
          </select>
        </label>
        <label className="result-select">
          <span>{labels.editor.timeStep}</span>
          <input aria-label={labels.editor.timeStep} type="number" step="any" min="0" value={String(editableMotion.timeStep)} disabled={!onChange} onChange={(event) => updateNumber(event.currentTarget.value, "timeStep")} />
        </label>
      </div>
      <label className="time-history-samples-editor">
        <span>{labels.editor.samples}</span>
        <textarea
          aria-label={labels.editor.samples}
          value={sampleText}
          disabled={!onChange}
          onChange={(event) => {
            const nextText = event.currentTarget.value;
            setSampleText(nextText);
            const parsed = parseSamples(nextText);
            if (parsed.valid) updateMotion({ samples: parsed.samples, duration: editableMotion.timeStep * Math.max(parsed.samples.length - 1, 0) });
          }}
        />
      </label>
      {!sampleParse.valid && <div className="empty-state">{ja.timeHistory.validation.samples}</div>}
      <GroundMotionPreviewView
        preview={preview}
        status={sampleStatus}
        unitLabel={unitLabel}
      />
      {runValidationWarning && <div className="empty-state time-history-run-warning">{labels.runValidationWarning}</div>}
      <div className="summary-list result-toolbar">
        <button type="button" disabled>{labels.addNew}</button>
        <button type="button" disabled={!onChange} onClick={handleImportClick}>
          {labels.importCsv}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,text/csv"
          aria-label={importLabels.importFileLabel}
          onChange={handleFileSelected}
          hidden
        />
        <button type="button" disabled>{labels.importPeer}</button>
        <button type="button" disabled={!onChange} onClick={handleH24ImportClick}>
          {importLabels.importH24}
        </button>
        <input
          ref={h24FileInputRef}
          type="file"
          accept=".csv,.tsv,.txt,text/csv,text/tab-separated-values,text/plain"
          aria-label={importLabels.importH24FileLabel}
          onChange={handleH24FileSelected}
          hidden
        />
        <button type="button" disabled={!onChange} onClick={handleH24PasteImport}>
          {importLabels.importH24Paste}
        </button>
        <span>{labels.futureFeatureNote}</span>
      </div>
      <ImportStatusView status={importStatus} />
      {h24Import.kind === "ready" && (
        <H24WaveformPicker
          fileName={h24Import.fileName}
          summaries={h24WaveformSummaries}
          onPick={applyH24WaveformToMotion}
          disabled={!onChange}
        />
      )}
    </section>
  );
}

function ImportStatusView({ status }: { status: ImportStatus }) {
  const labels = ja.timeHistory.groundMotionManager;
  if (status.kind === "idle") return null;
  if (status.kind === "success") {
    return <div className="summary-list time-history-import-status">{labels.importSuccess(status)}</div>;
  }
  if (status.kind === "success-no-time-step") {
    return <div className="summary-list time-history-import-status">{labels.importSuccessNoTimeStep(status)}</div>;
  }
  if (status.kind === "h24-success") {
    return <div className="summary-list time-history-import-status">{labels.h24ImportSuccess(status)}</div>;
  }
  if (status.kind === "h24-no-waves") {
    return <div className="empty-state time-history-import-status-error">{labels.h24ImportNoWaves({ fileName: status.fileName })}</div>;
  }
  return <div className="empty-state time-history-import-status-error">{status.message}</div>;
}

function GroundMotionPreviewView({
  preview,
  status,
  unitLabel,
}: {
  preview: GroundMotionPreview;
  status: GroundMotionSampleStatus;
  unitLabel: string;
}) {
  const labels = ja.timeHistory.groundMotionManager;
  const statusText = (() => {
    switch (status.kind) {
      case "ok":
        return labels.sampleStatusOk;
      case "short":
        return labels.sampleStatusShort({ expected: status.expected, actual: status.actual });
      case "long":
        return labels.sampleStatusLong({ expected: status.expected, actual: status.actual });
      case "unknown":
        return labels.sampleStatusUnknown;
    }
  })();
  return (
    <div className="summary-list time-history-preview" aria-label={labels.previewLabel}>
      <h4>{labels.previewLabel}</h4>
      <div className="summary-list">
        <span>{labels.previewSampleCount(preview.sampleCount)}</span>
        <span>{labels.previewTimeStep(preview.timeStep)}</span>
        <span>{labels.previewDuration(preview.duration)}</span>
      </div>
      <div className="summary-list">
        <span>{labels.previewMax(preview.max, unitLabel)}</span>
        <span>{labels.previewMin(preview.min, unitLabel)}</span>
        <span>{labels.previewAbsMax(preview.absMax, unitLabel)}</span>
      </div>
      <div className={"summary-list time-history-sample-status " + status.kind}>{statusText}</div>
    </div>
  );
}

function H24WaveformPicker({
  fileName,
  summaries,
  onPick,
  disabled,
}: {
  fileName: string;
  summaries: H24WaveformSummary[];
  onPick: (index: number) => void;
  disabled: boolean;
}) {
  const labels = ja.timeHistory.groundMotionManager;
  return (
    <div className="time-history-h24-picker" aria-label={labels.h24PickerHeading}>
      <h4>{labels.h24PickerHeading}</h4>
      <div className="summary-list">
        <span>{labels.h24PickerFile(fileName)}</span>
        <span>{labels.h24PickerCount(summaries.length)}</span>
      </div>
      <table>
        <thead>
          <tr>
            <th>{labels.h24PickerName}</th>
            <th>{labels.h24PickerSamples}</th>
            <th>{labels.h24PickerTimeStep}</th>
            <th>{labels.h24PickerDuration}</th>
            <th>{labels.h24PickerMax}</th>
            <th>{labels.h24PickerMin}</th>
            <th>{labels.h24PickerAbsMax}</th>
            <th>{labels.h24PickerAction}</th>
          </tr>
        </thead>
        <tbody>
          {summaries.map((summary, index) => (
            <tr key={summary.name + "-" + String(index)}>
              <td>{summary.name}</td>
              <td>{summary.sampleCount}</td>
              <td>{summary.timeStep.toFixed(4)}</td>
              <td>{summary.duration.toFixed(4)}</td>
              <td>{summary.max.toFixed(3)}</td>
              <td>{summary.min.toFixed(3)}</td>
              <td>{summary.absMax.toFixed(3)}</td>
              <td>
                <button type="button" disabled={disabled} onClick={() => onPick(index)}>
                  {labels.h24PickerPick}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function formatH24Error(error: H24ParseError): string {
  const labels = ja.timeHistory.groundMotionManager;
  switch (error.code) {
    case "empty-file":
      return labels.importErrorEmpty;
    case "no-numeric-samples":
      return labels.importErrorNoNumericSamples;
    case "non-finite-value":
      return labels.h24ErrorNonFinite({ line: error.line, column: error.column, token: error.token });
    case "inconsistent-time-step":
      return labels.h24ErrorInconsistentTimeStep({ line: error.line, detail: error.detail });
    case "missing-time-column":
      return labels.h24ErrorMissingTimeColumn({ detail: error.detail });
  }
}

function formatError(error: GroundMotionCsvParseError): string {
  const labels = ja.timeHistory.groundMotionManager;
  switch (error.code) {
    case "empty-file":
      return labels.importErrorEmpty;
    case "no-numeric-samples":
      return labels.importErrorNoNumericSamples;
    case "non-finite-value":
      return labels.importErrorNonFinite({ line: error.line, column: error.column, token: error.token });
    case "inconsistent-time-step":
      return labels.importErrorInconsistentTimeStep({ line: error.line, detail: error.detail });
    case "unsupported-column-count":
      return labels.importErrorUnsupportedColumns({ detail: error.detail });
  }
}

function TextField({ label, value, disabled, onChange }: { label: string; value: string; disabled: boolean; onChange: (value: string) => void }) {
  return (
    <label className="result-select">
      <span>{label}</span>
      <input aria-label={label} value={value} disabled={disabled} onChange={(event) => onChange(event.currentTarget.value)} />
    </label>
  );
}

function parseSamples(text: string): { valid: true; samples: number[] } | { valid: false; samples: [] } {
  const tokens = text.split(/[\s,]+/).map((token) => token.trim()).filter(Boolean);
  if (tokens.length === 0) return { valid: false, samples: [] };
  const samples = tokens.map((token) => Number(token));
  if (samples.some((sample) => !Number.isFinite(sample))) return { valid: false, samples: [] };
  return { valid: true, samples };
}

function defaultGroundMotion(): NonNullable<ProjectModel["groundMotions"]>[number] {
  return {
    id: "gm-001",
    name: "",
    direction: "X",
    unit: "m/s2",
    timeStep: 0.05,
    duration: 0,
    samples: [0],
  };
}
