import type { ProjectModel, StructuredMessage, TimeHistoryResult } from "../types";
import { GroundMotionManagerPanel } from "./GroundMotionManagerPanel";
import { TimeHistoryResultViewer } from "./TimeHistoryResultViewer";
import { TimeHistorySettingsPanel } from "./TimeHistorySettingsPanel";

type TimeHistoryModalProps = {
  open: boolean;
  project: ProjectModel;
  result?: TimeHistoryResult | null;
  error?: StructuredMessage | null;
  running?: boolean;
  onClose: () => void;
  onRun: () => void;
  onProjectChange: (project: ProjectModel) => void;
  onAnimationOverrideChange?: (override: Map<string, { x: number; y: number; z: number }> | null) => void;
};

export function TimeHistoryModal({
  open,
  project,
  result = null,
  error = null,
  running = false,
  onClose,
  onRun,
  onProjectChange,
  onAnimationOverrideChange,
}: TimeHistoryModalProps) {
  if (!open) return null;

  return (
    <div className="modal-backdrop time-history-modal-backdrop" role="presentation">
      <section
        className="modal-panel time-history-modal-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="time-history-modal-title"
      >
        <header className="modal-header time-history-modal-header">
          <div>
            <h2 id="time-history-modal-title">時刻歴応答解析</h2>
            <p>地震波、解析条件、実行結果、アニメーション確認をこの画面で扱います。</p>
          </div>
          <button type="button" className="secondary-button" onClick={onClose}>
            閉じる
          </button>
        </header>
        <div className="time-history-modal-content">
          <GroundMotionManagerPanel project={project} onChange={onProjectChange} />
          <TimeHistorySettingsPanel project={project} running={running} onRun={onRun} onChange={onProjectChange} />
          <TimeHistoryResultViewer
            project={project}
            result={result}
            error={error}
            status={running ? "running" : result?.meta?.status}
            onOverrideChange={onAnimationOverrideChange}
          />
        </div>
      </section>
    </div>
  );
}
