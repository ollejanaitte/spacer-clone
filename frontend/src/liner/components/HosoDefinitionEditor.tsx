import { FilePlus2, Trash2 } from "lucide-react";
import { ja } from "../../i18n/ja";
import {
  addHosoDefinition,
  removeHosoDefinition,
  updateHosoDefinition,
  type LinerDraft,
} from "../adapters/linerUiAdapter";
import type { HosoAnchorDraft, HosoDefinitionDraft, HosoTypeFamily } from "../schema/types";
import { CompositionAwareInput } from "./CompositionAwareInput";

export type HosoDefinitionEditorProps = {
  draft: LinerDraft;
  onDraftChange: (update: LinerDraft | ((current: LinerDraft) => LinerDraft)) => void;
  onCompositionStateChange?: (composing: boolean) => void;
};

function activeOffsetLines(draft: LinerDraft) {
  return draft.crossSections?.[0]?.offsetLines ?? [];
}

function variantOptions(family: HosoTypeFamily) {
  switch (family) {
    case "auto":
      return [{ value: "auto_converge_pipeline", label: ja.liner.hoso.variantAutoPipeline }];
    case "longitudinal":
      return [
        { value: "longitudinal_only", label: ja.liner.hoso.variantLongitudinalOnly },
        { value: "both_gradients", label: ja.liner.hoso.variantBothGradients },
      ];
    case "transverse":
      return [{ value: "transverse_only", label: ja.liner.hoso.variantTransverseOnly }];
    case "two_point":
      return [{ value: "two_point_girder_end", label: ja.liner.hoso.variantTwoPointGirderEnd }];
    case "three_point":
      return [{ value: "three_point_non_collinear", label: ja.liner.hoso.variantThreePointPlane }];
  }
}

function ThicknessAnchorFields({
  anchor,
  definitionId,
  prefix,
  onDraftChange,
  onCompositionStateChange,
}: {
  anchor: HosoAnchorDraft;
  definitionId: string;
  prefix: string;
  onDraftChange: HosoDefinitionEditorProps["onDraftChange"];
  onCompositionStateChange?: (composing: boolean) => void;
}) {
  return (
    <div className="liner-edit-form-grid">
      <label>
        <span>{ja.liner.hoso.anchorStation}</span>
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
              const definition = current.hosoDefinitions?.find((entry) => entry.id === definitionId);
              if (!definition) {
                return current;
              }
              const patch = (entry: HosoAnchorDraft) =>
                entry.id === anchor.id ? { ...entry, stationPhysicalDistanceM } : entry;
              if (definition.family === "longitudinal" && definition.variant === "longitudinal_only") {
                return updateHosoDefinition(current, definitionId, {
                  anchors: definition.anchors.map(patch) as [HosoAnchorDraft, HosoAnchorDraft],
                });
              }
              if (definition.family === "longitudinal" && definition.variant === "both_gradients") {
                return updateHosoDefinition(current, definitionId, {
                  anchor: patch(definition.anchor),
                });
              }
              if (definition.family === "transverse") {
                return updateHosoDefinition(current, definitionId, {
                  anchors: definition.anchors.map(patch) as [HosoAnchorDraft, HosoAnchorDraft],
                });
              }
              if (definition.family === "two_point") {
                return updateHosoDefinition(current, definitionId, {
                  anchors: definition.anchors.map(patch) as [HosoAnchorDraft, HosoAnchorDraft],
                });
              }
              if (definition.family === "three_point") {
                return updateHosoDefinition(current, definitionId, {
                  anchors: definition.anchors.map(patch) as [
                    HosoAnchorDraft,
                    HosoAnchorDraft,
                    HosoAnchorDraft,
                  ],
                });
              }
              return current;
            });
          }}
        />
      </label>
      <label>
        <span>{ja.liner.hoso.anchorThickness}</span>
        <CompositionAwareInput
          type="number"
          value={String(anchor.thicknessM)}
          data-testid={`${prefix}-thickness-${definitionId}-${anchor.id}`}
          onCompositionStateChange={onCompositionStateChange}
          onValueChange={(value) => {
            const thicknessM = Number(value);
            if (!Number.isFinite(thicknessM)) {
              return;
            }
            onDraftChange((current) => {
              const definition = current.hosoDefinitions?.find((entry) => entry.id === definitionId);
              if (!definition) {
                return current;
              }
              const patch = (entry: HosoAnchorDraft) =>
                entry.id === anchor.id ? { ...entry, thicknessM } : entry;
              if (definition.family === "longitudinal" && definition.variant === "longitudinal_only") {
                return updateHosoDefinition(current, definitionId, {
                  anchors: definition.anchors.map(patch) as [HosoAnchorDraft, HosoAnchorDraft],
                });
              }
              if (definition.family === "longitudinal" && definition.variant === "both_gradients") {
                return updateHosoDefinition(current, definitionId, {
                  anchor: patch(definition.anchor),
                });
              }
              if (definition.family === "transverse" || definition.family === "two_point") {
                return updateHosoDefinition(current, definitionId, {
                  anchors: definition.anchors.map(patch) as [HosoAnchorDraft, HosoAnchorDraft],
                });
              }
              if (definition.family === "three_point") {
                return updateHosoDefinition(current, definitionId, {
                  anchors: definition.anchors.map(patch) as [
                    HosoAnchorDraft,
                    HosoAnchorDraft,
                    HosoAnchorDraft,
                  ],
                });
              }
              return current;
            });
          }}
        />
      </label>
    </div>
  );
}

