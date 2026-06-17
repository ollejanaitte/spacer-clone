import { ja } from "../../../i18n/ja";

export function SectionIntro() {
  const labels = ja.timeHistoryWizard.intro;
  return (
    <section className="time-history-wizard-section section-intro" aria-label={labels.heading}>
      <h2>{labels.heading}</h2>
      <p className="time-history-wizard-lead">{labels.lead}</p>
      <h3>{labels.stepsHeading}</h3>
      <ol className="time-history-wizard-steps">
        <li>{labels.step1}</li>
        <li>{labels.step2}</li>
        <li>{labels.step3}</li>
        <li>{labels.step4}</li>
        <li>{labels.step5}</li>
      </ol>
      <p className="time-history-wizard-help">{labels.help}</p>
    </section>
  );
}
