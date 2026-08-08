// Phase C1 (M2-02) 下部パネル: 座標表（support 一覧）
import { ja } from "../../i18n/ja";
import type { Support } from "../model";
import styles from "./SubstructurePlanningPage.module.css";

export interface CoordinateTableProps {
  supports: readonly Support[];
  coordinates: ReadonlyMap<string, { x: number; y: number; z: number }>;
  selectedSupportId?: string | null;
  onSelect?: (supportId: string) => void;
}

export function CoordinateTable(props: CoordinateTableProps) {
  const t = ja.substructure?.planning ?? ({} as Record<string, string>);
  return (
    <div className={styles.tableWrap} data-testid="coordinate-table">
      <table className={styles.table}>
        <thead>
          <tr>
            <th>{t.colSupport ?? "支点"}</th>
            <th>{t.colType ?? "種別"}</th>
            <th>{t.colStation ?? "測点"}</th>
            <th>X</th>
            <th>Y</th>
            <th>Z</th>
          </tr>
        </thead>
        <tbody>
          {props.supports.map((s) => {
            const c = props.coordinates.get(s.supportId);
            return (
              <tr
                key={s.supportId}
                className={props.selectedSupportId === s.supportId ? styles.rowSelected : ""}
                data-testid={`coord-row-${s.supportId}`}
                onClick={() => props.onSelect?.(s.supportId)}
                style={{ cursor: "pointer" }}
              >
                <td>{s.supportId}</td>
                <td>{s.supportType}</td>
                <td>{s.placement.station !== undefined ? s.placement.station.toFixed(2) : "—"}</td>
                <td>{c ? c.x.toFixed(2) : "—"}</td>
                <td>{c ? c.y.toFixed(2) : "—"}</td>
                <td>{c ? c.z.toFixed(2) : "—"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