export function HosoDefinitionEditor({
  draft,
  onDraftChange,
  onCompositionStateChange,
}: HosoDefinitionEditorProps) {
  const definitions = draft.hosoDefinitions ?? [];

  return (
    <section className="liner-edit-panel" data-testid="hoso-definition-editor">
      <header className="liner-edit-panel-header">
        <h2>{ja.liner.hoso.title}</h2>
        <button
          type="button"
          data-testid="hoso-definition-add"
          onClick={() => onDraftChange((current) => addHosoDefinition(current))}
        >
          <FilePlus2 size={16} />
          {ja.liner.hoso.addDefinition}
        </button>
      </header>
      {definitions.length === 0 ? (
        <p className="liner-edit-help">{ja.liner.hoso.emptyDefinitions}</p>
      ) : (
        definitions.map((definition) => (
          <article
            key={definition.id}
            className="liner-edit-subpanel"
            data-testid={`hoso-definition-row-${definition.id}`}
          >
            <label>
              <span>{ja.liner.hoso.definitionLabel}</span>
              <input
                type="text"
                value={definition.label ?? ""}
                onChange={(event) =>
                  onDraftChange((current) =>
                    updateHosoDefinition(current, definition.id, { label: event.target.value }),
                  )
                }
              />
            </label>
            <label>
              <span>{ja.liner.hoso.family}</span>
              <select
                value={definition.family}
                data-testid={`hoso-family-${definition.id}`}
                onChange={(event) => {
                  const family = event.target.value as HosoTypeFamily;
                  onDraftChange((current) =>
                    updateHosoDefinition(current, definition.id, {
                      family,
                      variant: variantOptions(family)[0]?.value,
                    } as Partial<HosoDefinitionDraft>),
                  );
                }}
              >
                <option value="auto">{ja.liner.hoso.familyAuto}</option>
                <option value="longitudinal">{ja.liner.hoso.familyLongitudinal}</option>
                <option value="transverse">{ja.liner.hoso.familyTransverse}</option>
                <option value="two_point">{ja.liner.hoso.familyTwoPoint}</option>
                <option value="three_point">{ja.liner.hoso.familyThreePoint}</option>
              </select>
            </label>
            <label>
              <span>{ja.liner.hoso.variant}</span>
              <select
                value={definition.variant}
                data-testid={`hoso-variant-${definition.id}`}
                onChange={(event) =>
                  onDraftChange((current) =>
                    updateHosoDefinition(current, definition.id, {
                      variant: event.target.value,
                    } as Partial<HosoDefinitionDraft>),
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
              <span>{ja.liner.hoso.stationFrom}</span>
              <CompositionAwareInput
                type="number"
                value={String(definition.stationRange.fromM)}
                onCompositionStateChange={onCompositionStateChange}
                onValueChange={(value) => {
                  const fromM = Number(value);
                  if (!Number.isFinite(fromM)) {
                    return;
                  }
                  onDraftChange((current) =>
                    updateHosoDefinition(current, definition.id, {
                      stationRange: { ...definition.stationRange, fromM },
                    }),
                  );
                }}
              />
            </label>
            <label>
              <span>{ja.liner.hoso.stationTo}</span>
              <CompositionAwareInput
                type="number"
                value={String(definition.stationRange.toM)}
                onCompositionStateChange={onCompositionStateChange}
                onValueChange={(value) => {
                  const toM = Number(value);
                  if (!Number.isFinite(toM)) {
                    return;
                  }
                  onDraftChange((current) =>
                    updateHosoDefinition(current, definition.id, {
                      stationRange: { ...definition.stationRange, toM },
                    }),
                  );
                }}
              />
            </label>
            {definition.family === "longitudinal" && definition.variant === "longitudinal_only" && (
              definition.anchors.map((anchor) => (
                <ThicknessAnchorFields
                  key={anchor.id}
                  anchor={anchor}
                  definitionId={definition.id}
                  prefix="hoso-anchor"
                  onDraftChange={onDraftChange}
                  onCompositionStateChange={onCompositionStateChange}
                />
              ))
            )}
            {definition.family === "longitudinal" && definition.variant === "both_gradients" && (
              <>
                <ThicknessAnchorFields
                  anchor={definition.anchor}
                  definitionId={definition.id}
                  prefix="hoso-anchor"
                  onDraftChange={onDraftChange}
                  onCompositionStateChange={onCompositionStateChange}
                />
                <label>
                  <span>{ja.liner.hoso.longitudinalGradient}</span>
                  <CompositionAwareInput
                    type="number"
                    value={String(definition.longitudinalGradient)}
                    onCompositionStateChange={onCompositionStateChange}
                    onValueChange={(value) => {
                      const longitudinalGradient = Number(value);
                      if (!Number.isFinite(longitudinalGradient)) {
                        return;
                      }
                      onDraftChange((current) =>
                        updateHosoDefinition(current, definition.id, { longitudinalGradient }),
                      );
                    }}
                  />
                </label>
                <label>
                  <span>{ja.liner.hoso.transverseGradient}</span>
                  <CompositionAwareInput
                    type="number"
                    value={String(definition.transverseGradient)}
                    onCompositionStateChange={onCompositionStateChange}
                    onValueChange={(value) => {
                      const transverseGradient = Number(value);
                      if (!Number.isFinite(transverseGradient)) {
                        return;
                      }
                      onDraftChange((current) =>
                        updateHosoDefinition(current, definition.id, { transverseGradient }),
                      );
                    }}
                  />
                </label>
              </>
            )}
            {(definition.family === "transverse" || definition.family === "two_point") && (
              definition.anchors.map((anchor) => (
                <ThicknessAnchorFields
                  key={anchor.id}
                  anchor={anchor}
                  definitionId={definition.id}
                  prefix="hoso-anchor"
                  onDraftChange={onDraftChange}
                  onCompositionStateChange={onCompositionStateChange}
                />
              ))
            )}
            {definition.family === "three_point" && (
              definition.anchors.map((anchor) => (
                <ThicknessAnchorFields
                  key={anchor.id}
                  anchor={anchor}
                  definitionId={definition.id}
                  prefix="hoso-anchor"
                  onDraftChange={onDraftChange}
                  onCompositionStateChange={onCompositionStateChange}
                />
              ))
            )}
            <button
              type="button"
              data-testid={`hoso-definition-remove-${definition.id}`}
              onClick={() => onDraftChange((current) => removeHosoDefinition(current, definition.id))}
            >
              <Trash2 size={16} />
              {ja.liner.hoso.removeDefinition}
            </button>
          </article>
        ))
      )}
    </section>
  );
}
