import type { GirderLineMaster, Span } from "../types";
import { formatSpanLabels } from "./lineMasterHooks";
import { LineMasterRowEditor } from "./LineMasterRowEditor";

type LineMasterTableProps = {
  lines: GirderLineMaster[];
  spans: Span[];
  appliesToSpanIds: string[];
  onChange: (lineId: string, patch: Partial<GirderLineMaster>) => void;
  onRemove: (lineId: string) => void;
  onMove: (lineId: string, direction: "up" | "down") => void;
};

export function LineMasterTable({
  lines,
  spans,
  appliesToSpanIds,
  onChange,
  onRemove,
  onMove,
}: LineMasterTableProps) {
  const spanLabel = formatSpanLabels(spans, appliesToSpanIds);

  return (
    <div className="line-master-table-wrap" data-testid="line-master-table-wrap">
      <table className="line-master-table">
        <caption>橋軸線一覧</caption>
        <thead>
          <tr>
            <th>No</th>
            <th>ラベル</th>
            <th>種別</th>
            <th>標準オフセット</th>
            <th>対象径間</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          {lines.length === 0 ? (
            <tr data-testid="line-master-empty-row">
              <td colSpan={6}>橋軸線がありません。行追加または CSV 貼り付けで追加してください。</td>
            </tr>
          ) : (
            lines.map((line, index) => (
              <LineMasterRowEditor
                key={line.id}
                line={line}
                index={index}
                spans={spans}
                spanLabel={spanLabel}
                canMoveUp={index > 0}
                canMoveDown={index < lines.length - 1}
                onChange={onChange}
                onRemove={onRemove}
                onMove={onMove}
              />
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
