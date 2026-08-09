import { ja } from "../../i18n/ja";
import type { ConfirmationGateState } from "../workflow/confirmationGate";
import styles from "./ConfirmationGatePanel.module.css";

export type ConfirmationGatePanelProps = {
  state: ConfirmationGateState;
};

export function ConfirmationGatePanel({ state }: ConfirmationGatePanelProps) {
  const text = ja.designPlatform.confirmationGate;

  return (
    <section
      className={state.blocked ? styles.panelBlocked : styles.panelOk}
      data-testid="confirmation-gate"
      role="status"
    >
      <h3 className={styles.title}>{state.blocked ? text.blockedTitle : text.okTitle}</h3>
      {state.blocked ? (
        <ul className={styles.reasonList}>
          {state.blockReasons.map((reason) => (
            <li key={reason} className={styles.reasonRow}>
              {text.reasonLabels[reason]}
            </li>
          ))}
        </ul>
      ) : (
        <p className={styles.okText}>{text.okMessage}</p>
      )}
      {state.warningCount > 0 && (
        <p className={styles.warning} data-testid="warning-count">
          {text.warningCount.replace("{count}", String(state.warningCount))}
        </p>
      )}
      {state.nextAction !== null && state.nextAction.length > 0 && (
        <p className={styles.nextAction}>
          {text.nextAction.replace("{action}", state.nextAction)}
        </p>
      )}
    </section>
  );
}
