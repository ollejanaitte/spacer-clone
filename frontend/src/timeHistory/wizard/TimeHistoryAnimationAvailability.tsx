import type { TimeHistoryResult } from "../../types";
import { ja } from "../../i18n/ja";
import { isXyzAnimationAvailable } from "./wizardState";

type TimeHistoryAnimationAvailabilityProps = {
  result: TimeHistoryResult | null | undefined;
};

/**
 * Beginner-friendly availability summary for the Time History
 * animation tab. The component shows which displacement components
 * are present in the active result and whether the combined XYZ
 * mode can be selected.
 *
 * The component is a pure renderer: it never mutates the project
 * payload, the analysis result, or the API contract. The
 * availability verdict is derived from the same helper used by the
 * wizard state.
 */
export function TimeHistoryAnimationAvailability({ result }: TimeHistoryAnimationAvailabilityProps) {
  const labels = ja.timeHistoryWizard.animation;
  const availability = isXyzAnimationAvailable(result);
  const missingAxes = availability.missingAxes;
  const missingLabel = missingAxes.length > 0 ? missingAxes.join("・") : "";
  return (
    <div className="time-history-animation-availability" aria-label={labels.availabilityHeading}>
      <h3>{labels.availabilityHeading}</h3>
      <p className="time-history-wizard-help">{labels.availabilityHelp}</p>
      <table>
        <thead>
          <tr>
            <th>{labels.columnResult}</th>
            <th>{labels.columnStatus}</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>{labels.xStatus}</td>
            <td>{missingAxes.includes("X") ? labels.missingLabel : labels.okLabel}</td>
          </tr>
          <tr>
            <td>{labels.yStatus}</td>
            <td>{missingAxes.includes("Y") ? labels.missingLabel : labels.okLabel}</td>
          </tr>
          <tr>
            <td>{labels.zStatus}</td>
            <td>{missingAxes.includes("Z") ? labels.missingLabel : labels.okLabel}</td>
          </tr>
          <tr>
            <td>{labels.xyzStatus}</td>
            <td>{availability.available ? labels.availableLabel : labels.unavailableLabel}</td>
          </tr>
        </tbody>
      </table>
      {!availability.available && (
        <div className="time-history-wizard-error-card" role="status">
          <h4>{labels.xyzUnavailableTitle}</h4>
          <p>{labels.xyzUnavailableBody}</p>
          <p>{labels.xyzUnavailableMissing({ axes: missingLabel })}</p>
          <p>{labels.xyzUnavailableRemedy}</p>
        </div>
      )}
    </div>
  );
}
