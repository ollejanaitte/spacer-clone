import { ja } from "../i18n/ja";
import type { ProjectModel } from "../types";

type GroundMotionManagerPanelProps = {
  groundMotions?: ProjectModel["groundMotions"];
};

export function GroundMotionManagerPanel({ groundMotions = [] }: GroundMotionManagerPanelProps) {
  const labels = ja.timeHistory.groundMotionManager;
  return (
    <section className="result-table time-history-ground-motion-manager" aria-label={labels.heading}>
      <h3>{labels.heading}</h3>
      {groundMotions.length === 0 ? (
        <div className="empty-state">{ja.timeHistory.empty.groundMotions}</div>
      ) : (
        <table>
          <thead>
            <tr>
              <th>{labels.columns.id}</th>
              <th>{labels.columns.name}</th>
              <th>{labels.columns.direction}</th>
              <th>{labels.columns.unit}</th>
              <th>{labels.columns.timeStep}</th>
              <th>{labels.columns.sampleCount}</th>
            </tr>
          </thead>
          <tbody>
            {groundMotions.map((motion) => (
              <tr key={motion.id}>
                <td>{motion.id}</td>
                <td>{motion.name ?? "-"}</td>
                <td>{motion.direction}</td>
                <td>{motion.unit}</td>
                <td>{motion.timeStep}</td>
                <td>{motion.samples.length}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <div className="summary-list result-toolbar">
        <button type="button" disabled>{labels.addNew}</button>
        <button type="button" disabled>{labels.importCsv}</button>
        <button type="button" disabled>{labels.importPeer}</button>
        <span>{labels.futureFeatureNote}</span>
      </div>
    </section>
  );
}
