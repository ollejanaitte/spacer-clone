import { L0_STRINGS } from "../data/level0Strings";

export function LegendOverlay() {
  const text = L0_STRINGS.legend;

  return (
    <div className="level0-legend-overlay">
      <h3>{text.title}</h3>
      <ul>
        <li>{text.blue}</li>
        <li>{text.green}</li>
        <li>{text.yellow}</li>
        <li>{text.red}</li>
      </ul>
      <p>{text.caveat}</p>
    </div>
  );
}
