import { ja } from "../i18n/ja";
import type { ProjectModel } from "../types";

type TimeHistorySettingsPanelProps = {
  project?: ProjectModel;
  running?: boolean;
  onRun?: () => void;
};

export function TimeHistorySettingsPanel({
  project,
  running = false,
  onRun,
}: TimeHistorySettingsPanelProps) {
  const settings = project?.analysisSettings.timeHistory;
  const massCases = project?.massCases ?? [];
  const groundMotions = project?.groundMotions ?? [];
  const selectedMassCaseId = settings?.massCaseId ?? massCases[0]?.id ?? "";
  const selectedGroundMotionId = settings?.groundMotionId ?? groundMotions[0]?.id ?? "";
  const selectedGroundMotion = groundMotions.find((motion) => motion.id === selectedGroundMotionId) ?? groundMotions[0];
  const direction = settings?.direction ?? selectedGroundMotion?.direction ?? "X";
  const labels = ja.timeHistory.fields;

  return (
    <section className="result-table time-history-settings" aria-label={ja.timeHistory.settingsHeading}>
      <h3>{ja.timeHistory.settingsHeading}</h3>
      <div className="summary-list result-toolbar">
        <label className="result-select">
          <span>{labels.massCase}</span>
          <select value={selectedMassCaseId} disabled>
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
          <select value={selectedGroundMotionId} disabled>
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
      <div className="summary-list">
        <span>{labels.direction}: {direction}</span>
        <span>{labels.timeStep}: {formatNumber(settings?.timeStep ?? selectedGroundMotion?.timeStep)} {ja.timeHistory.units.seconds}</span>
        <span>{labels.duration}: {formatNumber(settings?.duration ?? selectedGroundMotion?.duration)} {ja.timeHistory.units.seconds}</span>
        <span>{labels.newmarkBeta}: {formatNumber(settings?.beta ?? 0.25)} ({labels.newmarkBetaFixedNote})</span>
        <span>{labels.newmarkGamma}: {formatNumber(settings?.gamma ?? 0.5)} ({labels.newmarkBetaFixedNote})</span>
        <span>{labels.rayleighAlpha}: {formatNumber(settings?.damping?.alpha ?? 0)}</span>
        <span>{labels.rayleighBeta}: {formatNumber(settings?.damping?.beta ?? 0)}</span>
      </div>
      <button type="button" onClick={onRun} disabled={running || !onRun}>
        {running ? ja.timeHistory.status.running : labels.runButton}
      </button>
    </section>
  );
}

function formatNumber(value: number | undefined): string {
  if (typeof value !== "number" || !Number.isFinite(value)) return "-";
  return String(value);
}
