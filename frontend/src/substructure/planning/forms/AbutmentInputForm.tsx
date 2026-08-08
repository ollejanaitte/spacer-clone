// Phase C1 (M2-03) 橋台入力フォーム（逆T式 / ラーメン式）
import { FieldInput, type FieldIssue } from "./FieldInput";
import styles from "./forms.module.css";

export interface AbutmentFormState {
  formType: "inverted_t" | "cantilever_frame";
  backwall: {
    width: number | null;
    height: number | null;
    thickness: number | null;
    seatElevation: number | null;
  };
  wingL: { length: number | null; height: number | null; thickness: number | null };
  wingR: { length: number | null; height: number | null; thickness: number | null };
}

export interface AbutmentInputFormProps {
  state: AbutmentFormState;
  onChange: (patch: Partial<AbutmentFormState>) => void;
  issues?: Record<string, FieldIssue | null>;
}

const num = (v: number | null): string => (v === null ? "" : String(v));
const parseNum = (raw: string): number | null => (raw === "" ? null : Number(raw));

export function AbutmentInputForm(props: AbutmentInputFormProps) {
  const { state, onChange } = props;
  const setBw = (patch: Partial<AbutmentFormState["backwall"]>) =>
    onChange({ backwall: { ...state.backwall, ...patch } });
  const setWing = (side: "L" | "R", patch: Partial<AbutmentFormState["wingL"]>) =>
    onChange({ wingL: side === "L" ? { ...state.wingL, ...patch } : state.wingL, wingR: side === "R" ? { ...state.wingR, ...patch } : state.wingR });

  return (
    <div className={styles.forms} data-testid="abutment-form">
      <div className={styles.sectionTitle}>{state.formType === "inverted_t" ? "逆T式橋台" : "ラーメン式橋台"}</div>
      <div className={styles.sectionTitle}>背壁</div>
      <FieldInput label="幅 (m)" value={num(state.backwall.width)} onChange={(r) => setBw({ width: parseNum(r) })} dataTestId="abut-bw-width" />
      <FieldInput label="高 (m)" value={num(state.backwall.height)} onChange={(r) => setBw({ height: parseNum(r) })} dataTestId="abut-bw-height" />
      <FieldInput label="厚 (m)" value={num(state.backwall.thickness)} onChange={(r) => setBw({ thickness: parseNum(r) })} dataTestId="abut-bw-thickness" />
      <FieldInput label="支承面高 (m)" value={num(state.backwall.seatElevation)} onChange={(r) => setBw({ seatElevation: parseNum(r) })} dataTestId="abut-bw-seat" />
      {(["L", "R"] as const).map((side) => (
        <div key={side}>
          <div className={styles.sectionTitle}>翼壁 {side}</div>
          <FieldInput label="長さ (m)" value={num(side === "L" ? state.wingL.length : state.wingR.length)} onChange={(r) => setWing(side, { length: parseNum(r) })} dataTestId={`abut-wing-${side}-length`} />
          <FieldInput label="高 (m)" value={num(side === "L" ? state.wingL.height : state.wingR.height)} onChange={(r) => setWing(side, { height: parseNum(r) })} dataTestId={`abut-wing-${side}-height`} />
          <FieldInput label="厚 (m)" value={num(side === "L" ? state.wingL.thickness : state.wingR.thickness)} onChange={(r) => setWing(side, { thickness: parseNum(r) })} dataTestId={`abut-wing-${side}-thickness`} />
        </div>
      ))}
    </div>
  );
}
