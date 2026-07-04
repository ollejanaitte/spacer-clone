import type { SectionListRowSummary } from "./sectionListService";
import { formatDiagnosticsBadge, formatRenderabilityBadge } from "./sectionListHooks";

export type SectionListRowProps = {
  summary: SectionListRowSummary;
  onEdit: (sectionId: string) => void;
  onDuplicate: (sectionId: string) => void;
  onDelete: (sectionId: string) => void;
};

export function SectionListRow({ summary, onEdit, onDuplicate, onDelete }: SectionListRowProps) {
  const { section, inputRate, renderabilityStatus, errorCount, warningCount } = summary;
  const stationLabel =
    section.stationingRef.stationLabel ??
    section.stationingRef.notation ??
    (section.stationingRef.stationValue != null
      ? String(section.stationingRef.stationValue)
      : "-");
  const azimuthNotation = section.azimuth.value?.notation ?? "-";

  return (
    <tr data-testid={`section-list-row-${section.id}`}>
      <td>{section.pdfPage}</td>
      <td>{stationLabel}</td>
      <td>{azimuthNotation}</td>
      <td>{inputRate}%</td>
      <td>
        <span data-testid={`section-list-render-${section.id}`}>
          {formatRenderabilityBadge(renderabilityStatus)}横断
        </span>
      </td>
      <td data-testid={`section-list-diagnostics-${section.id}`}>
        {formatDiagnosticsBadge(errorCount, warningCount)}
      </td>
      <td className="section-list-row-actions">
        <button
          type="button"
          onClick={() => onEdit(section.id)}
          data-testid={`section-list-edit-${section.id}`}
        >
          編集
        </button>
        <button
          type="button"
          onClick={() => onDuplicate(section.id)}
          data-testid={`section-list-duplicate-${section.id}`}
        >
          複製
        </button>
        <button
          type="button"
          onClick={() => onDelete(section.id)}
          data-testid={`section-list-delete-${section.id}`}
        >
          削除
        </button>
      </td>
    </tr>
  );
}
