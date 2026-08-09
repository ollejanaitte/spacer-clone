import { useCallback, useMemo, useState } from "react";
import { ja } from "../../i18n/ja";
import type { BusinessSummary } from "../business/businessRegistry";
import { isWorkspaceSection, WORKSPACE_SECTIONS, type WorkspaceSection } from "./sections";
import styles from "./BusinessWorkspace.module.css";

export type BusinessWorkspaceProps = {
  business: BusinessSummary;
  initialSection?: WorkspaceSection;
  onSectionChange?: (section: WorkspaceSection) => void;
  onSave: () => void;
  onBack: () => void;
};

export function BusinessWorkspace({
  business,
  initialSection = "overview",
  onSectionChange,
  onSave,
  onBack,
}: BusinessWorkspaceProps) {
  const text = ja.designPlatform.workspace;
  const [activeSection, setActiveSection] = useState<WorkspaceSection>(() =>
    isWorkspaceSection(initialSection) ? initialSection : "overview",
  );

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
        </section>
      </main>

      <footer className={styles.footer}>
        <span className={styles.footerHint}>{text.footerHint}</span>
      </footer>
    </div>
  );
}
