import { ja } from "../../i18n/ja";
import type { TimeHistorySectionId } from "./wizardState";

const sectionLabels: Record<TimeHistorySectionId, string> = {
  intro: ja.timeHistoryWizard.sideNav.intro,
  inputCheck: ja.timeHistoryWizard.sideNav.inputCheck,
  groundMotion: ja.timeHistoryWizard.sideNav.groundMotion,
  analysis: ja.timeHistoryWizard.sideNav.analysis,
  output: ja.timeHistoryWizard.sideNav.output,
  run: ja.timeHistoryWizard.sideNav.run,
  results: ja.timeHistoryWizard.sideNav.results,
};

type TimeHistoryWizardSideNavProps = {
  active: TimeHistorySectionId;
  onSelect: (section: TimeHistorySectionId) => void;
};

const order: TimeHistorySectionId[] = [
  "intro",
  "inputCheck",
  "groundMotion",
  "analysis",
  "output",
  "run",
  "results",
];

export function TimeHistoryWizardSideNav({ active, onSelect }: TimeHistoryWizardSideNavProps) {
  return (
    <nav className="time-history-wizard-side-nav" aria-label={"wizard side nav"}>
      <ol>
        {order.map((section, index) => (
          <li key={section}>
            <button
              type="button"
              className={active === section ? "active" : ""}
              onClick={() => onSelect(section)}
            >
              <span className="wizard-step-index">{index + 1}</span>
              <span>{sectionLabels[section]}</span>
            </button>
          </li>
        ))}
      </ol>
    </nav>
  );
}
