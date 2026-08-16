import { useCallback, useMemo } from "react";
import { ja } from "../i18n/ja";
import type { CanonicalWorkflowStep } from "./canonicalWorkflow";
import { isWorkflowStepEntryEnabled } from "./canonicalWorkflow";
import { CanonicalWorkflowNav } from "./CanonicalWorkflowNav";
import type { Project } from "../next/project/schema";
import { readRoadWorkflowState, writeRoadWorkflowState, type RoadWorkflowState } from "./workflowState";
import { buildRb001RoadWorkflowState } from "./roadBridgeSamples";
import { buildReferenceBusiness001RoadSample } from "../liner/samples/reference-business-001/roadAlignment";
import { ProjectStatusPanel } from "./ProjectStatusPanel";
import styles from "./RoadWorkflowPage.module.css";

export interface RoadWorkflowPageProps {
  readonly project: Project | null;
  readonly onProjectChange: (next: Project) => void;
  readonly onBackToApp: () => void;
  readonly onNavigateStep: (step: CanonicalWorkflowStep) => void;
  readonly onOpenSiteContext: () => void;
  readonly onOpenBridgeWorkflow: () => void;
}

const ELEMENT_TYPE_LABELS: Record<string, string> = {
  straight: "ST",
  arc: "ARC",
  clothoid: "CLO",
};

export function RoadWorkflowPage({
  project,
  onProjectChange,
  onBackToApp,
  onNavigateStep,
  onOpenSiteContext,
  onOpenBridgeWorkflow,
}: RoadWorkflowPageProps) {
  const text = ja.workflow.roadWorkflow;
  const sample = useMemo(() => buildReferenceBusiness001RoadSample(), []);

  const handleNavigateStep = useCallback(
    (step: CanonicalWorkflowStep) => {
      if (!isWorkflowStepEntryEnabled(step)) return;
      onNavigateStep(step);
    },
    [onNavigateStep],
  );

  const placedState: RoadWorkflowState | undefined = project ? readRoadWorkflowState(project) : undefined;

  const placeRoad = useCallback(() => {
    if (project === null) return;
    const next = writeRoadWorkflowState(project, buildRb001RoadWorkflowState(new Date().toISOString()));
    onProjectChange(next);
  }, [project, onProjectChange]);

  if (project === null) {
    return (
      <div className={styles.page} data-testid="road-workflow-page">
        <header className={styles.header}>
          <button type="button" className={styles.backButton} onClick={onBackToApp} data-testid="road-workflow-back">
            {text.backToApp}
          </button>
          <h1 className={styles.title}>{text.title}</h1>
        </header>
        <section className={styles.guard} role="alert" data-testid="road-workflow-no-project">
          <p>{text.prevSiteContext}</p>
          <button type="button" className={styles.primaryButton} onClick={onOpenSiteContext} data-testid="road-workflow-open-site-context">
            {text.prevSiteContext}
          </button>
        </section>
      </div>
    );
  }

  return (
    <div className={styles.page} data-testid="road-workflow-page">
      <header className={styles.header}>
        <button type="button" className={styles.backButton} onClick={onBackToApp} data-testid="road-workflow-back">
          {text.backToApp}
        </button>
        <h1 className={styles.title}>{text.title}</h1>
      </header>
      <p className={styles.lead}>{text.lead}</p>

      <section className={styles.projectCard} data-testid="road-workflow-project-card">
        <span className={styles.projectLabel}>{ja.workflow.siteContextPage.projectLabel}</span>
        <span className={styles.projectName}>{project.name}</span>
        <span className={styles.projectId}>{project.projectId}</span>
      </section>

      <section className={styles.body}>
        <CanonicalWorkflowNav currentStepId="road" onNavigateStep={handleNavigateStep} />
        <ProjectStatusPanel project={project} />

        <div className={styles.panels}>
          <section className={styles.panel} data-testid="road-workflow-sample">
            <h2 className={styles.panelTitle}>{text.sourceLabel}</h2>
            <dl className={styles.infoList}>
              <InfoRow label={text.roadId} value={sample.id} />
              <InfoRow label={text.roadName} value={sample.name} />
              <InfoRow label={text.alignmentId} value={sample.horizontal.id} />
              <InfoRow label={text.lengthLabel} value={`${sample.horizontal.elements.reduce((sum, e) => sum + e.length, 0).toFixed(0)} m`} />
            </dl>

            <h3 className={styles.sectionTitle}>{text.elementsLabel}</h3>
            <table className={styles.table} data-testid="road-workflow-elements">
              <thead>
                <tr>
                  <th>{text.elementId}</th>
                  <th>{text.elementType}</th>
                  <th>{text.elementLength}</th>
                </tr>
              </thead>
              <tbody>
                {sample.horizontal.elements.map((element) => (
                  <tr key={element.id}>
                    <td>{element.id}</td>
                    <td>{ELEMENT_TYPE_LABELS[element.type] ?? element.type}</td>
                    <td>{element.length.toFixed(0)} m</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <section className={styles.panel} data-testid="road-workflow-bridge-candidate">
            <h2 className={styles.panelTitle}>{text.bridgeCandidateTitle}</h2>
            <dl className={styles.infoList}>
              <InfoRow label={text.startStation} value={`${sample.bridgeCandidate.startStation.toFixed(0)} m`} />
              <InfoRow label={text.endStation} value={`${sample.bridgeCandidate.endStation.toFixed(0)} m`} />
              <InfoRow label={text.nominalSpan} value={`${sample.bridgeCandidate.nominalSpanM.toFixed(0)} m`} />
              <InfoRow label={text.note} value={sample.bridgeCandidate.note} />
            </dl>
          </section>

          <section className={styles.panel} data-testid="road-workflow-placement">
            <h2 className={styles.panelTitle}>{text.placeRoadButton}</h2>
            {placedState === undefined ? (
              <button type="button" className={styles.primaryButton} onClick={placeRoad} data-testid="road-workflow-place">
                {text.placeRoadButton}
              </button>
            ) : (
              <div className={styles.placedBox} data-testid="road-workflow-placed">
                <p className={styles.doneText}>{text.alreadyPlaced}</p>
                <p className={styles.doneRow}>
                  <strong>{text.roadId}:</strong> {placedState.roadId}
                </p>
                <p className={styles.doneRow}>
                  <strong>{text.placedAt}:</strong> {placedState.placedAt}
                </p>
              </div>
            )}
          </section>

          <footer className={styles.navRow}>
            <button type="button" className={styles.secondaryButton} onClick={onOpenSiteContext} data-testid="road-workflow-prev">
              {text.prevSiteContext}
            </button>
            <button type="button" className={styles.primaryButton} onClick={onOpenBridgeWorkflow} data-testid="road-workflow-next">
              {text.nextBridge}
            </button>
          </footer>
        </div>
      </section>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className={styles.infoRow}>
      <dt className={styles.infoLabel}>{label}</dt>
      <dd className={styles.infoValue}>{value}</dd>
    </div>
  );
}