import { FilePlus2, Trash2 } from "lucide-react";
import { ja } from "../../i18n/ja";
import {
  addHaunchDefinition,
  removeHaunchDefinition,
  updateHaunchDefinition,
  type LinerDraft,
} from "../adapters/linerUiAdapter";
import type {
  HaunchAnchorDraft,
  HaunchDefinitionDraft,
  HaunchTypeFamily,
} from "../schema/types";
import { CompositionAwareInput } from "./CompositionAwareInput";

export type HaunchDefinitionEditorProps = {
  draft: LinerDraft;
  onDraftChange: (update: LinerDraft | ((current: LinerDraft) => LinerDraft)) => void;
  onCompositionStateChange?: (composing: boolean) => void;
};

function activeOffsetLines(draft: LinerDraft) {
  return draft.crossSections?.[0]?.offsetLines ?? [];
}

function variantOptions(family: HaunchTypeFamily) {
  switch (family) {
    case "two_point":
      return [
        { value: "two_support_points", label: ja.liner.haunch.variantTwoSupportPoints },
        { value: "one_point_longitudinal_gradient", label: ja.liner.haunch.variantOnePointGradient },
      ];
    case "three_point":
      return [
        { value: "affine_plane_three_points", label: ja.liner.haunch.variantAffinePlane },
        { value: "parabola_three_points", label: ja.liner.haunch.variantParabola },
      ];
    case "plane":
      return [{ value: "one_point_two_gradients", label: ja.liner.haunch.variantPlaneGradients }];
    case "range":
      return [{ value: "section_range_modifier", label: ja.liner.haunch.variantRangeModifier }];
  }
}

