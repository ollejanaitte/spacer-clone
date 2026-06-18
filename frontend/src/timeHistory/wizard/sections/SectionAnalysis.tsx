import type { ProjectModel } from "../../../types";
import { TimeHistorySettingsPanel } from "../../TimeHistorySettingsPanel";

type SectionAnalysisProps = {
  project: ProjectModel;
  running: boolean;
  onRun?: () => void;
  onProjectChange: (project: ProjectModel) => void;
};

export function SectionAnalysis({ project, running, onRun, onProjectChange }: SectionAnalysisProps) {
  return (
    <section className="time-history-wizard-section">
      <h3>解析条件設定</h3>
      <p>
        Newmark法は、時間を少しずつ進めながら構造物の揺れを計算する方法です。通常は初期値のままで進められます。
      </p>
      <div className="time-history-term-grid">
        <span><strong>dt</strong> 時間刻みです。地震波のdtと合わせます。</span>
        <span><strong>Rayleigh減衰</strong> 構造物の揺れが減っていく効果を表します。</span>
        <span><strong>解析時間</strong> 計算を行う総時間です。地震波長と合わせると扱いやすくなります。</span>
      </div>
      <TimeHistorySettingsPanel project={project} running={running} onRun={onRun} onChange={onProjectChange} />
    </section>
  );
}
