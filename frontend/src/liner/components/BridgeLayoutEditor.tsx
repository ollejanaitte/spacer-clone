import { FilePlus2, Trash2 } from "lucide-react";
import { useRef, useState } from "react";
import { ja } from "../../i18n/ja";
import {
  createDefaultPier,
  createDefaultSpan,
  type LinerDraft,
} from "../adapters/linerUiAdapter";
import type { PierDraft, SpanDraft } from "../schema/types";
import { CompositionAwareInput } from "./CompositionAwareInput";
import {
  pierSkewAngleRadFromMode,
  pierSkewDegreesFromRad,
  pierSkewModeFromRad,
  primaryBearingOffset,
  type PierSkewMode,
} from "./bridgeLayoutSkew";

export type BridgeLayoutEditorProps = {
  draft: LinerDraft;
  piers: readonly PierDraft[];
  spans: readonly SpanDraft[];
  onPiersChange: (piers: PierDraft[]) => void;
  onSpansChange: (spans: SpanDraft[]) => void;
  onInputValidityChange?: (fieldKey: string, valid: boolean) => void;
  onCompositionStateChange?: (composing: boolean) => void;
};

type PierFieldPatch = Partial<{
  id: string;
  physicalDistance: number;
  kind: PierDraft["kind"];
  skewMode: PierSkewMode;
  skewDegrees: number;
  bearingOffset: number | undefined;
}>;

type SpanFieldPatch = Partial<{
  id: string;
  startPhysicalDistance: number;
  endPhysicalDistance: number;
  pierIdStart: string | undefined;
  pierIdEnd: string | undefined;
}>;

function numericValue(value: number | undefined): string {
  return Number.isFinite(value) ? String(value) : "";
}

function updatePier(
  piers: readonly PierDraft[],
  targetIndex: number,
  patch: PierFieldPatch,
): PierDraft[] {
  return piers.map((pier, index) => {
    if (index !== targetIndex) {
      return pier;
    }

    const nextPier: PierDraft = { ...pier };
    if (patch.id !== undefined) {
      nextPier.id = patch.id;
    }
    if (patch.physicalDistance !== undefined) {
      nextPier.physicalDistance = patch.physicalDistance;
    }
    if (patch.kind !== undefined) {
      nextPier.kind = patch.kind;
    }
    if (patch.skewMode !== undefined || patch.skewDegrees !== undefined) {
      const mode = patch.skewMode ?? pierSkewModeFromRad(pier.skewAngleRad);
      const degrees = patch.skewDegrees ?? pierSkewDegreesFromRad(pier.skewAngleRad);
      nextPier.skewAngleRad = pierSkewAngleRadFromMode(mode, degrees);
    }
    if ("bearingOffset" in patch) {
      if (patch.bearingOffset === undefined || !Number.isFinite(patch.bearingOffset)) {
        delete nextPier.bearingOffsets;
      } else {
        nextPier.bearingOffsets = [{ transverseIndex: 0, offset: patch.bearingOffset }];
      }
    }
    return nextPier;
  });
}

function removePier(piers: readonly PierDraft[], targetIndex: number): PierDraft[] {
  return piers.filter((_, index) => index !== targetIndex);
}

function updateSpan(
  spans: readonly SpanDraft[],
  targetIndex: number,
  patch: SpanFieldPatch,
): SpanDraft[] {
  return spans.map((span, index) => (index === targetIndex ? { ...span, ...patch } : span));
}

function removeSpan(spans: readonly SpanDraft[], targetIndex: number): SpanDraft[] {
  return spans.filter((_, index) => index !== targetIndex);
}

let pierRowKeySequence = 0;
let spanRowKeySequence = 0;

