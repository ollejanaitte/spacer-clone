import locale from "../../../i18n/locales/ja.json";

export function SectionIntro() {
  const text = locale.thAnalysis.intro;
  return (
    <section className="time-history-wizard-section">
      <h3>{text.heading}</h3>
      <p>{text.lead}</p>
      <ol className="time-history-flow-list">
        {text.flow.map((item) => <li key={item}>{item}</li>)}
      </ol>
      <p className="time-history-help-text">{text.help}</p>
    </section>
  );
}
