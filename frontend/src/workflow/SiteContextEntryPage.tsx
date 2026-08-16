import { useCallback } from "react";
import { ja } from "../i18n/ja";
import type { CanonicalWorkflowStep } from "./canonicalWorkflow";
import { isWorkflowStepEntryEnabled } from "./canonicalWorkflow";
import { CanonicalWorkflowNav } from "./CanonicalWorkflowNav";
import styles from "./SiteContextEntryPage.module.css";

export interface SiteContextEntryPageProps {
  readonly projectName: string;
  readonly projectId: string;
  readonly isEmptyProject: boolean;
  readonly onBackToApp: () => void;
  readonly onNavigateStep: (step: CanonicalWorkflowStep) => void;
  readonly onOpenWorkflow?: () => void;
}

const SOURCES = [
  { id: "map", nameKey: "sourceMapName", descriptionKey: "sourceMapDescription", highlight: true },
  {
    id: "cad2d",
    nameKey: "sourceCad2dName",
    descriptionKey: "sourceCad2dDescription",
    highlight: false,
  },
  {
    id: "cad3d",
    nameKey: "sourceCad3dName",
    descriptionKey: "sourceCad3dDescription",
    highlight: false,
  },
  {
    id: "survey",
    nameKey: "sourceSurveyName",
    descriptionKey: "sourceSurveyDescription",
    highlight: false,
  },
] as const;

export function SiteContextEntryPage({
  projectName,
  projectId,
  isEmptyProject,
  onBackToApp,
  onNavigateStep,
  onOpenWorkflow,
}: SiteContextEntryPageProps) {
  const text = ja.workflow;

  const handleNavigateStep = useCallback(
    (step: CanonicalWorkflowStep) => {
      if (!isWorkflowStepEntryEnabled(step) || step.route === null) return;
      onNavigateStep(step);
    },
    [onNavigateStep],
  );

  const openProject = useCallback(() => {
    onBackToApp();
  }, [onBackToApp]);

  return (
    <div className={styles.page} data-testid="site-context-entry-page">
      <header className={styles.header}>
        <button
          type="button"
          className={styles.backButton}
          onClick={onBackToApp}
          data-testid="site-context-back"
        >
          {text.nav.backToApp}
        </button>
        <h1 className={styles.title}>{text.siteContext.title}</h1>
      </header>
      <p className={styles.lead}>{text.siteContext.lead}</p>

      <section className={styles.projectCard} data-testid="site-context-project-card">
        <span className={styles.projectLabel}>{text.siteContext.projectLabel}</span>
        <span className={styles.projectName}>{projectName}</span>
        <span className={styles.projectId}>{projectId}</span>
      </section>

      {isEmptyProject && (
        <section className={styles.guard} role="alert" data-testid="site-context-empty-guard">
          <h2 className={styles.guardTitle}>{text.siteContext.emptyProjectTitle}</h2>
          <p className={styles.guardLead}>{text.siteContext.emptyProjectLead}</p>
          <button
            type="button"
            className={styles.primaryButton}
            onClick={openProject}
            data-testid="site-context-open-project"
          >
            {text.siteContext.openProject}
          </button>
        </section>
      )}

      <section className={styles.body}>
        <CanonicalWorkflowNav currentStepId="siteContext" onNavigateStep={handleNavigateStep} />

        <section className={styles.sourcePanel} aria-label={text.siteContext.sourceGridLabel}>
          {!isEmptyProject && onOpenWorkflow && (
            <div className={styles.startRow}>
              <button
                type="button"
                className={styles.primaryButton}
                onClick={onOpenWorkflow}
                data-testid="site-context-start-workflow"
              >
                {text.siteContext.startWorkflow}
              </button>
            </div>
          )}
          <h2 className={styles.sourceTitle}>{text.siteContext.sourceGridLabel}</h2>
          <div className={styles.sourceGrid}>
            {SOURCES.map((source) => {
              const pending = !source.highlight;
              return (
                <button
                  key={source.id}
                  type="button"
                  className={`${styles.sourceCard} ${source.highlight ? styles.sourceHighlight : ""}`}
                  disabled={pending}
                  data-testid={`site-context-source-${source.id}`}
                  title={pending ? text.connectionStatus.pending : undefined}
                >
                  <span className={styles.sourceName}>{text.siteContext[source.nameKey]}</span>
                  <span className={styles.sourceDescription}>
                    {text.siteContext[source.descriptionKey]}
                  </span>
                  {pending && (
                    <span className={styles.sourcePendingBadge}>{text.connectionStatus.pending}</span>
                  )}
                </button>
              );
            })}
          </div>
        </section>
      </section>

      <footer className={styles.footer}>
        <button type="button" className={styles.laterButton} onClick={onBackToApp}>
          {text.siteContext.later}
        </button>
      </footer>
    </div>
  );
}