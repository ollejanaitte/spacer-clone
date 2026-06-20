import type { ProjectModel } from "../../../types";
import { ja } from "../../../i18n/ja";
import { GroundMotionManagerPanel } from "../../GroundMotionManagerPanel";
import {
  migrateTimeHistorySettings,
  type TimeHistoryAxis,
  type TimeHistoryV2Settings,
} from "../../settingsMigration";
import { expectedSampleCount, groundMotionDuration } from "../wizardState";

type SectionGroundMotionProps = {
  project: ProjectModel;
  onProjectChange: (project: ProjectModel) => void;
};

export function SectionGroundMotion({ project, onProjectChange }: SectionGroundMotionProps) {
  const normalizedProject = migrateTimeHistorySettings(project);
  const settings = normalizedProject.analysisSettings.timeHistory as TimeHistoryV2Settings | undefined;
  const groundMotions = normalizedProject.groundMotions ?? [];
  const enabledAssignments = settings
    ? (["x", "y", "z"] as TimeHistoryAxis[])
        .map((axis) => ({ axis, assignment: settings.groundMotions[axis] }))
        .filter(({ assignment }) => assignment.enabled && assignment.groundMotionId)
    : [];
  const motion = groundMotions.find((item) => item.id === enabledAssignments[0]?.assignment.groundMotionId) ?? groundMotions[0];
  const timeStep = settings?.timeStep ?? motion?.timeStep;
  const duration = settings?.duration ?? motion?.duration;
  const waveformLength = groundMotionDuration(motion?.samples.length ?? 0, timeStep);
  const expected = expectedSampleCount(duration, timeStep);
  const canFitDuration = waveformLength !== null;

  const fitDurationToMotion = () => {
    if (waveformLength === null || !settings) return;
    onProjectChange({
      ...normalizedProject,
      analysisSettings: {
        ...normalizedProject.analysisSettings,
        timeHistory: {
          ...settings,
          timeStep: timeStep ?? motion?.timeStep ?? 0.05,
          duration: waveformLength,
        },
      },
    });
  };

  const updateAxis = (
    axis: TimeHistoryAxis,
    patch: Partial<{ enabled: boolean; groundMotionId: string | null }>,
  ) => {
    if (!settings) return;
    onProjectChange({
      ...normalizedProject,
      analysisSettings: {
        ...normalizedProject.analysisSettings,
        timeHistory: {
          ...settings,
          schemaVersion: 2,
          groundMotions: {
            ...settings.groundMotions,
            [axis]: { ...settings.groundMotions[axis], ...patch },
          },
        },
      },
    });
  };
  const selectedTimeSteps = new Set(enabledAssignments.flatMap(({ assignment }) => {
    const selected = groundMotions.find((item) => item.id === assignment.groundMotionId);
    return selected ? [selected.timeStep] : [];
  }));

  return (
    <section className="time-history-wizard-section">
      <h3>地震波設定</h3>
      <p>地震波ファイルを読み込み、単位・dt・波形長・解析時間との整合を確認します。</p>
      <table className="time-history-axis-table">
        <thead><tr><th>Direction</th><th>Enable</th><th>Ground Motion</th></tr></thead>
        <tbody>
          {(["x", "y", "z"] as TimeHistoryAxis[]).map((axis) => {
            const assignment = settings?.groundMotions[axis] ?? { enabled: false, groundMotionId: null };
            return (
              <tr key={axis}>
                <td>{axis.toUpperCase()}</td>
                <td>
                  <input
                    aria-label={`${axis.toUpperCase()} Enable`}
                    type="checkbox"
                    checked={assignment.enabled}
                    onChange={(event) => updateAxis(axis, { enabled: event.currentTarget.checked })}
                  />
                </td>
                <td>
                  <select
                    aria-label={`${axis.toUpperCase()} Ground Motion`}
                    value={assignment.groundMotionId ?? ""}
                    disabled={!assignment.enabled}
                    onChange={(event) => updateAxis(axis, { groundMotionId: event.currentTarget.value || null })}
                  >
                    <option value="">-</option>
                    {groundMotions.map((item) => (
                      <option key={item.id} value={item.id}>{item.name || item.id}</option>
                    ))}
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
      <h4>{ja.timeHistoryWizard.groundMotion.cardHeading}</h4>
      <div className="time-history-ground-motion-summary">
        <span>データ点数: {motion?.samples.length ?? 0}</span>
        <span>dt: {timeStep ?? "-"} 秒</span>
        <span>波形長: {waveformLength === null ? "-" : `${waveformLength.toFixed(6)} 秒`}</span>
        <span>現在の解析時間: {duration ?? "-"} 秒</span>
        <span>解析に必要な点数: {expected ?? "-"}</span>
      </div>
      <button type="button" disabled={!canFitDuration} onClick={fitDurationToMotion}>
        解析時間を地震波に合わせる
      </button>
      <GroundMotionManagerPanel project={normalizedProject} onChange={onProjectChange} />
    </section>
  );
}
