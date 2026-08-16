import { useCallback, useMemo, useState } from "react";
import { ja } from "../i18n/ja";
import type { CanonicalWorkflowStep } from "./canonicalWorkflow";
import { isWorkflowStepEntryEnabled } from "./canonicalWorkflow";
import { CanonicalWorkflowNav } from "./CanonicalWorkflowNav";
import type { Project } from "../next/project/schema";
import { readBridgeWorkflowState, readRoadWorkflowState, writeBridgeWorkflowState, type BridgeWorkflowState } from "./workflowState";
import { computeSpanArrangement, totalSpanLength, RB001_BRIDGE_WORKFLOW_NAME } from "./roadBridgeSamples";
import styles from "./BridgeWorkflowPage.module.css";

export interface BridgeWorkflowPageProps {
  readonly project: Project | null;
  readonly onProjectChange: (next: Project) => void;
  readonly onBackToApp: () => void;
  readonly onNavigateStep: (step: CanonicalWorkflowStep) => void;
  readonly onOpenRoadWorkflow: () => void;
  readonly onOpenAnalysis: () => void;
}

export function BridgeWorkflowPage({
  project,
  onProjectChange,
  onBackToApp,
  onNavigateStep,
  onOpenRoadWorkflow,
  onOpenAnalysis,
}: BridgeWorkflowPageProps) {
  const text = ja.workflow.bridgeWorkflow;
  const [pierCount, setPierCount] = useState(5);

  const handleNavigateStep = useCallback(
    (step: CanonicalWorkflowStep) => {
      if (!isWorkflowStepEntryEnabled(step)) return;
      onNavigateStep(step);
    },
    [onNavigateStep],
  );

  const roadState = project ? readRoadWorkflowState(project) : undefined;
  const bridgeState = project ? readBridgeWorkflowState(project) : undefined;

  const arrangement = useMemo(() => {
    if (!roadState) return undefined;
    const { startStation, endStation } = roadState.bridgeCandidate;
    return computeSpanArrangement(startStation, endStation, pierCount);
  }, [roadState, pierCount]);

  const confirmBridge = useCallback(() => {
    if (project === null || roadState === undefined || arrangement === undefined) return;
    const { startStation, endStation } = roadState.bridgeCandidate;
    const state: BridgeWorkflowState = {
      bridgeId: "BR-RB001-1",
      name: RB001_BRIDGE_WORKFLOW_NAME,
      roadId: roadState.roadId,
      bridgeRange: {
        startStation,
        endStation,
        bridgeLength: endStation - startStation,
      },
      piers: arrangement.piers,
      spans: arrangement.spans,
      placedAt: new Date().toISOString(),
    };
    const next = writeBridgeWorkflowState(project, state);
    onProjectChange(next);
  }, [project, roadState, arrangement, onProjectChange]);

  if (project === null || roadState === undefined) {
    return (
      <div className={styles.page} data-testid="bridge-workflow-page">
        <header className={styles.header}>
          <button type="button" className={styles.backButton} onClick={onBackToApp} data-testid="bridge-workflow-back">
            {text.backToApp}
          </button>
          <h1 className={styles.title}>{text.title}</h1>
        </header>
        <section className={styles.guard} role="alert" data-testid="bridge-workflow-no-road">
          <p>{text.noRoadHint}</p>
          <button type="button" className={styles.primaryButton} onClick={onOpenRoadWorkflow} data-testid="bridge-workflow-open-road">
            {text.prevRoad}
          </button>
        </section>
      </div>
    );
  }

  const { startStation, endStation, nominalSpanM } = roadState.bridgeCandidate;
  const bridgeLength = endStation - startStation;

  return (
    <div className={styles.page} data-testid="bridge-workflow-page">
      <header className={styles.header}>
        <button type="button" className={styles.backButton} onClick={onBackToApp} data-testid="bridge-workflow-back">
          {text.backToApp}
        </button>
        <h1 className={styles.title}>{text.title}</h1>
      </header>
      <p className={styles.lead}>{text.lead}</p>

      <section className={styles.projectCard} data-testid="bridge-workflow-project-card">
        <span className={styles.projectLabel}>{ja.workflow.siteContextPage.projectLabel}</span>
        <span className={styles.projectName}>{project.name}</span>
        <span className={styles.projectId}>{project.projectId}</span>
      </section>

      <section className={styles.body}>
        <CanonicalWorkflowNav currentStepId="bridgePlacement" onNavigateStep={handleNavigateStep} />

        <div className={styles.panels}>
          <section className={styles.panel} data-testid="bridge-workflow-context">
            <h2 className={styles.panelTitle}>{text.roadLabel}</h2>
            <dl className={styles.infoList}>
              <InfoRow label={text.roadLabel} value={roadState.name} />
              <InfoRow label={text.bridgeIdLabel} value={roadState.roadId} />
              <InfoRow label={text.rangeTitle} value={`${startStation.toFixed(0)}〜${endStation.toFixed(0)} m`} />
              <InfoRow label={text.bridgeLength} value={`${bridgeLength.toFixed(0)} m`} />
              <InfoRow label={text.nominalSpan} value={`${nominalSpanM.toFixed(0)} m`} />
            </dl>
          </section>

          <section className={styles.panel} data-testid="bridge-workflow-span-config">
            <h2 className={styles.panelTitle}>{text.spanConfigTitle}</h2>
            <div className={styles.formRow}>
              <label className={styles.fieldLabel} htmlFor="bridge-workflow-pier-count">
                {text.pierCountLabel}
              </label>
              <input
                id="bridge-workflow-pier-count"
                type="number"
                min={0}
                max={20}
                value={pierCount}
                onChange={(e) => setPierCount(Number(e.target.value))}
                className={styles.numberInput}
                data-testid="bridge-workflow-pier-count"
              />
              {arrangement !== undefined && (
                <span className={styles.countHint}>
                  {text.spanConfigTitle}: {arrangement.spans.length} / {text.pierTitle}: {arrangement.piers.length}
                </span>
              )}
            </div>

            {arrangement !== undefined && (
              <div className={styles.tables} data-testid="bridge-workflow-arrangement">
                <h3 className={styles.sectionTitle}>{text.pierTitle}</h3>
                <table className={styles.table} data-testid="bridge-workflow-piers">
                  <thead>
                    <tr>
                      <th>{text.pierId}</th>
                      <th>{text.pierStation}</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>A1</td>
                      <td>{startStation.toFixed(0)} m</td>
                    </tr>
                    {arrangement.piers.map((pier) => (
                      <tr key={pier.supportId}>
                        <td>{pier.supportId}</td>
                        <td>{pier.station.toFixed(0)} m</td>
                      </tr>
                    ))}
                    <tr>
                      <td>A2</td>
                      <td>{endStation.toFixed(0)} m</td>
                    </tr>
                  </tbody>
                </table>

                <h3 className={styles.sectionTitle}>{text.spanConfigTitle}</h3>
                <table className={styles.table} data-testid="bridge-workflow-spans">
                  <thead>
                    <tr>
                      <th>{text.spanId}</th>
                      <th>{text.spanFromTo}</th>
                      <th>{text.spanLength}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {arrangement.spans.map((span) => (
                      <tr key={span.spanId}>
                        <td>{span.spanId}</td>
                        <td>
                          {span.startSupportId} → {span.endSupportId}
                        </td>
                        <td>{span.length.toFixed(1)} m</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p className={styles.totalRow} data-testid="bridge-workflow-total">
                  {text.totalSpanLength}: {totalSpanLength(arrangement.spans).toFixed(1)} m
                </p>
              </div>
            )}
          </section>

          <section className={styles.panel} data-testid="bridge-workflow-confirm">
            <h2 className={styles.panelTitle}>{text.placeBridgeButton}</h2>
            {bridgeState === undefined ? (
              <button type="button" className={styles.primaryButton} onClick={confirmBridge} data-testid="bridge-workflow-confirm-button">
                {text.placeBridgeButton}
              </button>
            ) : (
              <div className={styles.placedBox} data-testid="bridge-workflow-placed">
                <p className={styles.doneText}>{text.alreadyPlaced}</p>
                <p className={styles.doneRow}>
                  <strong>{text.bridgeIdLabel}:</strong> {bridgeState.bridgeId}
                </p>
                <p className={styles.doneRow}>
                  <strong>{text.placedAt}:</strong> {bridgeState.placedAt}
                </p>
              </div>
            )}
          </section>

          <footer className={styles.navRow}>
            <button type="button" className={styles.secondaryButton} onClick={onOpenRoadWorkflow} data-testid="bridge-workflow-prev">
              {text.prevRoad}
            </button>
            <button type="button" className={styles.primaryButton} onClick={onOpenAnalysis} data-testid="bridge-workflow-next">
              {text.nextAnalysis}
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