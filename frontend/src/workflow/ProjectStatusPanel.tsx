import { useMemo } from "react";
import type { Project } from "../next/project/schema";
import { deriveProjectStatus, type ProjectStatusReport } from "./projectStatus";
import styles from "./ProjectStatusPanel.module.css";

/**
 * Lane U Wave 3 U-6: Project Status パネル。
 *
 * Project data から導出した現在地点と次作業を表示する。
 * 独立の進捗 store は正本にしない (deriveProjectStatus が PDC modules から導出)。
 */
export interface ProjectStatusPanelProps {
  readonly project: Project | null;
  readonly onNavigateStep?: (stepId: string) => void;
}

const STEP_LABELS: Record<string, string> = {
  siteContext: "Site Context",
  road: "Road",
  bridgeLayout: "Bridge Layout",
  superstructure: "Superstructure",
  substructure: "Substructure",
  analysis: "Analysis",
  cim3d: "3D",
};

export function ProjectStatusPanel({ project, onNavigateStep }: ProjectStatusPanelProps) {
  const report: ProjectStatusReport | null = useMemo(
    () => (project ? deriveProjectStatus(project) : null),
    [project],
  );

  if (!report) {
    return (
      <section className={styles.panel} data-testid="project-status-panel">
        <h2 className={styles.title}>Project Status</h2>
        <p className={styles.empty}>Project が未接続です。</p>
      </section>
    );
  }

  const percent = report.totalCount === 0 ? 0 : Math.round((report.readyCount / report.totalCount) * 100);

  return (
    <section className={styles.panel} data-testid="project-status-panel">
      <h2 className={styles.title}>Project Status</h2>
      <div className={styles.summary}>
        <span className={styles.projectName}>{report.projectName}</span>
        <span className={styles.progress}>
          {report.readyCount}/{report.totalCount} ({percent}%)
        </span>
      </div>
      <div className={styles.bar} role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100}>
        <div className={styles.barFill} style={{ width: `${percent}%` }} />
      </div>
      <ol className={styles.steps}>
        {report.steps.map((step) => {
          const ready = step.state === "ready";
          const isCurrent = step.stepId === report.currentStepId;
          return (
            <li
              key={step.stepId}
              className={`${styles.step} ${ready ? styles.stepReady : ""} ${isCurrent ? styles.stepCurrent : ""}`}
              data-testid={`project-status-${step.stepId}`}
              data-state={step.state}
            >
              <span className={styles.stepState}>{ready ? "✓" : "○"}</span>
              <button
                type="button"
                className={styles.stepName}
                disabled={!isCurrent || !onNavigateStep}
                onClick={() => onNavigateStep?.(step.stepId)}
                data-testid={`project-status-goto-${step.stepId}`}
              >
                {STEP_LABELS[step.stepId] ?? step.stepId}
              </button>
              <span className={styles.stepDetail}>{step.detail}</span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}