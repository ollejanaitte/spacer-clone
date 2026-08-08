// Phase C1 (M2-03) 構造形式セレクタ
// supported / future / unsupported を区別表示。P01 Freeze 準拠。
import { ja } from "../../../i18n/ja";
import styles from "./forms.module.css";

export type SupportCategory = "abutment" | "pier";

export interface TypeOption {
  id: string;
  label: string;
  status: "supported" | "future" | "unsupported";
}

const ABUTMENT_TYPES: TypeOption[] = [
  { id: "inverted_t", label: "逆T式", status: "supported" },
  { id: "cantilever_frame", label: "ラーメン式", status: "supported" },
  { id: "gravity", label: "重力式", status: "future" },
  { id: "caisson", label: "ケーソン", status: "unsupported" },
];

const PIER_TYPES: TypeOption[] = [
  { id: "single_column_rect", label: "単柱矩形", status: "supported" },
  { id: "wall", label: "壁式", status: "supported" },
  { id: "portal_frame", label: "門型", status: "supported" },
  { id: "steel_pier", label: "鋼製橋脚", status: "future" },
  { id: "rigid_frame", label: "ラーメン橋脚", status: "future" },
  { id: "hammer_head", label: "ハンマーヘッド", status: "unsupported" },
];

export interface StructureTypeSelectorProps {
  category: SupportCategory;
  value: string | null;
  onChange: (typeId: string, status: TypeOption["status"]) => void;
}

export function StructureTypeSelector(props: StructureTypeSelectorProps) {
  const t = ja.substructure?.planning ?? ({} as Record<string, string>);
  const options = props.category === "abutment" ? ABUTMENT_TYPES : PIER_TYPES;
  return (
    <div data-testid="structure-type-selector">
      <div className={styles.sectionTitle}>
        {props.category === "abutment" ? t.formAbutmentType ?? "橋台形式" : t.formPierType ?? "橋脚形式"}
      </div>
      <div className={styles.typeSelector}>
        {options.map((o) => (
          <button
            key={o.id}
            type="button"
            className={[
              styles.typeButton,
              props.value === o.id ? styles.active : "",
              o.status === "future" ? styles.future : "",
            ]
              .filter(Boolean)
              .join(" ")}
            data-testid={`type-${o.id}`}
            onClick={() => props.onChange(o.id, o.status)}
            disabled={o.status === "unsupported"}
          >
            {o.label}
          </button>
        ))}
      </div>
      {props.value && (
        <div className={styles.typeNote}>
          {t.formTypeSelected ?? "選択中"}: {props.value}
        </div>
      )}
    </div>
  );
}
