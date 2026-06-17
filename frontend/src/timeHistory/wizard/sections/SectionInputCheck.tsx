import { ja } from "../../../i18n/ja";
import type { TimeHistoryCheckItem, TimeHistorySectionId } from "../wizardState";

const sectionLabel: Record<TimeHistorySectionId, string> = {
  intro: ja.timeHistoryWizard.sideNav.intro,
  inputCheck: ja.timeHistoryWizard.sideNav.inputCheck,
  groundMotion: ja.timeHistoryWizard.sideNav.groundMotion,
  analysis: ja.timeHistoryWizard.sideNav.analysis,
  output: ja.timeHistoryWizard.sideNav.output,
  run: ja.timeHistoryWizard.sideNav.run,
  results: ja.timeHistoryWizard.sideNav.results,
};

const itemLabel: Record<string, string> = {
  model: ja.timeHistoryWizard.inputCheck.items.model,
  supports: ja.timeHistoryWizard.inputCheck.items.supports,
  mass: ja.timeHistoryWizard.inputCheck.items.mass,
  groundMotion: ja.timeHistoryWizard.inputCheck.items.groundMotion,
  unit: ja.timeHistoryWizard.inputCheck.items.unit,
  dt: ja.timeHistoryWizard.inputCheck.items.dt,
  duration: ja.timeHistoryWizard.inputCheck.items.duration,
  outputTarget: ja.timeHistoryWizard.inputCheck.items.outputTarget,
  analysis: ja.timeHistoryWizard.inputCheck.items.analysis,
  animation: ja.timeHistoryWizard.inputCheck.items.animation,
};

const stateLabel: Record<TimeHistoryCheckItem["state"], string> = {
  ok: ja.timeHistoryWizard.inputCheck.states.ok,
  ng: ja.timeHistoryWizard.inputCheck.states.ng,
  warning: ja.timeHistoryWizard.inputCheck.states.warning,
  unchecked: ja.timeHistoryWizard.inputCheck.states.unchecked,
};

type SectionInputCheckProps = {
  items: TimeHistoryCheckItem[];
  onNavigate: (section: TimeHistorySectionId) => void;
};

export function SectionInputCheck({ items, onNavigate }: SectionInputCheckProps) {
  const labels = ja.timeHistoryWizard.inputCheck;
  return (
    <section className="time-history-wizard-section section-input-check" aria-label={labels.heading}>
      <h2>{labels.heading}</h2>
      <p className="time-history-wizard-help">{labels.help}</p>
      <table className="time-history-input-check">
        <thead>
          <tr>
            <th>{"項目"}</th>
            <th>{"状態"}</th>
            <th>{"理由"}</th>
            <th>{"対応方法"}</th>
            <th>{"移動"}</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id} className={"input-check-row " + item.state}>
              <td>{itemLabel[item.id] ?? item.id}</td>
              <td><span className={"input-check-state state-" + item.state}>{stateLabel[item.state]}</span></td>
              <td>{item.reason}</td>
              <td>{item.remedy}</td>
              <td>
                <button
                  type="button"
                  onClick={() => onNavigate(item.sectionId)}
                  aria-label={labels.goToButton({ section: sectionLabel[item.sectionId] })}
                >
                  {sectionLabel[item.sectionId] + "へ移動"}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
