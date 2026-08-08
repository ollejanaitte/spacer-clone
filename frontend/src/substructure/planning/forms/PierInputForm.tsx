// Phase C1 (M2-03) 橋脚入力フォーム（単柱矩形 / 壁式 / 門型）
import { FieldInput, type FieldIssue } from "./FieldInput";
import styles from "./forms.module.css";

export interface ColumnFormData {
  width: number | null;
  depth: number | null;
  height: number | null;
  transverseOffset: number | null;
}

export interface CapFormData {
  width: number | null;
  depth: number | null;
  height: number | null;
  overhangL: number | null;
  overhangR: number | null;
}

export interface BeamFormData {
  width: number | null;
  depth: number | null;
  height: number | null;
}

export interface PierFormState {
  formType: "single_column_rect" | "wall" | "portal_frame";
  column: ColumnFormData;
  cap: CapFormData;
  columns: [ColumnFormData, ColumnFormData];
  beam: BeamFormData;
}

export interface PierInputFormProps {
  state: PierFormState;
  onChange: (patch: Partial<PierFormState>) => void;
  issues?: Record<string, FieldIssue | null>;
}

const num = (v: number | null): string => (v === null ? "" : String(v));
const parseNum = (raw: string): number | null => (raw === "" ? null : Number(raw));

export function PierInputForm(props: PierInputFormProps) {
  const { state, onChange } = props;

  const setColumn = (patch: Partial<ColumnFormData>) =>
    onChange({ column: { ...state.column, ...patch } });
  const setColumns = (i: 0 | 1, patch: Partial<ColumnFormData>) => {
    const next = [...state.columns] as [ColumnFormData, ColumnFormData];
    next[i] = { ...next[i], ...patch };
    onChange({ columns: next });
  };
  const setCap = (patch: Partial<CapFormData>) =>
    onChange({ cap: { ...state.cap, ...patch } });
  const setBeam = (patch: Partial<BeamFormData>) =>
    onChange({ beam: { ...state.beam, ...patch } });

  if (state.formType === "portal_frame") {
    return (
      <div className={styles.forms} data-testid="portal-pier-form">
        <div className={styles.sectionTitle}>門型橋脚</div>
        {[0, 1].map((i) => (
          <div key={i}>
            <div className={styles.sectionTitle}>柱 {i + 1}</div>
            <FieldInput label="幅 (m)" value={num(state.columns[i].width)} onChange={(r) => setColumns(i as 0 | 1, { width: parseNum(r) })} dataTestId={`portal-col-${i + 1}-width`} />
            <FieldInput label="奥行 (m)" value={num(state.columns[i].depth)} onChange={(r) => setColumns(i as 0 | 1, { depth: parseNum(r) })} dataTestId={`portal-col-${i + 1}-depth`} />
            <FieldInput label="高 (m)" value={num(state.columns[i].height)} onChange={(r) => setColumns(i as 0 | 1, { height: parseNum(r) })} dataTestId={`portal-col-${i + 1}-height`} />
            <FieldInput label="橋軸直角オフセット (m)" value={num(state.columns[i].transverseOffset)} onChange={(r) => setColumns(i as 0 | 1, { transverseOffset: parseNum(r) })} dataTestId={`portal-col-${i + 1}-offset`} />
          </div>
        ))}
        <div className={styles.sectionTitle}>横梁</div>
        <FieldInput label="梁幅 (m)" value={num(state.beam.width)} onChange={(r) => setBeam({ width: parseNum(r) })} dataTestId="portal-beam-width" />
        <FieldInput label="梁奥行 (m)" value={num(state.beam.depth)} onChange={(r) => setBeam({ depth: parseNum(r) })} dataTestId="portal-beam-depth" />
        <FieldInput label="梁高 (m)" value={num(state.beam.height)} onChange={(r) => setBeam({ height: parseNum(r) })} dataTestId="portal-beam-height" />
      </div>
    );
  }

  const isWall = state.formType === "wall";
  return (
    <div className={styles.forms} data-testid="pier-form">
      <div className={styles.sectionTitle}>{isWall ? "壁式橋脚" : "単柱矩形橋脚"}</div>
      <FieldInput label="柱幅 (m)" value={num(state.column.width)} onChange={(r) => setColumn({ width: parseNum(r) })} dataTestId="pier-col-width" />
      <FieldInput label="柱奥行 (m)" value={num(state.column.depth)} onChange={(r) => setColumn({ depth: parseNum(r) })} dataTestId="pier-col-depth" />
      <FieldInput label="柱高 (m)" value={num(state.column.height)} onChange={(r) => setColumn({ height: parseNum(r) })} dataTestId="pier-col-height" />
      <div className={styles.sectionTitle}>梁</div>
      <FieldInput label="梁幅 (m)" value={num(state.cap.width)} onChange={(r) => setCap({ width: parseNum(r) })} dataTestId="pier-cap-width" />
      <FieldInput label="梁奥行 (m)" value={num(state.cap.depth)} onChange={(r) => setCap({ depth: parseNum(r) })} dataTestId="pier-cap-depth" />
      <FieldInput label="梁高 (m)" value={num(state.cap.height)} onChange={(r) => setCap({ height: parseNum(r) })} dataTestId="pier-cap-height" />
    </div>
  );
}
