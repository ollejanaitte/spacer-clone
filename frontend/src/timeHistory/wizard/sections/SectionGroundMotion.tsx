import type { ProjectModel } from "../../../types";
import { GroundMotionManagerPanel } from "../../GroundMotionManagerPanel";
import { expectedSampleCount, groundMotionDuration } from "../wizardState";

type SectionGroundMotionProps = {
  project: ProjectModel;
  onProjectChange: (project: ProjectModel) => void;
};

export function SectionGroundMotion({ project, onProjectChange }: SectionGroundMotionProps) {
  const settings = project.analysisSettings.timeHistory;
  const motion = project.groundMotions?.find((item) => item.id === settings?.groundMotionId) ?? project.groundMotions?.[0];
  const timeStep = settings?.timeStep ?? motion?.timeStep;
  const duration = settings?.duration ?? motion?.duration;
  const waveformLength = groundMotionDuration(motion?.samples.length ?? 0, timeStep);
  const expected = expectedSampleCount(duration, timeStep);
  const canFitDuration = waveformLength !== null;

  const fitDurationToMotion = () => {
    if (waveformLength === null) return;
    onProjectChange({
      ...project,
      analysisSettings: {
        ...project.analysisSettings,
        timeHistory: {
          enabled: true,
          method: "newmark-beta",
          timeStep: timeStep ?? motion?.timeStep ?? 0.05,
          duration: waveformLength,
          beta: settings?.beta ?? 0.25,
          gamma: settings?.gamma ?? 0.5,
          damping: settings?.damping ?? { type: "rayleigh", alpha: 0, beta: 0 },
          massCaseId: settings?.massCaseId ?? project.massCases?.[0]?.id ?? "",
          groundMotionId: settings?.groundMotionId ?? motion?.id ?? "",
          direction: settings?.direction ?? motion?.direction ?? "X",
        },
      },
    });
  };

  return (
    <section className="time-history-wizard-section">
      <h3>地震波設定</h3>
      <p>地震波ファイルを読み込み、単位・dt・波形長・解析時間との整合を確認します。</p>
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
      <GroundMotionManagerPanel project={project} onChange={onProjectChange} />
    </section>
  );
}
