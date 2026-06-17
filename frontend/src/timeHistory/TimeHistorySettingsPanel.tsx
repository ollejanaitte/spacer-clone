import { ja } from "../i18n/ja";
import type { AnalysisSettings, ProjectModel } from "../types";

type TimeHistorySettingsPanelProps = {
  project?: ProjectModel;
  running?: boolean;
  onRun?: () => void;
  onChange?: (project: ProjectModel) => void;
};

export function TimeHistorySettingsPanel({
  project,
  running = false,
  onRun,
  onChange,
}: TimeHistorySettingsPanelProps) {
  const settings = project?.analysisSettings.timeHistory;
  const massCases = project?.massCases ?? [];
  const groundMotions = project?.groundMotions ?? [];
  const selectedMassCaseId = settings?.massCaseId ?? massCases[0]?.id ?? "";
  const selectedGroundMotionId = settings?.groundMotionId ?? groundMotions[0]?.id ?? "";
  const selectedGroundMotion = groundMotions.find((motion) => motion.id === selectedGroundMotionId) ?? groundMotions[0];
  const direction = settings?.direction ?? selectedGroundMotion?.direction ?? "X";
  const labels = ja.timeHistory.fields;
  const validation = ja.timeHistory.validation;

  const updateSettings = (patch: Partial<NonNullable<AnalysisSettings["timeHistory"]>>) => {
    if (!project || !onChange) return;
    const baseDamping = {
      type: "rayleigh" as const,
      alpha: project.analysisSettings.timeHistory?.damping?.alpha ?? 0,
      beta: project.analysisSettings.timeHistory?.damping?.beta ?? 0,
    };
    const nextDamping = { ...baseDamping, ...patch.damping };
    onChange({
      ...project,
      analysisSettings: {
        ...project.analysisSettings,
        timeHistory: {
          ...defaultTimeHistorySettings(project),
          ...project.analysisSettings.timeHistory,
          ...patch,
          damping: nextDamping,
        },
      },
    });
  };

  const updateNumber = (value: string, field: "timeStep" | "duration" | "alpha" | "beta") => {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || (field === "timeStep" || field === "duration" ? parsed <= 0 : parsed < 0)) return;
    if (field === "alpha" || field === "beta") {
      updateSettings({ damping: { type: "rayleigh", alpha: settings?.damping?.alpha ?? 0, beta: settings?.damping?.beta ?? 0, [field]: parsed } });
    } else {
      updateSettings({ [field]: parsed });
    }
  };

  return (
    <section className="result-table time-history-settings" aria-label={ja.timeHistory.settingsHeading}>
      <h3>{ja.timeHistory.settingsHeading}</h3>
      <div className="summary-list result-toolbar">
        <label className="result-select">
          <span>{labels.massCase}</span>
          <select value={selectedMassCaseId} disabled={!onChange} onChange={(event) => updateSettings({ massCaseId: event.currentTarget.value })}>
            {massCases.length === 0 ? (
              <option value="">{ja.timeHistory.empty.massCases}</option>
            ) : (
              massCases.map((massCase) => (
                <option key={massCase.id} value={massCase.id}>
                  {massCase.id}
                </option>
              ))
            )}
          </select>
        </label>
        <label className="result-select">
          <span>{labels.groundMotion}</span>
          <select value={selectedGroundMotionId} disabled={!onChange} onChange={(event) => updateSettings({ groundMotionId: event.currentTarget.value })}>
            {groundMotions.length === 0 ? (
              <option value="">{ja.timeHistory.empty.groundMotions}</option>
            ) : (
              groundMotions.map((motion) => (
                <option key={motion.id} value={motion.id}>
                  {motion.id}
                </option>
              ))
            )}
          </select>
        </label>
        <button type="button" disabled>
          {labels.manageGroundMotions}
        </button>
      </div>
      <div className="summary-list result-toolbar">
        <label className="result-select">
          <span>{labels.direction}</span>
          <select value={direction} disabled={!onChange} onChange={(event) => updateSettings({ direction: event.currentTarget.value as "X" | "Y" | "Z" })}>
            <option value="X">{labels.directionX}</option>
            <option value="Y">{labels.directionY}</option>
            <option value="Z">{labels.directionZ}</option>
          </select>
        </label>
        <NumberField label={labels.timeStep} value={settings?.timeStep ?? selectedGroundMotion?.timeStep ?? 0.05} minExclusiveZero onChange={(value) => updateNumber(value, "timeStep")} />
        <NumberField label={labels.duration} value={settings?.duration ?? selectedGroundMotion?.duration ?? 0.5} minExclusiveZero onChange={(value) => updateNumber(value, "duration")} />
        <span>{labels.newmarkBeta}: {formatNumber(settings?.beta ?? 0.25)} ({labels.newmarkBetaFixedNote})</span>
        <span>{labels.newmarkGamma}: {formatNumber(settings?.gamma ?? 0.5)} ({labels.newmarkBetaFixedNote})</span>
        <NumberField label={labels.rayleighAlpha} value={settings?.damping?.alpha ?? 0} onChange={(value) => updateNumber(value, "alpha")} />
        <NumberField label={labels.rayleighBeta} value={settings?.damping?.beta ?? 0} onChange={(value) => updateNumber(value, "beta")} />
      </div>
      {!project && <div className="empty-state">{validation.projectMissing}</div>}
      <button type="button" onClick={onRun} disabled={running || !onRun}>
        {running ? ja.timeHistory.status.running : labels.runButton}
      </button>
    </section>
  );
}

function NumberField({
  label,
  value,
  minExclusiveZero = false,
  onChange,
}: {
  label: string;
  value: number;
  minExclusiveZero?: boolean;
  onChange: (value: string) => void;
}) {
  const invalid = !Number.isFinite(value) || (minExclusiveZero ? value <= 0 : value < 0);
  return (
    <label className="result-select">
      <span>{label}</span>
      <input
        aria-label={label}
        type="number"
        value={String(value)}
        step="any"
        min={minExclusiveZero ? "0" : "0"}
        onChange={(event) => onChange(event.currentTarget.value)}
      />
      {invalid && <span className="field-error">{ja.timeHistory.validation.number}</span>}
    </label>
  );
}

function defaultTimeHistorySettings(project: ProjectModel): NonNullable<AnalysisSettings["timeHistory"]> {
  const firstMotion = project.groundMotions?.[0];
  return {
    enabled: true,
    method: "newmark-beta",
    timeStep: firstMotion?.timeStep ?? 0.05,
    duration: firstMotion?.duration ?? 0.5,
    beta: 0.25,
    gamma: 0.5,
    massCaseId: project.massCases?.[0]?.id ?? "",
    groundMotionId: firstMotion?.id ?? "",
    direction: firstMotion?.direction ?? "X",
    damping: { type: "rayleigh", alpha: 0, beta: 0 },
  };
}

function formatNumber(value: number | undefined): string {
  if (typeof value !== "number" || !Number.isFinite(value)) return "-";
  return String(value);
}