function AnchorFields({
  anchor,
  definitionId,
  prefix,
  lines,
  onDraftChange,
  onCompositionStateChange,
}: {
  anchor: HaunchAnchorDraft;
  definitionId: string;
  prefix: string;
  lines: ReturnType<typeof activeOffsetLines>;
  onDraftChange: HaunchDefinitionEditorProps["onDraftChange"];
  onCompositionStateChange?: (composing: boolean) => void;
}) {
  return (
    <div className="liner-edit-form-grid">
      <label>
        <span>{ja.liner.haunch.anchorStation}</span>
        <CompositionAwareInput
          type="number"
          value={String(anchor.stationPhysicalDistanceM)}
          data-testid={`${prefix}-station-${definitionId}-${anchor.id}`}
          onCompositionStateChange={onCompositionStateChange}
          onValueChange={(value) => {
            const stationPhysicalDistanceM = Number(value);
            if (!Number.isFinite(stationPhysicalDistanceM)) {
              return;
            }
            onDraftChange((current) => {
              const definition = current.haunchDefinitions?.find((entry) => entry.id === definitionId);
              if (!definition) {
                return current;
              }
              const patchAnchor = (entry: HaunchAnchorDraft) =>
                entry.id === anchor.id ? { ...entry, stationPhysicalDistanceM } : entry;
              if (definition.family === "two_point" && definition.variant === "two_support_points") {
                return updateHaunchDefinition(current, definitionId, {
                  anchors: definition.anchors.map(patchAnchor) as [HaunchAnchorDraft, HaunchAnchorDraft],
                });
              }
              if (definition.family === "two_point" && definition.variant === "one_point_longitudinal_gradient") {
                return updateHaunchDefinition(current, definitionId, {
                  anchor: patchAnchor(definition.anchor),
                });
              }
              if (definition.family === "three_point") {
                return updateHaunchDefinition(current, definitionId, {
                  anchors: definition.anchors.map(patchAnchor) as [
                    HaunchAnchorDraft,
                    HaunchAnchorDraft,
                    HaunchAnchorDraft,
                  ],
                });
              }
              if (definition.family === "plane" && definition.variant === "one_point_two_gradients") {
                return updateHaunchDefinition(current, definitionId, {
                  anchor: patchAnchor(definition.anchor),
                });
              }
              return current;
            });
          }}
        />
      </label>
      <label>
        <span>{ja.liner.haunch.anchorMode}</span>
        <select
          value={anchor.mode}
          data-testid={`${prefix}-mode-${definitionId}-${anchor.id}`}
          onChange={(event) => {
            const mode = event.target.value as HaunchAnchorDraft["mode"];
            onDraftChange((current) => {
              const definition = current.haunchDefinitions?.find((entry) => entry.id === definitionId);
              if (!definition) {
                return current;
              }
              const patchAnchor = (entry: HaunchAnchorDraft) =>
                entry.id === anchor.id ? { ...entry, mode } : entry;
              if (definition.family === "two_point" && definition.variant === "two_support_points") {
                return updateHaunchDefinition(current, definitionId, {
                  anchors: definition.anchors.map(patchAnchor) as [HaunchAnchorDraft, HaunchAnchorDraft],
                });
              }
              if (definition.family === "two_point" && definition.variant === "one_point_longitudinal_gradient") {
                return updateHaunchDefinition(current, definitionId, {
                  anchor: patchAnchor(definition.anchor),
                });
              }
              if (definition.family === "three_point") {
                return updateHaunchDefinition(current, definitionId, {
                  anchors: definition.anchors.map(patchAnchor) as [
                    HaunchAnchorDraft,
                    HaunchAnchorDraft,
                    HaunchAnchorDraft,
                  ],
                });
              }
              if (definition.family === "plane" && definition.variant === "one_point_two_gradients") {
                return updateHaunchDefinition(current, definitionId, {
                  anchor: patchAnchor(definition.anchor),
                });
              }
              return current;
            });
          }}
        >
          <option value="elevation">{ja.liner.haunch.modeElevation}</option>
          <option value="haunch">{ja.liner.haunch.modeHaunch}</option>
        </select>
      </label>
      <label>
        <span>{ja.liner.haunch.anchorValue}</span>
        <CompositionAwareInput
          type="number"
          value={String(anchor.valueM)}
          data-testid={`${prefix}-value-${definitionId}-${anchor.id}`}
          onCompositionStateChange={onCompositionStateChange}
          onValueChange={(value) => {
            const valueM = Number(value);
            if (!Number.isFinite(valueM)) {
              return;
            }
            onDraftChange((current) => {
              const definition = current.haunchDefinitions?.find((entry) => entry.id === definitionId);
              if (!definition) {
                return current;
              }
              const patchAnchor = (entry: HaunchAnchorDraft) =>
                entry.id === anchor.id ? { ...entry, valueM } : entry;
              if (definition.family === "two_point" && definition.variant === "two_support_points") {
                return updateHaunchDefinition(current, definitionId, {
                  anchors: definition.anchors.map(patchAnchor) as [HaunchAnchorDraft, HaunchAnchorDraft],
                });
              }
              if (definition.family === "two_point" && definition.variant === "one_point_longitudinal_gradient") {
                return updateHaunchDefinition(current, definitionId, {
                  anchor: patchAnchor(definition.anchor),
                });
              }
              if (definition.family === "three_point") {
                return updateHaunchDefinition(current, definitionId, {
                  anchors: definition.anchors.map(patchAnchor) as [
                    HaunchAnchorDraft,
                    HaunchAnchorDraft,
                    HaunchAnchorDraft,
                  ],
                });
              }
              if (definition.family === "plane" && definition.variant === "one_point_two_gradients") {
                return updateHaunchDefinition(current, definitionId, {
                  anchor: patchAnchor(definition.anchor),
                });
              }
              return current;
            });
          }}
        />
      </label>
      <label>
        <span>{ja.liner.haunch.anchorLine}</span>
        <select
          value={anchor.lineId ?? ""}
          data-testid={`${prefix}-line-${definitionId}-${anchor.id}`}
          onChange={(event) => {
            const lineId = event.target.value;
            onDraftChange((current) => {
              const definition = current.haunchDefinitions?.find((entry) => entry.id === definitionId);
              if (!definition) {
                return current;
              }
              const patchAnchor = (entry: HaunchAnchorDraft) =>
                entry.id === anchor.id ? { ...entry, lineId: lineId || undefined } : entry;
              if (definition.family === "two_point" && definition.variant === "two_support_points") {
                return updateHaunchDefinition(current, definitionId, {
                  anchors: definition.anchors.map(patchAnchor) as [HaunchAnchorDraft, HaunchAnchorDraft],
                });
              }
              if (definition.family === "two_point" && definition.variant === "one_point_longitudinal_gradient") {
                return updateHaunchDefinition(current, definitionId, {
                  anchor: patchAnchor(definition.anchor),
                });
              }
              if (definition.family === "three_point") {
                return updateHaunchDefinition(current, definitionId, {
                  anchors: definition.anchors.map(patchAnchor) as [
                    HaunchAnchorDraft,
                    HaunchAnchorDraft,
                    HaunchAnchorDraft,
                  ],
                });
              }
              if (definition.family === "plane" && definition.variant === "one_point_two_gradients") {
                return updateHaunchDefinition(current, definitionId, {
                  anchor: patchAnchor(definition.anchor),
                });
              }
              return current;
            });
          }}
        >
          <option value="">{ja.liner.haunch.selectLine}</option>
          {lines.map((line) => (
            <option key={line.id} value={line.id}>
              {line.label ?? line.id}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}

export function HaunchDefinitionEditor({
  draft,
  onDraftChange,
  onCompositionStateChange,
}: HaunchDefinitionEditorProps) {
  const definitions = draft.haunchDefinitions ?? [];
  const lines = activeOffsetLines(draft);

  return (
    <section className="liner-edit-panel liner-edit-panel-separated" data-testid="haunch-definition-editor">
      <header className="liner-edit-panel-header">
        <h2>{ja.liner.haunch.title}</h2>
        <button
          type="button"
          data-testid="haunch-definition-add"
          onClick={() => onDraftChange((current) => addHaunchDefinition(current))}
        >
          <FilePlus2 size={16} />
          {ja.liner.haunch.addDefinition}
        </button>
      </header>

      {definitions.length === 0 && <p className="liner-edit-help">{ja.liner.haunch.emptyDefinitions}</p>}

      {definitions.map((definition) => (
        <article
          key={definition.id}
          className="liner-edit-subpanel"
          data-testid={`haunch-definition-row-${definition.id}`}
        >
          <div className="liner-edit-form-grid">
            <label>
              <span>{ja.liner.haunch.definitionLabel}</span>
              <CompositionAwareInput
                value={definition.label ?? ""}
                data-testid={`haunch-definition-label-${definition.id}`}
                onCompositionStateChange={onCompositionStateChange}
                onValueChange={(value) =>
                  onDraftChange((current) =>
                    updateHaunchDefinition(current, definition.id, { label: value }),
                  )
                }
              />
            </label>
            <label>
              <span>{ja.liner.haunch.family}</span>
              <select
                value={definition.family}
                data-testid={`haunch-definition-family-${definition.id}`}
                onChange={(event) =>
                  onDraftChange((current) =>
                    updateHaunchDefinition(current, definition.id, {
                      family: event.target.value as HaunchTypeFamily,
                    }),
                  )
                }
              >
                <option value="two_point">{ja.liner.haunch.familyTwoPoint}</option>
                <option value="three_point">{ja.liner.haunch.familyThreePoint}</option>
                <option value="plane">{ja.liner.haunch.familyPlane}</option>
                <option value="range">{ja.liner.haunch.familyRange}</option>
              </select>
            </label>
            <label>
              <span>{ja.liner.haunch.variant}</span>
              <select
                value={definition.variant}
                data-testid={`haunch-definition-variant-${definition.id}`}
                onChange={(event) =>
                  onDraftChange((current) =>
                    updateHaunchDefinition(current, definition.id, {
                      variant: event.target.value,
                    } as Partial<HaunchDefinitionDraft>),
                  )
                }
              >
                {variantOptions(definition.family).map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>{ja.liner.haunch.stationFrom}</span>
              <CompositionAwareInput
                type="number"
                value={String(definition.stationRange.fromM)}
                data-testid={`haunch-definition-from-${definition.id}`}
                onCompositionStateChange={onCompositionStateChange}
                onValueChange={(value) => {
                  const fromM = Number(value);
                  if (!Number.isFinite(fromM)) {
                    return;
                  }
                  onDraftChange((current) =>
                    updateHaunchDefinition(current, definition.id, {
                      stationRange: { ...definition.stationRange, fromM },
                    }),
                  );
                }}
              />
            </label>
            <label>
              <span>{ja.liner.haunch.stationTo}</span>
              <CompositionAwareInput
                type="number"
                value={String(definition.stationRange.toM)}
                data-testid={`haunch-definition-to-${definition.id}`}
                onCompositionStateChange={onCompositionStateChange}
                onValueChange={(value) => {
                  const toM = Number(value);
                  if (!Number.isFinite(toM)) {
                    return;
                  }
                  onDraftChange((current) =>
                    updateHaunchDefinition(current, definition.id, {
                      stationRange: { ...definition.stationRange, toM },
                    }),
                  );
                }}
              />
            </label>
          </div>

          {definition.family === "two_point" && definition.variant === "two_support_points" && (
            <div data-testid={`haunch-anchors-${definition.id}`}>
              <h3>{ja.liner.haunch.anchors}</h3>
              {definition.anchors.map((anchor) => (
                <AnchorFields
                  key={anchor.id}
                  anchor={anchor}
                  definitionId={definition.id}
                  prefix="haunch-anchor"
                  lines={lines}
                  onDraftChange={onDraftChange}
                  onCompositionStateChange={onCompositionStateChange}
                />
              ))}
            </div>
          )}

          {definition.family === "two_point" && definition.variant === "one_point_longitudinal_gradient" && (
            <div data-testid={`haunch-anchor-single-${definition.id}`}>
              <h3>{ja.liner.haunch.anchor}</h3>
              <AnchorFields
                anchor={definition.anchor}
                definitionId={definition.id}
                prefix="haunch-anchor"
                lines={lines}
                onDraftChange={onDraftChange}
                onCompositionStateChange={onCompositionStateChange}
              />
              <label>
                <span>{ja.liner.haunch.longitudinalGradient}</span>
                <CompositionAwareInput
                  type="number"
                  value={String(definition.longitudinalGradient)}
                  data-testid={`haunch-longitudinal-gradient-${definition.id}`}
                  onCompositionStateChange={onCompositionStateChange}
                  onValueChange={(value) => {
                    const longitudinalGradient = Number(value);
                    if (!Number.isFinite(longitudinalGradient)) {
                      return;
                    }
                    onDraftChange((current) =>
                      updateHaunchDefinition(current, definition.id, { longitudinalGradient }),
                    );
                  }}
                />
              </label>
            </div>
          )}

          {definition.family === "three_point" && (
            <div data-testid={`haunch-anchors-${definition.id}`}>
              <h3>{ja.liner.haunch.anchors}</h3>
              {definition.anchors.map((anchor) => (
                <AnchorFields
                  key={anchor.id}
                  anchor={anchor}
                  definitionId={definition.id}
                  prefix="haunch-anchor"
                  lines={lines}
                  onDraftChange={onDraftChange}
                  onCompositionStateChange={onCompositionStateChange}
                />
              ))}
              {definition.variant === "parabola_three_points" && (
                <label>
                  <span>{ja.liner.haunch.girderLine}</span>
                  <select
                    value={definition.girderLineId}
                    data-testid={`haunch-girder-line-${definition.id}`}
                    onChange={(event) =>
                      onDraftChange((current) =>
                        updateHaunchDefinition(current, definition.id, {
                          girderLineId: event.target.value,
                        }),
                      )
                    }
                  >
                    {lines.map((line) => (
                      <option key={line.id} value={line.id}>
                        {line.label ?? line.id}
                      </option>
                    ))}
                  </select>
                </label>
              )}
            </div>
          )}

          {definition.family === "plane" && definition.variant === "one_point_two_gradients" && (
            <div data-testid={`haunch-plane-${definition.id}`}>
              <h3>{ja.liner.haunch.anchor}</h3>
              <AnchorFields
                anchor={definition.anchor}
                definitionId={definition.id}
                prefix="haunch-anchor"
                lines={lines}
                onDraftChange={onDraftChange}
                onCompositionStateChange={onCompositionStateChange}
              />
              <div className="liner-edit-form-grid">
                <label>
                  <span>{ja.liner.haunch.longitudinalGradient}</span>
                  <CompositionAwareInput
                    type="number"
                    value={String(definition.longitudinalGradient)}
                    data-testid={`haunch-longitudinal-gradient-${definition.id}`}
                    onCompositionStateChange={onCompositionStateChange}
                    onValueChange={(value) => {
                      const longitudinalGradient = Number(value);
                      if (!Number.isFinite(longitudinalGradient)) {
                        return;
                      }
                      onDraftChange((current) =>
                        updateHaunchDefinition(current, definition.id, { longitudinalGradient }),
                      );
                    }}
                  />
                </label>
                <label>
                  <span>{ja.liner.haunch.transverseGradient}</span>
                  <CompositionAwareInput
                    type="number"
                    value={String(definition.transverseGradient)}
                    data-testid={`haunch-transverse-gradient-${definition.id}`}
                    onCompositionStateChange={onCompositionStateChange}
                    onValueChange={(value) => {
                      const transverseGradient = Number(value);
                      if (!Number.isFinite(transverseGradient)) {
                        return;
                      }
                      onDraftChange((current) =>
                        updateHaunchDefinition(current, definition.id, { transverseGradient }),
                      );
                    }}
                  />
                </label>
              </div>
            </div>
          )}

          {definition.family === "range" && (
            <p className="liner-edit-help" data-testid={`haunch-range-help-${definition.id}`}>
              {ja.liner.haunch.rangeHelp}
            </p>
          )}

          <button
            type="button"
            data-testid={`haunch-definition-remove-${definition.id}`}
            onClick={() => onDraftChange((current) => removeHaunchDefinition(current, definition.id))}
          >
            <Trash2 size={16} />
            {ja.liner.haunch.removeDefinition}
          </button>
        </article>
      ))}
    </section>
  );
}
