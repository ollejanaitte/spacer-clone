// Phase C1 (M2-03) 基礎入力フォーム（直接基礎 / 場所打ち杭 / 鋼管杭）
// フーチング + 杭の基本パラメータ。杭レイアウト詳細UI（配置・プレビュー一体）は M2-04。
import { FieldInput, type FieldIssue } from "./FieldInput";
import styles from "./forms.module.css";

export interface FoundationFormState {
  footing: {
    length: number | null;
    width: number | null;
    thickness: number | null;
    topElevation: number | null;
  };
  pile: {
    pileType: "bored_pile" | "steel_pipe";
    diameter: number | null;
    length: number | null;
    pileCount: number | null;
  };
  /** 直接基礎（杭なし） */
  isSpread: boolean;
}

export interface FoundationInputFormProps {
  state: FoundationFormState;
  onChange: (patch: Partial<FoundationFormState>) => void;
  issues?: Record<string, FieldIssue | null>;
}

const num = (v: number | null): string => (v === null ? "" : String(v));
const parseNum = (raw: string): number | null => (raw === "" ? null : Number(raw));

export function FoundationInputForm(props: FoundationInputFormProps) {
  const { state, onChange } = props;
  const setFooting = (patch: Partial<FoundationFormState["footing"]>) =>
    onChange({ footing: { ...state.footing, ...patch } });
  const setPile = (patch: Partial<FoundationFormState["pile"]>) =>
    onChange({ pile: { ...state.pile, ...patch } });

  return (
    <div className={styles.forms} data-testid="foundation-form">
      <div className={styles.sectionTitle}>フーチング</div>
      <FieldInput label="橋軸方向長 (m)" value={num(state.footing.length)} onChange={(r) => setFooting({ length: parseNum(r) })} dataTestId="footing-length" />
      <FieldInput label="橋軸直角幅 (m)" value={num(state.footing.width)} onChange={(r) => setFooting({ width: parseNum(r) })} dataTestId="footing-width" />
      <FieldInput label="厚 (m)" value={num(state.footing.thickness)} onChange={(r) => setFooting({ thickness: parseNum(r) })} dataTestId="footing-thickness" />
      <FieldInput label="天端高 (m)" value={num(state.footing.topElevation)} onChange={(r) => setFooting({ topElevation: parseNum(r) })} dataTestId="footing-elevation" />

      <div className={styles.sectionTitle}>基礎形式</div>
      <div className={styles.typeSelector}>
        <button
          type="button"
          className={`${styles.typeButton} ${state.isSpread ? styles.active : ""}`}
          data-testid="foundation-spread"
          onClick={() => onChange({ isSpread: true })}
        >
          直接基礎
        </button>
        <button
          type="button"
          className={`${styles.typeButton} ${!state.isSpread ? styles.active : ""}`}
          data-testid="foundation-piled"
          onClick={() => onChange({ isSpread: false })}
        >
          杭基礎
        </button>
      </div>

      {!state.isSpread && (
        <>
          <div className={styles.sectionTitle}>杭</div>
          <div className={styles.typeSelector}>
            <button
              type="button"
              className={`${styles.typeButton} ${state.pile.pileType === "bored_pile" ? styles.active : ""}`}
              data-testid="pile-type-bored"
              onClick={() => setPile({ pileType: "bored_pile" })}
            >
              場所打ち杭
            </button>
            <button
              type="button"
              className={`${styles.typeButton} ${state.pile.pileType === "steel_pipe" ? styles.active : ""}`}
              data-testid="pile-type-steel"
              onClick={() => setPile({ pileType: "steel_pipe" })}
            >
              鋼管杭
            </button>
          </div>
          <FieldInput label="杭径 (m)" value={num(state.pile.diameter)} onChange={(r) => setPile({ diameter: parseNum(r) })} dataTestId="pile-diameter" />
          <FieldInput label="杭長 (m)" value={num(state.pile.length)} onChange={(r) => setPile({ length: parseNum(r) })} dataTestId="pile-length" />
          <FieldInput label="杭本数 (本)" value={num(state.pile.pileCount)} onChange={(r) => setPile({ pileCount: parseNum(r) })} dataTestId="pile-count" />
          <div className={styles.typeNote}>レイアウト詳細（間隔・縁端・座標表）は M2-04 で編集できます</div>
        </>
      )}
    </div>
  );
}
