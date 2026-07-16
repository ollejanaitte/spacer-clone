import { FilePlus2, Trash2 } from "lucide-react";
import { useRef, useState } from "react";
import { ja } from "../../i18n/ja";
import {
  createDefaultWidthChangePoint,
  type LinerDraft,
} from "../adapters/linerUiAdapter";
import type { WidthChangePointDraft } from "../schema/types";
import { CompositionAwareInput } from "./CompositionAwareInput";

export type WidthChangePointEditorProps = {
  draft: LinerDraft;
  widthChangePoints: readonly WidthChangePointDraft[];
  onWidthChangePointsChange: (points: WidthChangePointDraft[]) => void;
  onInputValidityChange?: (fieldKey: string, valid: boolean) => void;
  onCompositionStateChange?: (composing: boolean) => void;
};

type WidthPointFieldPatch = Partial<{
  id: string;
  physicalDistance: number;
  leftOffset: number;
  rightOffset: number;
}>;

function numericValue(value: number | undefined): string {
  return Number.isFinite(value) ? String(value) : "";
}

function updateWidthPoint(
  points: readonly WidthChangePointDraft[],
  targetIndex: number,
  patch: WidthPointFieldPatch,
): WidthChangePointDraft[] {
  return points.map((point, index) => (index === targetIndex ? { ...point, ...patch } : point));
}

function removeWidthPoint(
  points: readonly WidthChangePointDraft[],
  targetIndex: number,
): WidthChangePointDraft[] {
  return points.filter((_, index) => index !== targetIndex);
}

let widthPointRowKeySequence = 0;

export function WidthChangePointEditor({
  draft,
  widthChangePoints,
  onWidthChangePointsChange,
  onInputValidityChange,
  onCompositionStateChange,
}: WidthChangePointEditorProps) {
  const [numericInputText, setNumericInputText] = useState<Record<string, string>>({});
  const rowKeys = useRef<string[]>([]);
  while (rowKeys.current.length < widthChangePoints.length) {
    widthPointRowKeySequence += 1;
    rowKeys.current.push(`width-point-row-${widthPointRowKeySequence}`);
  }

  return (
    <section className="liner-edit-panel liner-width-change-editor" aria-labelledby="liner-width-change-title">
      <div className="liner-edit-section-header">
        <div>
          <h2 id="liner-width-change-title">{ja.liner.editor.widthChangeSection}</h2>
          <p className="liner-edit-help">{ja.liner.editor.widthChangeHelp}</p>
        </div>
        <button
          type="button"
          onClick={() =>
            onWidthChangePointsChange([
              ...widthChangePoints,
              createDefaultWidthChangePoint(draft, {
                physicalDistance: widthChangePoints.at(-1)?.physicalDistance ?? 0,
              }),
            ])
          }
          data-testid="add-width-change-point"
        >
          <FilePlus2 size={16} />
          {ja.liner.editor.addWidthChangePoint}
        </button>
      </div>

      {widthChangePoints.length === 0 ? (
        <p className="liner-edit-help" data-testid="width-change-point-empty">
          {ja.liner.editor.widthChangeEmpty}
        </p>
      ) : (
        <div className="liner-edit-table-wrap">
          <table className="liner-edit-table liner-width-change-table">
            <caption>{ja.liner.editor.widthChangeTableCaption}</caption>
            <thead>
              <tr>
                <th>{ja.liner.fields.widthChangePointId}</th>
                <th>{ja.liner.fields.widthChangeStation}</th>
                <th>{ja.liner.fields.widthChangeLeftOffset}</th>
                <th>{ja.liner.fields.widthChangeRightOffset}</th>
                <th>{ja.liner.fields.actions}</th>
              </tr>
            </thead>
            <tbody>
              {widthChangePoints.map((point, pointIndex) => {
                const rowKey = rowKeys.current[pointIndex]!;
                const stationKey = `${rowKey}:station`;
                const leftKey = `${rowKey}:left`;
                const rightKey = `${rowKey}:right`;
                return (
                  <tr key={rowKey} data-testid={`width-change-point-row-${point.id}`}>
                    <td>
                      <CompositionAwareInput
                        value={point.id}
                        onCompositionStateChange={onCompositionStateChange}
                        onValueChange={(value) =>
                          onWidthChangePointsChange(
                            updateWidthPoint(widthChangePoints, pointIndex, { id: value }),
                          )
                        }
                        data-testid={`width-change-point-id-${point.id}`}
                      />
                    </td>
                    <td>
                      <CompositionAwareInput
                        type="number"
                        value={numericInputText[stationKey] ?? numericValue(point.physicalDistance)}
                        onCompositionStateChange={onCompositionStateChange}
                        onValueChange={(text) => {
                          const parsed = Number(text);
                          const valid = text.trim() !== "" && Number.isFinite(parsed);
                          setNumericInputText((current) => ({ ...current, [stationKey]: text }));
                          onInputValidityChange?.(`width:${pointIndex}:station`, valid);
                          if (valid) {
                            onWidthChangePointsChange(
                              updateWidthPoint(widthChangePoints, pointIndex, {
                                physicalDistance: parsed,
                              }),
                            );
                          }
                        }}
                        data-testid={`width-change-point-station-${point.id}`}
                      />
                    </td>
                    <td>
                      <CompositionAwareInput
                        type="number"
                        value={numericInputText[leftKey] ?? numericValue(point.leftOffset)}
                        onCompositionStateChange={onCompositionStateChange}
                        onValueChange={(text) => {
                          const parsed = Number(text);
                          const valid = text.trim() !== "" && Number.isFinite(parsed);
                          setNumericInputText((current) => ({ ...current, [leftKey]: text }));
                          onInputValidityChange?.(`width:${pointIndex}:left`, valid);
                          if (valid) {
                            onWidthChangePointsChange(
                              updateWidthPoint(widthChangePoints, pointIndex, { leftOffset: parsed }),
                            );
                          }
                        }}
                        data-testid={`width-change-point-left-${point.id}`}
                      />
                    </td>
                    <td>
                      <CompositionAwareInput
                        type="number"
                        value={numericInputText[rightKey] ?? numericValue(point.rightOffset)}
                        onCompositionStateChange={onCompositionStateChange}
                        onValueChange={(text) => {
                          const parsed = Number(text);
                          const valid = text.trim() !== "" && Number.isFinite(parsed);
                          setNumericInputText((current) => ({ ...current, [rightKey]: text }));
                          onInputValidityChange?.(`width:${pointIndex}:right`, valid);
                          if (valid) {
                            onWidthChangePointsChange(
                              updateWidthPoint(widthChangePoints, pointIndex, { rightOffset: parsed }),
                            );
                          }
                        }}
                        data-testid={`width-change-point-right-${point.id}`}
                      />
                    </td>
                    <td>
                      <button
                        type="button"
                        onClick={() => {
                          rowKeys.current.splice(pointIndex, 1);
                          onWidthChangePointsChange(removeWidthPoint(widthChangePoints, pointIndex));
                        }}
                        data-testid={`remove-width-change-point-${point.id}`}
                        title={ja.liner.editor.removeWidthChangePoint}
                        aria-label={ja.liner.editor.removeWidthChangePoint}
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
