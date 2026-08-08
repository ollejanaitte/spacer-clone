// Phase C1 (M2-04) 杭座標表
import { ja } from "../../../i18n/ja";
import type { CoordinateRow } from "./pileLayoutModel";

export interface PileCoordinateTableProps {
  rows: CoordinateRow[];
}

export function PileCoordinateTable(props: PileCoordinateTableProps) {
  const t = ja.substructure?.planning ?? ({} as Record<string, string>);
  return (
    <table data-testid="pile-coordinate-table">
      <thead>
        <tr>
          <th>{t.pileNo ?? "No"}</th>
          <th>{t.pileId ?? "杭ID"}</th>
          <th>X (m)</th>
          <th>Y (m)</th>
        </tr>
      </thead>
      <tbody>
        {props.rows.map((r) => (
          <tr key={r.id} data-testid={`pile-coord-${r.id}`}>
            <td>{r.no}</td>
            <td>{r.id}</td>
            <td>{r.x.toFixed(3)}</td>
            <td>{r.y.toFixed(3)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
