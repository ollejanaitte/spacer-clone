import type { ImporterDiagnostic, Point } from "../types";
import { formatNullableDisplay, type CellAddress } from "./sectionEditorHooks";

const POINT_FIELDS = [
  { key: "x", label: "X" },
  { key: "y", label: "Y" },
  { key: "designElevation", label: "計画高" },
  { key: "crossSlope", label: "横断勾配" },
  { key: "unitDistance", label: "単位距離" },
  { key: "cumulativeDistance", label: "累加距離" },
  { key: "unitWidth", label: "単位幅" },
  { key: "cumulativeWidth", label: "累加幅" },
  { key: "station", label: "測点" },
] as const;

export type SectionPointEditorProps = {
  point: Point;
  focusCell: CellAddress;
  diagnostics: ImporterDiagnostic[];
  onFocus: (address: CellAddress) => void;
  onChange: (address: CellAddress, text: string) => void;
};

function diagnosticClass(
  diagnostics: ImporterDiagnostic[],
  targetPath: string,
): string | undefined {
  const match = diagnostics.find((item) => item.targetPath.includes(targetPath));
  if (!match) {
    return undefined;
  }
  return `diagnostic-${match.level}`;
}

export function SectionPointEditor({
  point,
  focusCell,
  diagnostics,
  onFocus,
  onChange,
}: SectionPointEditorProps) {
  return (
    <tr data-testid={`section-point-row-${point.id}`}>
      <th scope="row">{point.lineLabel}</th>
      {POINT_FIELDS.map((field) => {
        const address: CellAddress = {
          pointId: point.id,
          field: field.key === "station" ? "station" : field.key,
        };
        const cell =
          field.key === "station"
            ? point.station
            : (point[field.key as keyof Point] as { notation?: string | null; value?: number | null; flags?: { notComputed?: boolean } });
        const display =
          field.key === "station"
            ? (point.station?.notation ?? (point.station?.value != null ? String(point.station.value) : ""))
            : formatNullableDisplay(cell as Parameters<typeof formatNullableDisplay>[0]);
        const isFocused =
          focusCell.pointId === point.id && focusCell.field === address.field;

        return (
          <td key={field.key} className={diagnosticClass(diagnostics, point.id)}>
            <input
              type="text"
              value={display}
              onFocus={() => onFocus(address)}
              onChange={(event) => onChange(address, event.target.value)}
              data-testid={`section-cell-${point.id}-${field.key}`}
              className={isFocused ? "is-focused" : undefined}
              aria-label={`${point.lineLabel} ${field.label}`}
            />
          </td>
        );
      })}
    </tr>
  );
}
