import { ja } from "../../i18n/ja";
import type { LdistResultRow } from "../core/ldist/types";

export type LdistResultsPanelProps = {
  rows: readonly LdistResultRow[];
};

export function LdistResultsPanel({ rows }: LdistResultsPanelProps) {
  return (
    <section className="liner-edit-panel" data-testid="ldist-results-panel">
      <h2>{ja.liner.ldist.results}</h2>
      {rows.length === 0 ? (
        <p className="liner-edit-help">{ja.liner.ldist.noResults}</p>
      ) : (
        <table className="liner-edit-table">
          <thead>
            <tr>
              <th>{ja.liner.ldist.columnJob}</th>
              <th>{ja.liner.ldist.columnStation}</th>
              <th>{ja.liner.ldist.columnFrom}</th>
              <th>{ja.liner.ldist.columnTo}</th>
              <th>{ja.liner.ldist.columnDistance}</th>
              <th>{ja.liner.ldist.columnOverhang}</th>
              <th>{ja.liner.ldist.columnSide}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={`${row.jobId}-${row.stationPhysicalDistance}-${index}`} data-testid="ldist-result-row">
                <td>{row.jobId}</td>
                <td>{row.stationPhysicalDistance}</td>
                <td>{row.fromLineId ?? ""}</td>
                <td>{row.toLineId ?? ""}</td>
                <td>{row.distanceM ?? ""}</td>
                <td>{row.overhangM ?? ""}</td>
                <td>{row.side ?? ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
