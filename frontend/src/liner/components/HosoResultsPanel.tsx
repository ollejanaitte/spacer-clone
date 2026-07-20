import { ja } from "../../i18n/ja";
import type { HosoResultRow } from "../core/hoso/types";

export type HosoResultsPanelProps = {
  rows: readonly HosoResultRow[];
};

export function HosoResultsPanel({ rows }: HosoResultsPanelProps) {
  return (
    <section className="liner-edit-panel" data-testid="hoso-results-panel">
      <h2>{ja.liner.hoso.results}</h2>
      {rows.length === 0 ? (
        <p className="liner-edit-help">{ja.liner.hoso.noResults}</p>
      ) : (
        <table className="liner-edit-table">
          <thead>
            <tr>
              <th>{ja.liner.hoso.columnDefinition}</th>
              <th>{ja.liner.hoso.columnType}</th>
              <th>{ja.liner.hoso.columnStation}</th>
              <th>{ja.liner.hoso.columnOffset}</th>
              <th>{ja.liner.hoso.columnThickness}</th>
              <th>{ja.liner.hoso.columnElevation}</th>
              <th>{ja.liner.hoso.columnLine}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr
                key={`${row.definitionId}-${row.stationPhysicalDistance}-${index}`}
                data-testid="hoso-result-row"
              >
                <td>{row.definitionId}</td>
                <td>{row.type}</td>
                <td>{row.stationPhysicalDistance}</td>
                <td>{row.offsetM ?? ""}</td>
                <td>{row.pavementThicknessM}</td>
                <td>{row.pavementElevationM ?? ""}</td>
                <td>{row.lineId ?? ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
