import type { SectionListRowSummary } from "./sectionListService";
import { SectionListRow } from "./SectionListRow";

export type SectionListTableProps = {
  summaries: SectionListRowSummary[];
  onEdit: (sectionId: string) => void;
  onDuplicate: (sectionId: string) => void;
  onDelete: (sectionId: string) => void;
};

export function SectionListTable({
  summaries,
  onEdit,
  onDuplicate,
  onDelete,
}: SectionListTableProps) {
  return (
    <div className="section-list-table-wrap" data-testid="section-list-table-wrap">
      <table className="section-list-table" data-testid="section-list-table">
        <caption>横断面一覧</caption>
        <thead>
          <tr>
            <th>Page</th>
            <th>測点</th>
            <th>方位角</th>
            <th>入力率</th>
            <th>描画</th>
            <th>診断</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          {summaries.length === 0 ? (
            <tr>
              <td colSpan={7}>横断面がありません。[横断面追加] から作成してください。</td>
            </tr>
          ) : (
            summaries.map((summary) => (
              <SectionListRow
                key={summary.section.id}
                summary={summary}
                onEdit={onEdit}
                onDuplicate={onDuplicate}
                onDelete={onDelete}
              />
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
