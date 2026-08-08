// Phase C1 (M2-03) P02 配置入力フィールド
// alignmentId / station / offset / skew(deg表示) / Z を編集、X/Y/tangent/transverse は read-only。
// 内部 skew は radian。degree 変換は UI 境界のみ。
import { FieldInput, type FieldIssue } from "./FieldInput";
import styles from "./forms.module.css";

export interface PlacementFormState {
  alignmentId: string;
  station: number | null;
  offset: number | null;
  skewDeg: number | null;
  z: number | null;
}

export interface PlacementDerived {
  x: number | null;
  y: number | null;
  tangent: string;
  transverse: string;
}

export interface PlacementFieldsProps {
  state: PlacementFormState;
  derived: PlacementDerived;
  onChange: (patch: Partial<PlacementFormState>) => void;
  issues?: Record<string, FieldIssue | null>;
  onSkewDegChange?: (deg: number | null) => void;
}

export function degToRad(deg: number | null): number | null {
  return deg === null ? null : (deg * Math.PI) / 180;
}

export function radToDeg(rad: number | null): number | null {
  return rad === null ? null : (rad * 180) / Math.PI;
}

export function PlacementFields(props: PlacementFieldsProps) {
  const { state, derived, onChange, issues } = props;

  const num = (v: number | null): string => (v === null ? "" : String(v));
  const onNum = (key: "station" | "offset" | "skewDeg" | "z") => (raw: string) => {
    const v = raw === "" ? null : Number(raw);
    const patch: Partial<PlacementFormState> = { [key]: v };
    if (key === "skewDeg") props.onSkewDegChange?.(v);
    onChange(patch);
  };

  return (
    <div className={styles.forms} data-testid="placement-fields">
      <div className={styles.sectionTitle}>配置 (P02)</div>
      <div>
        <label className={styles.fieldLabel}>alignmentId</label>
        <input
          className={styles.fieldInput}
          type="text"
          value={state.alignmentId}
          onChange={(e) => onChange({ alignmentId: e.target.value })}
          data-testid="placement-alignment"
        />
      </div>
      <FieldInput
        label="測点 station (m)"
        value={num(state.station)}
        onChange={onNum("station")}
        step={0.1}
        dataTestId="placement-station"
      />
      <FieldInput
        label="オフセット offset (m)"
        value={num(state.offset)}
        onChange={onNum("offset")}
        step={0.1}
        dataTestId="placement-offset"
      />
      <FieldInput
        label="斜角 skew (°)"
        value={num(state.skewDeg)}
        onChange={onNum("skewDeg")}
        step={0.1}
        autoLabel={state.skewDeg === null ? "" : `rad ${((state.skewDeg * Math.PI) / 180).toFixed(4)}`}
        issue={issues?.skew ?? null}
        dataTestId="placement-skew"
      />
      <FieldInput
        label="Z (m)"
        value={num(state.z)}
        onChange={onNum("z")}
        step={0.1}
        autoLabel="縦断優先・override可"
        dataTestId="placement-z"
      />
      <div className={styles.sectionTitle}>算出値 (read-only)</div>
      <FieldInput
        label="X (m)"
        value={derived.x === null ? "—" : derived.x.toFixed(2)}
        readOnly
        dataTestId="placement-x"
      />
      <FieldInput
        label="Y (m)"
        value={derived.y === null ? "—" : derived.y.toFixed(2)}
        readOnly
        dataTestId="placement-y"
      />
      <div className={styles.field}>
        <label className={styles.fieldLabel}>tangent / transverse</label>
        <div className={styles.fieldControl}>
          <input
            className={styles.fieldInput}
            type="text"
            value={`${derived.tangent} / ${derived.transverse}`}
            readOnly
            data-readonly="true"
          />
        </div>
      </div>
    </div>
  );
}