export function BridgeLayoutEditor({
  draft,
  piers,
  spans,
  onPiersChange,
  onSpansChange,
  onInputValidityChange,
  onCompositionStateChange,
}: BridgeLayoutEditorProps) {
  const [numericInputText, setNumericInputText] = useState<Record<string, string>>({});
  const pierRowKeys = useRef<string[]>([]);
  const spanRowKeys = useRef<string[]>([]);

  while (pierRowKeys.current.length < piers.length) {
    pierRowKeySequence += 1;
    pierRowKeys.current.push(`pier-row-${pierRowKeySequence}`);
  }
  while (spanRowKeys.current.length < spans.length) {
    spanRowKeySequence += 1;
    spanRowKeys.current.push(`span-row-${spanRowKeySequence}`);
  }

  const pierIdOptions = piers.map((pier) => pier.id);

  return (
    <>
      <section
        className="liner-edit-panel liner-bridge-pier-editor"
        aria-labelledby="liner-bridge-pier-title"
      >
        <div className="liner-edit-section-header">
          <div>
            <h2 id="liner-bridge-pier-title">{ja.liner.editor.bridgePierSection}</h2>
            <p className="liner-edit-help">{ja.liner.editor.bridgePierHelp}</p>
          </div>
          <button
            type="button"
            onClick={() => onPiersChange([...piers, createDefaultPier(draft)])}
            data-testid="add-bridge-pier"
          >
            <FilePlus2 size={16} />
            {ja.liner.editor.addBridgePier}
          </button>
        </div>

        {piers.length === 0 ? (
          <p className="liner-edit-help" data-testid="bridge-pier-empty">
            {ja.liner.editor.bridgePierEmpty}
          </p>
        ) : (
          <div className="liner-edit-table-wrap">
            <table className="liner-edit-table liner-bridge-pier-table">
              <caption>{ja.liner.editor.bridgePierTableCaption}</caption>
              <thead>
                <tr>
                  <th>{ja.liner.fields.pierId}</th>
                  <th>{ja.liner.fields.pierKind}</th>
                  <th>{ja.liner.fields.pierStation}</th>
                  <th>{ja.liner.fields.pierBearingOffset}</th>
                  <th>{ja.liner.fields.pierSkewMode}</th>
                  <th>{ja.liner.fields.pierSkewAngleDeg}</th>
                  <th>{ja.liner.fields.actions}</th>
                </tr>
              </thead>
              <tbody>
                {piers.map((pier, pierIndex) => {
                  const rowKey = pierRowKeys.current[pierIndex]!;
                  const stationKey = `${rowKey}:station`;
                  const offsetKey = `${rowKey}:offset`;
                  const skewKey = `${rowKey}:skew`;
                  const skewMode = pierSkewModeFromRad(pier.skewAngleRad);
                  const skewDegrees = pierSkewDegreesFromRad(pier.skewAngleRad);
                  const bearingOffset = primaryBearingOffset(pier);
                  return (
                    <tr key={rowKey} data-testid={`bridge-pier-row-${pier.id}`}>
                      <td>
                        <CompositionAwareInput
                          value={pier.id}
                          onCompositionStateChange={onCompositionStateChange}
                          onValueChange={(value) =>
                            onPiersChange(updatePier(piers, pierIndex, { id: value }))
                          }
                          data-testid={`bridge-pier-id-${pier.id}`}
                        />
                      </td>
                      <td>
                        <select
                          value={pier.kind}
                          onChange={(event) =>
                            onPiersChange(
                              updatePier(piers, pierIndex, {
                                kind: event.target.value as PierDraft["kind"],
                              }),
                            )
                          }
                          data-testid={`bridge-pier-kind-${pier.id}`}
                        >
                          {(["abutment", "pier", "virtual_pier"] as const).map((kind) => (
                            <option key={kind} value={kind}>
                              {ja.liner.fields.pierKinds[kind]}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <CompositionAwareInput
                          type="number"
                          value={numericInputText[stationKey] ?? numericValue(pier.physicalDistance)}
                          onCompositionStateChange={onCompositionStateChange}
                          onValueChange={(text) => {
                            const parsed = Number(text);
                            const valid = text.trim() !== "" && Number.isFinite(parsed);
                            setNumericInputText((current) => ({ ...current, [stationKey]: text }));
                            onInputValidityChange?.(`pier:${pierIndex}:station`, valid);
                            if (valid) {
                              onPiersChange(
                                updatePier(piers, pierIndex, { physicalDistance: parsed }),
                              );
                            }
                          }}
                          data-testid={`bridge-pier-station-${pier.id}`}
                        />
                      </td>
                      <td>
                        <CompositionAwareInput
                          type="number"
                          value={numericInputText[offsetKey] ?? numericValue(bearingOffset)}
                          onCompositionStateChange={onCompositionStateChange}
                          onValueChange={(text) => {
                            if (text.trim() === "") {
                              setNumericInputText((current) => ({ ...current, [offsetKey]: text }));
                              onInputValidityChange?.(`pier:${pierIndex}:offset`, true);
                              onPiersChange(updatePier(piers, pierIndex, { bearingOffset: undefined }));
                              return;
                            }
                            const parsed = Number(text);
                            const valid = Number.isFinite(parsed);
                            setNumericInputText((current) => ({ ...current, [offsetKey]: text }));
                            onInputValidityChange?.(`pier:${pierIndex}:offset`, valid);
                            if (valid) {
                              onPiersChange(
                                updatePier(piers, pierIndex, { bearingOffset: parsed }),
                              );
                            }
                          }}
                          data-testid={`bridge-pier-offset-${pier.id}`}
                        />
                      </td>
                      <td>
                        <select
                          value={skewMode}
                          onChange={(event) =>
                            onPiersChange(
                              updatePier(piers, pierIndex, {
                                skewMode: event.target.value as PierSkewMode,
                              }),
                            )
                          }
                          data-testid={`bridge-pier-skew-mode-${pier.id}`}
                        >
                          {(["perpendicular", "parallel", "arbitrary"] as const).map((mode) => (
                            <option key={mode} value={mode}>
                              {ja.liner.fields.pierSkewModes[mode]}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td>
                        {skewMode === "arbitrary" ? (
                          <CompositionAwareInput
                            type="number"
                            value={numericInputText[skewKey] ?? numericValue(skewDegrees)}
                            onCompositionStateChange={onCompositionStateChange}
                            onValueChange={(text) => {
                              const parsed = Number(text);
                              const valid = text.trim() !== "" && Number.isFinite(parsed);
                              setNumericInputText((current) => ({ ...current, [skewKey]: text }));
                              onInputValidityChange?.(`pier:${pierIndex}:skew`, valid);
                              if (valid) {
                                onPiersChange(
                                  updatePier(piers, pierIndex, {
                                    skewMode: "arbitrary",
                                    skewDegrees: parsed,
                                  }),
                                );
                              }
                            }}
                            data-testid={`bridge-pier-skew-deg-${pier.id}`}
                          />
                        ) : (
                          <span className="liner-edit-help" data-testid={`bridge-pier-skew-fixed-${pier.id}`}>
                            {ja.liner.editor.bridgeSkewFixed}
                          </span>
                        )}
                      </td>
                      <td>
                        <button
                          type="button"
                          onClick={() => {
                            pierRowKeys.current.splice(pierIndex, 1);
                            onPiersChange(removePier(piers, pierIndex));
                          }}
                          data-testid={`remove-bridge-pier-${pier.id}`}
                          title={ja.liner.editor.removeBridgePier}
                          aria-label={ja.liner.editor.removeBridgePier}
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

      <section
        className="liner-edit-panel liner-bridge-span-editor"
        aria-labelledby="liner-bridge-span-title"
      >
        <div className="liner-edit-section-header">
          <div>
            <h2 id="liner-bridge-span-title">{ja.liner.editor.bridgeSpanSection}</h2>
            <p className="liner-edit-help">{ja.liner.editor.bridgeSpanHelp}</p>
          </div>
          <button
            type="button"
            onClick={() => onSpansChange([...spans, createDefaultSpan(draft)])}
            data-testid="add-bridge-span"
          >
            <FilePlus2 size={16} />
            {ja.liner.editor.addBridgeSpan}
          </button>
        </div>

        {spans.length === 0 ? (
          <p className="liner-edit-help" data-testid="bridge-span-empty">
            {ja.liner.editor.bridgeSpanEmpty}
          </p>
        ) : (
          <div className="liner-edit-table-wrap">
            <table className="liner-edit-table liner-bridge-span-table">
              <caption>{ja.liner.editor.bridgeSpanTableCaption}</caption>
              <thead>
                <tr>
                  <th>{ja.liner.fields.spanId}</th>
                  <th>{ja.liner.fields.spanStartStation}</th>
                  <th>{ja.liner.fields.spanEndStation}</th>
                  <th>{ja.liner.fields.spanPierStart}</th>
                  <th>{ja.liner.fields.spanPierEnd}</th>
                  <th>{ja.liner.fields.actions}</th>
                </tr>
              </thead>
              <tbody>
                {spans.map((span, spanIndex) => {
                  const rowKey = spanRowKeys.current[spanIndex]!;
                  const startKey = `${rowKey}:start`;
                  const endKey = `${rowKey}:end`;
                  return (
                    <tr key={rowKey} data-testid={`bridge-span-row-${span.id}`}>
                      <td>
                        <CompositionAwareInput
                          value={span.id}
                          onCompositionStateChange={onCompositionStateChange}
                          onValueChange={(value) =>
                            onSpansChange(updateSpan(spans, spanIndex, { id: value }))
                          }
                          data-testid={`bridge-span-id-${span.id}`}
                        />
                      </td>
                      <td>
                        <CompositionAwareInput
                          type="number"
                          value={
                            numericInputText[startKey] ?? numericValue(span.startPhysicalDistance)
                          }
                          onCompositionStateChange={onCompositionStateChange}
                          onValueChange={(text) => {
                            const parsed = Number(text);
                            const valid = text.trim() !== "" && Number.isFinite(parsed);
                            setNumericInputText((current) => ({ ...current, [startKey]: text }));
                            onInputValidityChange?.(`span:${spanIndex}:start`, valid);
                            if (valid) {
                              onSpansChange(
                                updateSpan(spans, spanIndex, { startPhysicalDistance: parsed }),
                              );
                            }
                          }}
                          data-testid={`bridge-span-start-${span.id}`}
                        />
                      </td>
                      <td>
                        <CompositionAwareInput
                          type="number"
                          value={numericInputText[endKey] ?? numericValue(span.endPhysicalDistance)}
                          onCompositionStateChange={onCompositionStateChange}
                          onValueChange={(text) => {
                            const parsed = Number(text);
                            const valid = text.trim() !== "" && Number.isFinite(parsed);
                            setNumericInputText((current) => ({ ...current, [endKey]: text }));
                            onInputValidityChange?.(`span:${spanIndex}:end`, valid);
                            if (valid) {
                              onSpansChange(
                                updateSpan(spans, spanIndex, { endPhysicalDistance: parsed }),
                              );
                            }
                          }}
                          data-testid={`bridge-span-end-${span.id}`}
                        />
                      </td>
                      <td>
                        <select
                          value={span.pierIdStart ?? ""}
                          onChange={(event) =>
                            onSpansChange(
                              updateSpan(spans, spanIndex, {
                                pierIdStart: event.target.value || undefined,
                              }),
                            )
                          }
                          data-testid={`bridge-span-pier-start-${span.id}`}
                        >
                          <option value="">{ja.liner.editor.bridgePierReferenceUnset}</option>
                          {pierIdOptions.map((pierId) => (
                            <option key={pierId} value={pierId}>
                              {pierId}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <select
                          value={span.pierIdEnd ?? ""}
                          onChange={(event) =>
                            onSpansChange(
                              updateSpan(spans, spanIndex, {
                                pierIdEnd: event.target.value || undefined,
                              }),
                            )
                          }
                          data-testid={`bridge-span-pier-end-${span.id}`}
                        >
                          <option value="">{ja.liner.editor.bridgePierReferenceUnset}</option>
                          {pierIdOptions.map((pierId) => (
                            <option key={pierId} value={pierId}>
                              {pierId}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <button
                          type="button"
                          onClick={() => {
                            spanRowKeys.current.splice(spanIndex, 1);
                            onSpansChange(removeSpan(spans, spanIndex));
                          }}
                          data-testid={`remove-bridge-span-${span.id}`}
                          title={ja.liner.editor.removeBridgeSpan}
                          aria-label={ja.liner.editor.removeBridgeSpan}
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
    </>
  );
}
