// Phase C1 (M2-03) 再利用可能な入力フィールド
// read-only 強制（X/Y/tangent/transverse 等）・FATAL/WARNING 表示を汎用化。
import styles from "./forms.module.css";

export interface FieldIssue {
  severity: "fatal" | "warning" | "info";
  message: string;
}

export interface FieldInputProps {
  label: string;
  value: string | number;
  onChange?: (raw: string) => void;
  /** read-only フィールド（Auto calculated 等） */
  readOnly?: boolean;
  unit?: string;
  step?: number;
  min?: number;
  issue?: FieldIssue | null;
  autoLabel?: string;
  dataTestId?: string;
}

export function FieldInput(props: FieldInputProps) {
  const cls = [
    styles.field,
    props.issue?.severity === "fatal" ? styles.fieldFatal : "",
    props.issue?.severity === "warning" ? styles.fieldWarn : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={cls} data-testid={props.dataTestId}>
      <label className={styles.fieldLabel}>
        <span>{props.label}</span>
        {props.autoLabel && <em className={styles.autoLabel}>{props.autoLabel}</em>}
      </label>
      <div className={styles.fieldControl}>
        <input
          type="number"
          className={styles.fieldInput}
          value={props.value}
          readOnly={props.readOnly}
          disabled={props.readOnly}
          step={props.step}
          min={props.min}
          onChange={(e) => props.onChange?.(e.target.value)}
          data-readonly={props.readOnly ? "true" : "false"}
        />
        {props.unit && <span className={styles.fieldUnit}>{props.unit}</span>}
      </div>
      {props.issue && (
        <div className={`${styles.fieldIssue} ${styles[`issue_${props.issue.severity}`]}`}>
          {props.issue.message}
        </div>
      )}
    </div>
  );
}
