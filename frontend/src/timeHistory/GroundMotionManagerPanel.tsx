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

type GroundMotionManagerPanelProps = {
  groundMotions?: ProjectModel["groundMotions"];
  project?: ProjectModel;
  onChange?: (project: ProjectModel) => void;
};

type ImportStatus =
  | { kind: "idle" }
  | { kind: "success"; fileName: string; sampleCount: number; timeStep: number; columns: number }
  | { kind: "success-no-time-step"; fileName: string; sampleCount: number; columns: number }
  | { kind: "error"; message: string };

export function GroundMotionManagerPanel({ groundMotions, project, onChange }: GroundMotionManagerPanelProps) {
  const motions = groundMotions ?? project?.groundMotions ?? [];
  const editableMotion = motions[0] ?? defaultGroundMotion();
  const labels = ja.timeHistory.groundMotionManager;
  const importLabels = labels;
  const [sampleText, setSampleText] = useState(editableMotion.samples.join(", "));
  const [importStatus, setImportStatus] = useState<ImportStatus>({ kind: "idle" });
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  useEffect(() => {
    setSampleText(editableMotion.samples.join(", "));
  }, [editableMotion.id, editableMotion.samples]);
  const updateMotion = (patch: Partial<typeof editableMotion>) => {
    if (!project || !onChange) return;
    const nextMotions = project.groundMotions && project.groundMotions.length > 0
      ? project.groundMotions.map((motion, index) => (index === 0 ? { ...motion, ...patch } : motion))
      : [{ ...defaultGroundMotion(), ...patch }];
    onChange({ ...project, groundMotions: nextMotions });
  };
  const updateNumber = (value: string, field: "timeStep") => {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed <= 0) return;
    updateMotion({ [field]: parsed });
  };
  const sampleParse = parseSamples(sampleText);

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
        <span>{labels.futureFeatureNote}</span>
      </div>
      <ImportStatusView status={importStatus} />
    </section>
  );
}

function ImportStatusView({ status }: { status: ImportStatus }) {
  if (status.kind === "idle") return null;
  if (status.kind === "success") {
    return <div className="summary-list time-history-import-status">{ja.timeHistory.groundMotionManager.importSuccess(status)}</div>;
  }
  if (status.kind === "success-no-time-step") {
    return <div className="summary-list time-history-import-status">{ja.timeHistory.groundMotionManager.importSuccessNoTimeStep(status)}</div>;
  }
  return <div className="empty-state time-history-import-status-error">{status.message}</div>;
}

function formatError(error: GroundMotionCsvParseError): string {
  const labels = ja.timeHistory.groundMotionManager;
  switch (error.code) {
    case "empty-file":
      return labels.importErrorEmpty;
    case "no-numeric-samples":
      return labels.importErrorNoNumericSamples;
    case "non-finite-value":
      return labels.importErrorNonFinite({ line: error.line, token: error.token });
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
