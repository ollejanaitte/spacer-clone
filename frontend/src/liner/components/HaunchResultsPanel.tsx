import { ja } from "../../i18n/ja";
import type { HaunchResultRow } from "../core/haunch/types";

export type HaunchResultsPanelProps = {
  rows: readonly HaunchResultRow[];
};

export function HaunchResultsPanel({ rows }: HaunchResultsPanelProps) {
  return (
    <section className="liner-edit-panel" data-testid="haunch-results-panel">
      <h2>{ja.liner.haunch.results}</h2>
      {rows.length === 0 ? (
        <p className="liner-edit-help">{ja.liner.haunch.noResults}</p>
      ) : (
        <table className="liner-edit-table">
          <thead>
            <tr>
              <th>{ja.liner.haunch.columnDefinition}</th>
              <th>{ja.liner.haunch.columnType}</th>
              <th>{ja.liner.haunch.columnStation}</th>
              <th>{ja.liner.haunch.columnTopElevation}</th>
              <th>{ja.liner.haunch.columnThickness}</th>
              <th>{ja.liner.haunch.columnSide}</th>
              <th>{ja.liner.haunch.columnLine}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr
                key={`${row.definitionId}-${row.stationPhysicalDistance}-${index}`}
                data-testid="haunch-result-row"
              >
                <td>{row.definitionId}</td>
                <td>{row.type}</td>
                <td>{row.stationPhysicalDistance}</td>
                <td>{row.haunchTopElevationM}</td>
                <td>{row.haunchThicknessM ?? ""}</td>
                <td>{row.side ?? ""}</td>
                <td>{row.lineId ?? ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
