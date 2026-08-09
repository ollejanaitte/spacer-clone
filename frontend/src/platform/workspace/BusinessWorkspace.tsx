import { useCallback, useMemo, useState } from "react";
import { ja } from "../../i18n/ja";
import type { BusinessSummary } from "../business/businessRegistry";
import { isWorkspaceSection, WORKSPACE_SECTIONS, type WorkspaceSection } from "./sections";
import { createToolBindings } from "../tools/toolBindings";
import { guidedProgress, resolveGuidedNavigation } from "../workflow/guidedNavigation";
import { bindBusinessReadiness, type SectionStatusSource } from "../workflow/businessReadiness";
import {
  evaluateConfirmationGate,
  type ConfirmationGateInput,
} from "../workflow/confirmationGate";
import { ReadinessPanel } from "../components/ReadinessPanel";
import { ConfirmationGatePanel } from "../components/ConfirmationGatePanel";
import styles from "./BusinessWorkspace.module.css";

export type BusinessWorkspaceProps = {
  business: BusinessSummary;
  initialSection?: WorkspaceSection;
  onSectionChange?: (section: WorkspaceSection) => void;
  onSave: () => void;
  onBack: () => void;
  onLaunchTool?: (section: WorkspaceSection) => void;
  statusSource?: SectionStatusSource;
  confirmationGate?: ConfirmationGateInput;
  saveFeedback?: string | null;
};

export function BusinessWorkspace({
  business,
  initialSection = "overview",
  onSectionChange,
  onSave,
  onBack,
  onLaunchTool,
  statusSource,
  confirmationGate,
  saveFeedback,
}: BusinessWorkspaceProps) {
  const text = ja.designPlatform.workspace;
  const [activeSection, setActiveSection] = useState<WorkspaceSection>(() =>
    isWorkspaceSection(initialSection) ? initialSection : "overview",
  );

  const readiness = useMemo(
    () => bindBusinessReadiness(statusSource ?? { sections: {} }),
    [statusSource],
  );

  const gate = useMemo(
    () =>
      evaluateConfirmationGate(
        confirmationGate ?? {
          notAuthorizedSections: [],
          needsUserConfirmation: false,
          cycleGuardActive: false,
          validationErrors: 0,
          validationWarnings: 0,
        },
      ),
    [confirmationGate],
  );

  // Save is always allowed for work-in-progress data. The confirmation gate
  // only governs workflow progression / calculation authorization, never
  // blocks saving the user's intermediate work.

  const selectSection = useCallback(
    (section: WorkspaceSection) => {
      setActiveSection(section);
      onSectionChange?.(section);
    },
    [onSectionChange],
  );

  const sectionTabs = useMemo(
    () =>
      WORKSPACE_SECTIONS.map((section) => ({
        section,
        label: text.sectionLabels[section],
      })),
    [text],
  );

  const bindings = useMemo(() => createToolBindings(), []);
  const activeBinding = bindings.resolveBinding(activeSection);

  const guided = useMemo(() => resolveGuidedNavigation(activeSection), [activeSection]);
  const progress = useMemo(() => guidedProgress(activeSection), [activeSection]);

  const launchActiveTool = useCallback(() => {
    if (activeBinding !== null && activeBinding.available) {
      onLaunchTool?.(activeSection);
    }
  }, [activeBinding, activeSection, onLaunchTool]);

  const goGuided = useCallback(
    (section: WorkspaceSection | null) => {
      if (section !== null) {
        selectSection(section);
      }
    },
    [selectSection],
  );

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <button type="button" className={styles.backButton} onClick={onBack}>
          {text.back}
        </button>
        <div className={styles.titleBlock}>
          <h1 className={styles.title}>{business.projectName}</h1>
          <p className={styles.meta}>
            {text.projectNumberLabel}: {business.projectNumber}
            {"　"}
            {text.stageLabel}: {text.stageLabels[business.designStage]}
          </p>
        </div>
        <button
          type="button"
          className={styles.saveButton}
          onClick={onSave}
          data-testid="workspace-save"
        >
          {text.save}
        </button>
      </header>

      {saveFeedback !== null && saveFeedback !== undefined && (
        <p className={styles.saveFeedback} data-testid="workspace-save-feedback">
          {saveFeedback}
        </p>
      )}

      <nav className={styles.tabs} aria-label={text.tabsAria}>
        {sectionTabs.map(({ section, label }) => (
          <button
            key={section}
            type="button"
            className={activeSection === section ? styles.tabActive : styles.tab}
            onClick={() => selectSection(section)}
            data-testid={`workspace-tab-${section}`}
            aria-current={activeSection === section ? "page" : undefined}
          >
            {label}
          </button>
        ))}
      </nav>

      <main className={styles.viewport} data-testid={`workspace-section-${activeSection}`}>
        <section className={styles.sectionBody}>
          <h2 className={styles.sectionTitle}>{text.sectionLabels[activeSection]}</h2>
          <p className={styles.sectionNotice}>{text.sectionNotices[activeSection]}</p>
          <ReadinessPanel readiness={readiness} />
          <ConfirmationGatePanel state={gate} />
          {activeBinding !== null && (
            <div className={styles.launchArea}>
              <p className={styles.launchDescription}>
                {text.launchDescription.replace("{tool}", activeBinding.toolName)}
              </p>
              <button
                type="button"
                className={styles.launchButton}
                onClick={launchActiveTool}
                disabled={!activeBinding.available}
                data-testid={`workspace-launch-${activeSection}`}
              >
                {text.launchAction.replace("{tool}", activeBinding.toolName)}
              </button>
            </div>
          )}
        </section>
      </main>

      <footer className={styles.footer}>
        <div className={styles.guidedBar}>
          <button
            type="button"
            className={styles.guidedButton}
            onClick={() => goGuided(guided.prev)}
            disabled={!guided.hasPrev}
            data-testid="guided-prev"
          >
            {text.guided.prev}
          </button>
          <button
            type="button"
            className={styles.saveInlineButton}
            onClick={onSave}
            data-testid="guided-save"
          >
            {text.guided.save}
          </button>
          <button
            type="button"
            className={styles.guidedButton}
            onClick={() => goGuided(guided.next)}
            disabled={!guided.hasNext}
            data-testid="guided-next"
          >
            {text.guided.next}
          </button>
        </div>
        <span className={styles.footerHint}>
          {text.footerHint}
          {"　"}
          {text.guided.progress.replace("{current}", String(progress)).replace(
            "{total}",
            String(WORKSPACE_SECTIONS.length),
          )}
        </span>
      </footer>
    </div>
  );
}
