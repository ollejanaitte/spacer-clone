import { useState } from "react";
import locale from "../i18n/locales/ja.json";
import { ja } from "../i18n/ja";
import type { AnalysisSettings, ProjectModel } from "../types";
import { expectedSampleCount, groundMotionDuration } from "./wizard/wizardState";
import { migrateTimeHistorySettings, type TimeHistoryAxis, type TimeHistoryV2Settings } from "./settingsMigration";

type TimeHistorySettingsPanelProps = {
  project?: ProjectModel;
  running?: boolean;
  onRun?: () => void;
  onChange?: (project: ProjectModel) => void;
  onContinue?: () => void;
};

export function TimeHistorySettingsPanel({
  project,
  running = false,
  onRun,
  onChange,
  onContinue,
}: TimeHistorySettingsPanelProps) {
  const text = locale.thAnalysis;
  const labels = text.analysisConfig;
  const [saved, setSaved] = useState(false);
  const normalizedProject = project ? migrateTimeHistorySettings(project) : undefined;
  const settings = normalizedProject?.analysisSettings.timeHistory as TimeHistoryV2Settings | undefined;
  const massCases = normalizedProject?.massCases ?? [];
  const groundMotions = normalizedProject?.groundMotions ?? [];
  const selectedMassCaseId = settings?.massCaseId ?? massCases[0]?.id ?? "";
  const selectedGroundMotionId = (["x", "y", "z"] as TimeHistoryAxis[])
    .map((axis) => settings?.groundMotions[axis])
    .find((assignment) => assignment?.enabled)?.groundMotionId ?? groundMotions[0]?.id ?? "";
  const selectedGroundMotion =
    groundMotions.find((motion) => motion.id === selectedGroundMotionId) ?? groundMotions[0];
  const timeStep = settings?.timeStep ?? selectedGroundMotion?.timeStep ?? 0.01;
  const duration = settings?.duration ?? selectedGroundMotion?.duration ?? 0;
  const motionDuration = groundMotionDuration(selectedGroundMotion?.samples.length ?? 0, selectedGroundMotion?.timeStep);
  const pointCount = expectedSampleCount(duration, timeStep) ?? 0;
  const timeStepMismatch =
    typeof selectedGroundMotion?.timeStep === "number" &&
    Math.abs(timeStep - selectedGroundMotion.timeStep) > 1e-12;
  const durationOverflow = motionDuration !== null && duration > motionDuration + 1e-12;
  const selectedTimeSteps = new Set((["x", "y", "z"] as TimeHistoryAxis[]).flatMap((axis) => {
    const assignment = settings?.groundMotions[axis];
    const motion = groundMotions.find((item) => item.id === assignment?.groundMotionId);
    return assignment?.enabled && motion ? [motion.timeStep] : [];
  }));

  const updateSettings = (patch: Partial<NonNullable<AnalysisSettings["timeHistory"]>>) => {
    if (!normalizedProject || !onChange) return;
    setSaved(false);
    const baseDamping = {
      type: "rayleigh" as const,
      alpha: normalizedProject.analysisSettings.timeHistory?.damping?.alpha ?? 0,
      beta: normalizedProject.analysisSettings.timeHistory?.damping?.beta ?? 0,
    };
    onChange({
      ...normalizedProject,
      analysisSettings: {
        ...normalizedProject.analysisSettings,
        timeHistory: {
          ...defaultTimeHistorySettings(normalizedProject),
          ...normalizedProject.analysisSettings.timeHistory,
          ...patch,
          damping: { ...baseDamping, ...patch.damping },
        },
      },
    });
  };

  const updateAxis = (axis: TimeHistoryAxis, patch: Partial<{ enabled: boolean; groundMotionId: string | null }>) => {
    if (!settings) return;
    updateSettings({
      schemaVersion: 2,
      groundMotions: {
        ...settings.groundMotions,
        [axis]: { ...settings.groundMotions[axis], ...patch },
      },
    });
  };

  const updateNumber = (value: string, field: "timeStep" | "duration" | "alpha" | "beta") => {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || (field === "timeStep" || field === "duration" ? parsed <= 0 : parsed < 0)) return;
    if (field === "alpha" || field === "beta") {
      updateSettings({
        damping: {
          type: "rayleigh",
          alpha: settings?.damping?.alpha ?? 0,
          beta: settings?.damping?.beta ?? 0,
          [field]: parsed,
        },
      });
    } else {
      updateSettings({ [field]: parsed });
    }
  };

  return (
    <section className="time-history-analysis-config" aria-label={labels.heading}>
      <h3>{ja.timeHistory.settingsHeading}</h3>
      <div className="time-history-config-section">
        <h4 title={labels.description}>{labels.basic}</h4>
        <div className="time-history-config-grid">
          <SelectField
            label={labels.massCase}
            value={selectedMassCaseId}
            disabled={!onChange}
            onChange={(value) => updateSettings({ massCaseId: value })}
            options={massCases.map((massCase) => ({ value: massCase.id, label: massCase.name || massCase.id }))}
          />
        </div>
        <table className="time-history-axis-table">
          <thead><tr><th>Direction</th><th>Enable</th><th>Ground Motion</th></tr></thead>
          <tbody>
            {(["x", "y", "z"] as TimeHistoryAxis[]).map((axis) => {
              const assignment = settings?.groundMotions[axis] ?? { enabled: false, groundMotionId: null };
              return (
                <tr key={axis}>
                  <td>{axis.toUpperCase()}</td>
                  <td><input aria-label={`${axis.toUpperCase()} Enable`} type="checkbox" checked={assignment.enabled} disabled={!onChange} onChange={(event) => updateAxis(axis, { enabled: event.currentTarget.checked })} /></td>
                  <td>
                    <select aria-label={`${axis.toUpperCase()} Ground Motion`} value={assignment.groundMotionId ?? ""} disabled={!onChange || !assignment.enabled} onChange={(event) => updateAxis(axis, { groundMotionId: event.currentTarget.value || null })}>
                      <option value="">-</option>
                      {groundMotions.map((motion) => <option key={motion.id} value={motion.id}>{motion.name || motion.id}</option>)}
                    </select>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {selectedTimeSteps.size > 1 && (
          <div className="time-history-validation-message warning" role="alert">
            選択した地震波の dt が一致していません。
          </div>
        )}
      </div>

      <div className="time-history-config-section">
        <h4 title={labels.description}>{labels.time}</h4>
        <div className="time-history-config-grid">
          <NumberField label={ja.timeHistory.fields.timeStep} value={timeStep} onChange={(value) => updateNumber(value, "timeStep")} />
          <button
            type="button"
            disabled={!onChange || !selectedGroundMotion}
            onClick={() => selectedGroundMotion && updateSettings({ timeStep: selectedGroundMotion.timeStep })}
          >
            {labels.matchTimeStep}
          </button>
          <NumberField label={ja.timeHistory.fields.duration} value={duration} onChange={(value) => updateNumber(value, "duration")} />
          <button
            type="button"
            disabled={!onChange || motionDuration === null}
            onClick={() => motionDuration !== null && updateSettings({ duration: motionDuration })}
          >
            {labels.matchDuration}
          </button>
        </div>
        {timeStepMismatch && (
          <div className="time-history-validation-message warning" role="alert">
            <span>{labels.timeStepWarning}</span>
            <button type="button" onClick={() => updateSettings({ timeStep: selectedGroundMotion?.timeStep ?? timeStep })}>
              {labels.matchTimeStep}
            </button>
          </div>
        )}
        {durationOverflow && (
          <div className="time-history-validation-message error" role="alert">
            <span>{labels.durationError}</span>
            <button type="button" onClick={() => motionDuration !== null && updateSettings({ duration: motionDuration })}>
              {labels.matchDuration}
            </button>
          </div>
        )}
      </div>

      <details className="time-history-config-section" open>
        <summary>{labels.damping}</summary>
        <div className="time-history-config-grid">
          <NumberField
            label={labels.rayleighAlpha}
            value={settings?.damping?.alpha ?? 0}
            onChange={(value) => updateNumber(value, "alpha")}
          />
          <NumberField
            label={labels.rayleighBeta}
            value={settings?.damping?.beta ?? 0}
            onChange={(value) => updateNumber(value, "beta")}
          />
          <button
            type="button"
            disabled={!onChange}
            onClick={() => updateSettings({ damping: { type: "rayleigh", alpha: 0, beta: 0.05 } })}
          >
            {labels.dampingPreset}
          </button>
        </div>
      </details>

      <details className="time-history-config-section">
        <summary>{labels.newmark}</summary>
        <div className="time-history-fixed-values">
          <span>β = {settings?.beta ?? 0.25}</span>
          <span>γ = {settings?.gamma ?? 0.5}</span>
          <span>{labels.fixed}</span>
        </div>
      </details>

      <div className="time-history-config-preview">
        <strong>{labels.preview}</strong>
        <span>
          {labels.previewText
            .replace("{dt}", formatNumber(timeStep))
            .replace("{points}", String(pointCount))
            .replace("{duration}", formatNumber(duration))}
        </span>
      </div>

      {!normalizedProject && <div className="empty-state">{locale.thAnalysis.status.notSet}</div>}
      <div className="time-history-config-actions">
        <button type="button" onClick={() => setSaved(true)} disabled={!normalizedProject}>
          {text.actions.saveConfig}
        </button>
        {onContinue ? (
          <button type="button" className="time-history-primary-action" onClick={onContinue}>
            {text.actions.continueToRun}
          </button>
        ) : (
          <button type="button" className="time-history-primary-action" onClick={onRun} disabled={running || !onRun}>
            {running ? ja.timeHistory.status.running : ja.timeHistory.fields.runButton}
          </button>
        )}
      </div>
      {saved && <p className="time-history-saved-note" role="status">{labels.saved}</p>}
    </section>
  );
}

function SelectField({
  label,
  value,
  disabled,
  options,
  onChange,
}: {
  label: string;
  value: string;
  disabled: boolean;
  options: Array<{ value: string; label: string }>;
  onChange: (value: string) => void;
}) {
  return (
    <label className="result-select">
      <span>{label}</span>
      <select aria-label={label} value={value} disabled={disabled} onChange={(event) => onChange(event.currentTarget.value)}>
        {options.length === 0 && <option value="">-</option>}
        {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
    </label>
  );
}

function NumberField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: string) => void;
}) {
  return (
    <label className="result-select">
      <span>{label}</span>
      <input
        aria-label={label}
        type="number"
        value={String(value)}
        step="any"
        min="0"
        onChange={(event) => onChange(event.currentTarget.value)}
      />
    </label>
  );
}

function defaultTimeHistorySettings(project: ProjectModel): NonNullable<AnalysisSettings["timeHistory"]> {
  const firstMotion = project.groundMotions?.[0];
  return {
    schemaVersion: 2,
    enabled: true,
    method: "newmark-beta",
    timeStep: firstMotion?.timeStep ?? 0.05,
    duration: firstMotion?.duration ?? 0.5,
    beta: 0.25,
    gamma: 0.5,
    massCaseId: project.massCases?.[0]?.id ?? "",
    groundMotionId: firstMotion?.id ?? "",
    direction: firstMotion?.direction ?? "X",
    groundMotions: {
      x: { enabled: firstMotion?.direction === "X", groundMotionId: firstMotion?.direction === "X" ? firstMotion.id : null },
      y: { enabled: firstMotion?.direction === "Y", groundMotionId: firstMotion?.direction === "Y" ? firstMotion.id : null },
      z: { enabled: firstMotion?.direction === "Z", groundMotionId: firstMotion?.direction === "Z" ? firstMotion.id : null },
    },
    damping: { type: "rayleigh", alpha: 0, beta: 0 },
  };
}

function formatNumber(value: number): string {
  return Number.isFinite(value) ? value.toFixed(4).replace(/0+$/, "").replace(/\.$/, "") : "-";
}
